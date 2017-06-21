from .common import RequestHandler
from mordred import descriptors


class DescriptorHandler(RequestHandler):
    def get(self):
        self.write({
            'descriptors': descriptors.__all__
        })
