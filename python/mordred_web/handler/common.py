import json
from contextlib import contextmanager

from tornado import gen, web, iostream

from ..db import transaction


class RequestHandler(web.RequestHandler):
    @contextmanager
    def transaction(self):
        with transaction(self.db) as cur:
            yield cur

    def get_flag(self, name, default=object()):
        v = self.get_argument(name, default)

        if isinstance(v, bool):
            return v

        if v.lower() in {"false", "f"}:
            return False

        return True

    def put(self, task):
        return self.application.queue.put(task)

    @property
    def db(self):
        return self.application.db

    def fail(self, status, reason):
        raise web.HTTPError(status, reason=reason)

    def json(self, **kwargs):
        return self.write(kwargs)


class SSEHandler(RequestHandler):
    def init_sse(self):
        self.set_header("content-type", "text/event-stream")
        self.set_header("cache-control", "no-cache")

    @gen.coroutine
    def publish(self, **obj):
        self.write("data: {}\n\n".format(json.dumps(obj)))
        try:
            yield self.flush()
        except iostream.StreamClosedError:
            raise web.Finish
