from __future__ import print_function

import math
import pickle
import multiprocessing
from abc import ABCMeta, abstractmethod
from collections import Counter

from six import with_metaclass
from tornado import gen, queues
from tornado.ioloop import IOLoop


class Worker(with_metaclass(ABCMeta, object)):
    @abstractmethod
    def __next__(self):
        raise NotImplementedError

    @abstractmethod
    def __call__(self):
        raise NotImplementedError


class SingleWorker(Worker):
    def __next__(self):
        if getattr(self, '_done', False) is True:
            raise StopIteration

        self._done = True


class Task(with_metaclass(ABCMeta, object)):
    def on_start(self):
        pass

    def on_end(self):
        pass

    def on_task_start(self):
        pass

    def on_task_end(self, result):
        pass

    def on_task_error(self, err):
        pass

    def next_task(self):
        return None

    @abstractmethod
    def worker(self):
        raise NotImplementedError


class JobQueue(object):
    START = 0
    END = 1
    TASK_START = 2
    TASK_END = 3
    TASK_ERROR = 4

    _current_task_id = 0

    def __init__(self, threads, ioloop=None):
        if ioloop is None:
            ioloop = IOLoop.current()

        self._ioloop = ioloop

        self._threads = threads
        self._pending = multiprocessing.Queue()
        self._working = multiprocessing.Queue(threads)
        self._semaphore = multiprocessing.Semaphore(threads)
        self._task_count = 0
        self._task_done = queues.Queue()
        self._events_out, self._events_in = multiprocessing.Pipe(False)
        self._task_counter = Counter()
        self._tasks = {}

    def put(self, task):
        self._task_count += 1
        task_id = self.__class__._current_task_id
        self.__class__._current_task_id += 1
        self._tasks[task_id] = task
        self._pending.put((task.worker(), task_id))

    def _move_worker(self):
        while True:
            self._semaphore.acquire()
            worker, task_id = self._pending.get()
            self._events_in.send((self.START, task_id, None))
            self._working.put((worker, task_id))

    def _exec_worker(self, worker):
        result_out, result_in = multiprocessing.Pipe(False)
        chunk_size = 10240

        def f():
            try:
                v = worker()
            except Exception as e:
                data = True, e
            else:
                data = False, v

            b = pickle.dumps(data)

            for i in range(math.ceil(len(b) / chunk_size)):
                st = i * chunk_size
                ed = st + chunk_size
                result_in.send_bytes(b[st:ed])

            result_in.send_bytes(b'')

        p = multiprocessing.Process(target=f)
        p.start()

        msg = b''
        while True:
            b = result_out.recv_bytes()
            if len(b) == 0:
                break

            msg += b

        p.join()
        return pickle.loads(msg)

    def _job_worker(self):
        while True:
            worker, task_id = self._working.get()
            try:
                worker.__next__()
            except StopIteration:
                self._events_in.send((self.END, task_id, None))
                continue
            else:
                self._working.put((worker, task_id))

            self._events_in.send((self.TASK_START, task_id, None))

            err, v = self._exec_worker(worker)
            self._events_in.send((self.TASK_ERROR if err else self.TASK_END, task_id, v))

    @gen.coroutine
    def _event_watcher(self, fd, events):
        ev, task_id, val = fd.recv()
        task = self._tasks[task_id]

        if ev == self.START:
            task.on_start()
            self._task_counter[task_id] += 1
            return

        if ev == self.TASK_START:
            task.on_task_start()
            self._task_counter[task_id] += 1
            return

        self._task_counter[task_id] -= 1
        if ev == self.TASK_END:
            task.on_task_end(val)

        elif ev == self.TASK_ERROR:
            task.on_task_error(val)

        if self._task_counter[task_id] <= 0:
            task.on_end()
            next_task = task.next_task()
            if next_task is not None:
                self.put(next_task)

            del self._task_counter[task_id]
            del self._tasks[task_id]
            self._semaphore.release()
            yield self._task_done.put(None)

    def __enter__(self):
        self._processes = processes = [multiprocessing.Process(target=self._move_worker)]
        for _ in range(self._threads):
            processes.append(multiprocessing.Process(target=self._job_worker))

        for p in processes:
            p.start()

        self._ioloop.add_handler(self._events_out, self._event_watcher, IOLoop.READ)
        return self

    def __exit__(self, *args, **kwargs):
        self._ioloop.remove_handler(self._events_out)
        for p in self._processes:
            p.terminate()

    @gen.coroutine
    def join(self):
        while True:
            yield self._task_done.get()
            self._task_count -= 1
            if self._task_count <= 0:
                return


class TestTask(Task):
    def __init__(self, name, u, i=4):
        self.name = name
        self.u = u
        self.i = i

    def __call__(self):
        import time
        import random
        v = random.uniform(0, self.u)
        time.sleep(v)
        if self.name == "ERROR":
            raise ValueError("VALUE ERROR")

        return v

    def on_task_start(self):
        print('TASK START', self.name)

    def on_task_end(self, v):
        print('TASK END', self.name, v)

    def on_start(self):
        print("START", self.name)

    def on_end(self):
        print("END", self.name)

    def on_task_error(self, e):
        print("TASK ERROR", self.name, e)

    def __next__(self):
        if self.i <= 0:
            raise StopIteration

        self.i -= 1

    def worker(self):
        return self


@gen.coroutine
def main():
    import sys
    _, t, n, u = sys.argv
    with JobQueue(int(t)) as queue:
        for i in range(int(n)):
            queue.put(TestTask(i, float(u)))
        queue.put(TestTask("ERROR", float(u)))
        yield queue.join()
        print("FINISH")


if __name__ == '__main__':
    IOLoop.current().run_sync(main)
