__author__ = 'arid6405'

class InkscopeError(Exception):

    def __init__(self, status, message):
        self.status = status
        self.message = message

    def __str__(self):
        return "Error {}: {} ".format(self.status, self.message)