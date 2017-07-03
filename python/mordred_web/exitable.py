import threading

try:
    import queue
except ImportError:
    import Queue as queue


class Exit(Exception):
    pass


class ExitableQueue(object):
    def __init__(self, exit, maxsize=0, poll=0.1):
        self._q = queue.Queue(maxsize)
        self._exit = exit
        self.poll = poll

    def put(self, item):
        while True:
            try:
                return self._q.put(item, timeout=self.poll)
            except queue.Full:
                if self._exit.is_set():
                    raise Exit

    def get(self):
        while True:
            try:
                return self._q.get(timeout=self.poll)
            except queue.Empty:
                if self._exit.is_set():
                    raise Exit

    def put_nowait(self):
        return self._q.put(block=False)


class ExitableBoundedSemaphore(object):
    def __init__(self, exit, value=1, poll=0.1):
        self._sem = threading.BoundedSemaphore(value)
        self._exit = exit
        self.poll = poll

    def acquire(self):
        while True:
            if self._sem.acquire():
                return

            elif self._exit.is_set():
                raise Exit

    def release(self):
        return self._sem.release()
