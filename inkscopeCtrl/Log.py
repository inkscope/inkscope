__author__ = 'alain.dechorgnat@orange.com'

class Log:

    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = "\033[1m"

    @staticmethod
    def debug(msg):
        print msg

    @staticmethod
    def infog(msg):
        print Log.OKGREEN + msg + Log.ENDC


    @staticmethod
    def info(msg):
        print Log.OKBLUE + msg + Log.ENDC

    @staticmethod
    def warn(msg):
        print Log.WARNING + msg + Log.ENDC

    @staticmethod
    def err(msg):
        print Log.FAIL + msg + Log.ENDC