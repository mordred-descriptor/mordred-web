from .common import RequestHandler


class AppInfoHandler(RequestHandler):
    def get(self):
        self.write({
            "file_size_limit": self.application.file_size_limit,
        })
