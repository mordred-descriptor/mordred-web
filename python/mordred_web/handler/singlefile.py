import os

from tornado.web import StaticFileHandler


class SingleFileHandler(StaticFileHandler):
    def initialize(self, path):
        super(SingleFileHandler, self).initialize(os.path.dirname(path))
        self.file = os.path.basename(path)

    def head(self):
        return super(SingleFileHandler, self).head(self.file)

    def get(self):
        return super(SingleFileHandler, self).get(self.file)
