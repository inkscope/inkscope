__author__ = 'alain.dechorgnat@orange.com'

import logging
import sys


class Log:

    logger = logging.getLogger('')
    logger.setLevel(logging.DEBUG)
    handler = logging.StreamHandler(sys.stderr)
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(levelname)-8s %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = "\033[1m"

    @classmethod
    def debug(cls, msg):
         Log.logger.debug(msg)

    @classmethod
    def infog(cls, msg):
        Log.logger.info(msg)

    @classmethod
    def info(cls, msg):
        Log.logger.info(msg)

    @classmethod
    def warn(cls, msg):
        Log.logger.warn(msg)

    @classmethod
    def err(cls, msg):
        Log.logger.error(msg)