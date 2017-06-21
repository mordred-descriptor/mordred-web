import psutil
from tornado import gen, locks, queues, concurrent
from tornado.ioloop import IOLoop

from . import async_process


class BaseTask(object):
    def __init__(self):
        self._canceled = False

    def __next__(self):
        raise StopIteration

    def start(self):
        pass

    def done(self):
        pass

    def cancel(self):
        self._canceled = True


class JobFuture(concurrent.Future):
    def __init__(self, task):
        super(JobFuture, self).__init__()
        self.task = task

    @property
    def id(self):
        return self.task.id

    def cancel(self):
        return self.task.cancel()


class JobQueue(object):
    def __init__(self, threads=None, ioloop=None):
        self._threads = threads if threads is not None else psutil.cpu_count(logical=False)
        self._ioloop = ioloop if ioloop is not None else IOLoop.current()

        self._queue = queues.Queue()
        self._current = queues.Queue()
        self._sem = locks.Semaphore(self._threads)

        self._jobs = 0
        self._finished = locks.Event()
        self._finished.set()

        self._start()

    def _start(self):
        self._ioloop.spawn_callback(self._move_jobs)
        for _ in range(self._threads):
            self._ioloop.spawn_callback(self._worker)

    def _increment_jobs(self):
        self._jobs += 1
        self._finished.clear()

    def _decrement_jobs(self):
        self._jobs -= 1
        if self._jobs <= 0:
            self._finished.set()

    @gen.coroutine
    def _put_wrapper(self, task):
        yield self._queue.put(task)
        self._increment_jobs()
        raise gen.Return(task)

    @gen.coroutine
    def put(self, task):
        fut = JobFuture(task)
        gen.chain_future(self._put_wrapper(task), fut)

        return (yield fut)

    @gen.coroutine
    def _move_jobs(self):
        while True:
            yield self._sem.acquire()
            task = yield self._queue.get()
            if task.start():
                yield self._current.put(task)

    @gen.coroutine
    def _worker(self):
        while True:
            yield self._one_shot_worker()

    def _release(self, task):
        self._sem.release()
        self._decrement_jobs()
        task.done()
        raise gen.Return()

    @gen.coroutine
    def _wrap_dispatcher(self, fut, dispatcher):
        try:
            return (yield dispatcher())
        finally:
            self._decrement_jobs()
            fut.set_result(None)

    @gen.coroutine
    def _spawn_dispatcher(self, dispatcher):
        done = concurrent.Future()
        self._ioloop.spawn_callback(self._wrap_dispatcher, done, dispatcher)
        yield done

    @gen.coroutine
    def _one_shot_worker(self):
        task = yield self._current.get()
        if task._canceled:
            self._release()

        try:
            dispatcher = next(task)
            self._increment_jobs()

        except StopIteration:
            self._release(task)

        yield self._current.put(task)
        yield self._spawn_dispatcher(dispatcher)

    @gen.coroutine
    def join(self):
        yield self._finished.wait()


@gen.coroutine
def _main():
    import sys

    class MultithreadTask(BaseTask):
        def __init__(self, args):
            super(MultithreadTask, self).__init__()
            self._iter = iter(args)

        def __next__(self):
            v = next(self._iter)

            @gen.coroutine
            def dispatcher():
                def in_subprocess(v):
                    if v == 4:
                        raise ValueError(v)
                    import time
                    time.sleep(1)
                    return v

                r = yield async_process.dispatch(in_subprocess, (v,))
                print(r)

            return dispatcher

    threads = None if len(sys.argv) <= 1 else int(sys.argv[1])

    q = JobQueue(threads=threads)
    Task = MultithreadTask
    yield q.put(Task([1, 2, 3, 4, 5]))
    yield q.put(Task([6, 7, 8]))
    yield q.put(Task([9, 10, 11, 12, 13, 14]))

    yield q.join()


if __name__ == '__main__':
    IOLoop.current().run_sync(_main)
