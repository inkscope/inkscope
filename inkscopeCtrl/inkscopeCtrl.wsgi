#author Philippe Raipin
#licence : apache v2

import logging, sys
logging.basicConfig(stream=sys.stderr)

sys.path.insert(0, '/var/www/inkscope/inkscopeCtrl')

from inkscopeCtrlcore import app as application
