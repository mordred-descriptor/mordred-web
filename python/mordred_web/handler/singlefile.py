import os

from tornado.web import StaticFileHandler


class SingleFileHandler(StaticFileHandler):
    def initialize(self, path):
        dirname, self.filename = os.path.split(path)
        super(SingleFileHandler, self).initialize(dirname)

    def head(self, path=None):
        return super(SingleFileHandler, self).head(self.filename)

    def get(self, path=None, include_body=True):
        return super(SingleFileHandler, self).get(self.filename, include_body=include_body)
