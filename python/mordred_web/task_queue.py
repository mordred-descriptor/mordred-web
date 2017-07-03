import threading
from abc import ABCMeta, abstractmethod

from six import with_metaclass
from loky import ProcessPoolExecutor

from . import exitable


class Task(with_metaclass(ABCMeta, object)):
    @abstractmethod
    def __next__(self):
        raise NotImplementedError

    def on_task_start(self):
        pass

    def on_task_end(self):
        pass

    def on_job_start(self, job):
        pass

    def on_job_end(self, job, v):
        pass

    def on_job_error(self, job, e):
        pass

    def next_task(self):
        return None

    timeout = None


class SingleTask(Task):
    @abstractmethod
    def job(self):
        raise NotImplementedError

    def __next__(self):
        if getattr(self, "_already_executed", False):
            raise StopIteration

        self._already_executed = True
        return self.job()


class TaskWrapper(object):
    def __init__(self, task):
        self.raw = task
        self.job_count = 0
        self.lock = threading.Lock()

    def incr(self):
        with self.lock:
            self.job_count += 1

    def decr(self, on_end):
        with self.lock:
            self.job_count -= 1
            if self.job_count < 0:
                on_end()


class Counter(object):
    def __init__(self, value):
        self.lock = threading.Lock()
        self.ev = threading.Event()
        self.value = value
        self.check_value()

    def check_value(self):
        if self.value <= 0:
            self.ev.set()
        else:
            self.ev.clear()

    def incr(self):
        with self.lock:
            self.value += 1
            self.check_value()

    def decr(self):
        with self.lock:
            self.value -= 1
            self.check_value()

    def join(self):
        return self.ev.wait()


class Daemon(threading.Thread):
    def run(self):
        try:
            while True:
                self._main()

        except exitable.Exit:
            pass


class MoveThread(Daemon):
    def __init__(self, q):
        super(MoveThread, self).__init__()
        self.q = q

    def _main(self):
        self.q._sem.acquire()
        task = self.q._pendings.get()
        self.q._workings.put(task)

        self.q._ioloop.add_callback(task.raw.on_task_start)


class OnTaskEnd(object):
    def __init__(self, q, task):
        self.q = q
        self.task = task

    def task_end_callback(self):
        self.task.raw.on_task_end()

        next_task = self.task.raw.next_task()
        if next_task is not None:
            self.q.put(next_task)

        self.q._sem.release()
        self.q._cnt.decr()

    def __call__(self):
        self.q._ioloop.add_callback(self.task_end_callback)


class WorkerThread(Daemon):
    def __init__(self, q):
        super(WorkerThread, self).__init__()
        self.q = q

    def task_end(self, task):
        return OnTaskEnd(self.q, task)

    def _main(self):
        task = self.q._workings.get()
        try:
            job = task.raw.__next__()
        except StopIteration:
            task.decr(self.task_end(task))
            return

        task.incr()
        self.q._workings.put(task)
        fut = self.q._pool.submit(job)
        self.q._ioloop.add_callback(task.raw.on_job_start, job)

        try:
            result = fut.result(timeout=task.raw.timeout)
            self.q._ioloop.add_callback(task.raw.on_job_end, job, result)
        except Exception as e:
            self.q._ioloop.add_callback(task.raw.on_job_error, job, e)

        task.decr(self.task_end(task))


class TaskQueue(object):
    def __init__(self, workers, ioloop):
        self._exit = threading.Event()
        self._pendings = exitable.ExitableQueue(self._exit)
        self._workings = exitable.ExitableQueue(self._exit, workers)
        self._sem = exitable.ExitableBoundedSemaphore(self._exit, workers)
        self._pool = ProcessPoolExecutor(workers)
        self._cnt = Counter(0)
        self._ioloop = ioloop

        self._workers = [MoveThread(self)]
        self._workers += [WorkerThread(self) for _ in range(workers)]

    def put(self, task):
        self._cnt.incr()
        self._pendings.put(TaskWrapper(task))

    def __enter__(self):
        for w in self._workers:
            w.start()

        return self

    def __exit__(self, *args, **kwargs):
        self._exit.set()
        for w in self._workers:
            w.join()

        self._pool.shutdown()

    def join(self):
        return self._cnt.join()


class TestJob(object):
    def __init__(self, name, i):
        self.name = name
        self.i = i

    def __call__(self):
        return self.name, self.i


class TestTask(Task):
    def __init__(self, name, count=5):
        self.count = count
        self.i = 0
        self.name = name

    def __next__(self):
        if self.i >= self.count:
            raise StopIteration

        self.i += 1
        return TestJob(self.name, self.i)

    def on_task_start(self):
        print("task start")  # noqa: T003

    def on_task_end(self):
        print("task end")  # noqa: T003

    def on_job_start(self, job):
        print("job start")  # noqa: T003

    def on_job_end(self, job, v):
        print("job end", v)  # noqa: T003

    def on_job_error(self, job, e):
        print("job error", e)  # noqa: T003


def main():
    with TaskQueue(20) as q:
        for i in range(100):
            q.put(TestTask(i))

        q.join()


if __name__ == "__main__":
    main()
