import os
import sys
import signal
import socket
import argparse
import webbrowser
from contextlib import closing

import psutil
import tornado.web

from .db import connect
from .task_queue import TaskQueue
from .handler.app import AppInfoHandler
from .handler.calc import CalcIdHandler, CalcIdExtHandler
from .handler.file import FileHandler, FileIdHandler, FileIdExtHandler, FileIdNthExtHandler
from .handler.descriptor import DescriptorHandler
from .handler.singlefile import SingleFileHandler

MEGA = 1024 * 1024


class Shutdown(object):
    def __init__(self, server, ioloop):
        """Shutdown manager."""
        self.server = server
        self.ioloop = ioloop

    def __call__(self, sig, frame):
        print("catch signal: {}".format(sig))  # noqa: T003
        self.server.stop()
        self.ioloop.stop()
        print("terminate...")  # noqa: T003
        sys.exit(0)


class MyApplication(tornado.web.Application):
    def __init__(self, queue, conn, file_size_limit, molecule_limit,
                 parse_timeout, prepare_timeout, calc_timeout, *args,
                 **kwargs):
        """Application."""
        super(MyApplication, self).__init__(*args, **kwargs)
        self.queue = queue
        self.db = conn
        self.file_size_limit = file_size_limit
        self.parse_timeout = parse_timeout
        self.prepare_timeout = prepare_timeout
        self.molecule_limit = molecule_limit
        self.calc_timeout = calc_timeout


def get_free_address(lower=3000):
    port = lower
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        for i in range(5000):
            try:
                sock.bind(("", port + i))
            except OSError:
                pass
            else:
                return sock.getsockname()

        raise OSError("no free port")


def serve(port,
          workers,
          no_browser,
          file_size_limit=3,
          molecule_limit=50,
          parse_timeout=60,
          prepare_timeout=60,
          calc_timeout=60,
          db="mordred-web.sqlite"):

    if port is None:
        _, port = get_free_address()

    if workers is None:
        workers = psutil.cpu_count(logical=False)

    static = os.path.join(os.path.dirname(__file__), "static")
    ioloop = tornado.ioloop.IOLoop.current()

    with connect(db) as conn, TaskQueue(workers, ioloop) as queue:
        app = MyApplication(
            queue=queue,
            conn=conn,
            file_size_limit=file_size_limit,
            molecule_limit=molecule_limit,
            parse_timeout=parse_timeout,
            prepare_timeout=prepare_timeout,
            calc_timeout=calc_timeout,
            handlers=[
                (r"/api/descriptor", DescriptorHandler),
                (r"/api/info", AppInfoHandler),
                (r"/api/file", FileHandler),
                (r"/api/file/([0-9a-zA-Z]+)", FileIdHandler),
                (r"/api/file/([0-9a-zA-Z]+)\.(.*)", FileIdExtHandler),
                (r"/api/file/([0-9a-zA-Z]+)/([0-9]+)\.(.*)",
                 FileIdNthExtHandler),
                (r"/api/calc/([0-9a-zA-Z]+)", CalcIdHandler),
                (r"/api/calc/([0-9a-zA-Z]+)\.(.*)", CalcIdExtHandler),
                (r"/static/(.*)", tornado.web.StaticFileHandler, {
                    "path": static,
                }),
                (r"/.*", SingleFileHandler, {
                    "path": os.path.join(static, "index.html"),
                }),
            ],
            compress_response=True,
            static_hash_cache=True)
        server = tornado.httpserver.HTTPServer(
            app, max_body_size=(file_size_limit + 1) * MEGA)
        server.bind(port)
        server.start(1)
        url = "http://127.0.0.1:{}".format(port)
        if not no_browser:
            webbrowser.open(url, autoraise=True)

        signal.signal(signal.SIGTERM, Shutdown(server, ioloop))
        signal.signal(signal.SIGINT, Shutdown(server, ioloop))
        print("start mordred.web on {}".format(url))  # noqa: T003
        ioloop.start()


def main():
    parser = argparse.ArgumentParser(description="Mordred Web UI")
    parser.add_argument("-p", "--port", type=int, default=None, help="port")
    parser.add_argument(
        "-w", "--workers", type=int, default=None, help="number of workers")
    parser.add_argument(
        "--file-size-limit",
        metavar="MB",
        type=int,
        default=5,
        help="upload file size limit")
    parser.add_argument(
        "--molecule-limit",
        metavar="N",
        type=int,
        default=None,
        help="number of molecule limit")
    parser.add_argument(
        "--parse-timeout",
        metavar="SEC",
        type=int,
        default=None,
        help="file parse timeout")
    parser.add_argument(
        "--prepare-timeout",
        metavar="SEC",
        type=int,
        default=None,
        help="molecular preparation timeout")
    parser.add_argument(
        "--calc-timeout",
        metavar="SEC",
        type=int,
        default=None,
        help="descriptor calculation timeout")
    parser.add_argument(
        "--db",
        metavar="FILE",
        type=str,
        default="mordred-web.sqlite",
        help="database file path")
    parser.add_argument(
        "--no-browser",
        action="store_true",
        default=False,
        help="don't open browser automatically")
    result = (parser.parse_args())
    serve(**vars(result))


if __name__ == "__main__":
    main()
