import os

import tornado.web

from .db import connect
from .task_queue import TaskQueue
from .handler.calc import CalcIdHandler, CalcIdExtHandler
from .handler.file import FileHandler, FileIdHandler, FileIdExtHandler, FileIdNthExtHandler
from .handler.descriptor import DescriptorHandler
from .handler.singlefile import SingleFileHandler
from .handler.app import AppInfoHandler


MEGA = 1024 * 1024


class MyApplication(tornado.web.Application):
    def __init__(self, queue, conn, limit, *args, **kwargs):
        super(MyApplication, self).__init__(*args, **kwargs)
        self.queue = queue
        self.db = conn
        self.limit = limit


def main(port, workers, limit=3, db='mordred-web.sqlite'):
    static = os.path.join(os.path.dirname(__file__), 'static')
    ioloop = tornado.ioloop.IOLoop.current()

    with connect(db) as conn, TaskQueue(workers, ioloop) as queue:
        app = MyApplication(queue, conn, limit, [
            (r'/api/descriptor', DescriptorHandler),
            (r'/api/info', AppInfoHandler),
            (r'/api/file', FileHandler),
            (r'/api/file/([0-9a-zA-Z]+)', FileIdHandler),
            (r'/api/file/([0-9a-zA-Z]+)\.(.*)', FileIdExtHandler),
            (r'/api/file/([0-9a-zA-Z]+)/([0-9]+)\.(.*)', FileIdNthExtHandler),
            (r'/api/calc/([0-9a-zA-Z]+)', CalcIdHandler),
            (r'/api/calc/([0-9a-zA-Z]+)\.(.*)', CalcIdExtHandler),
            (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': static}),
            (r'/.*', SingleFileHandler, {'path': os.path.join(static, 'index.html')}),
        ], compress_response=True, static_hash_cache=True)
        server = tornado.httpserver.HTTPServer(app, max_body_size=(limit + 1) * MEGA)
        server.bind(port)
        server.start(1)
        print('start mordred.web on localhost:{}'.format(port))
        ioloop.start()


if __name__ == "__main__":
    main(3000, 1)
