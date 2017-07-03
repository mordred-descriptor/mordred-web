from mordred import descriptors

from .common import RequestHandler


class DescriptorHandler(RequestHandler):
    def get(self):
        self.write({
            "descriptors": descriptors.__all__,
        })
