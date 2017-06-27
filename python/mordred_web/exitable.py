import threading
import queue


class Exit(Exception):
    pass


class ExitableQueue(queue.Queue):
    def __init__(self, exit, maxsize=0, poll=0.1):
        super(ExitableQueue, self).__init__(maxsize)
        self._exit = exit
        self.poll = poll

    def put(self, item):
        while True:
            try:
                return super(ExitableQueue, self).put(item, timeout=self.poll)
            except queue.Full:
                if self._exit.is_set():
                    raise Exit

    def get(self):
        while True:
            try:
                return super(ExitableQueue, self).get(timeout=self.poll)
            except queue.Empty:
                if self._exit.is_set():
                    raise Exit

    def put_nowait(self):
        return super(ExitableQueue, self).put(block=False)


class ExitableBoundedSemaphore(threading.BoundedSemaphore):
    def __init__(self, exit, value=1, poll=0.1):
        super(ExitableBoundedSemaphore, self).__init__(value)
        self._exit = exit
        self.poll = poll

    def acquire(self):
        while True:
            if super(ExitableBoundedSemaphore, self).acquire(timeout=self.poll):
                return

            elif self._exit.is_set():
                raise Exit
