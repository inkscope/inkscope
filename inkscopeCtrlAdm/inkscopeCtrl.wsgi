#author Philippe Raipin
#licence : apache v2

import logging, sys
logging.basicConfig(stream=sys.stderr)

sys.path.insert(0, '/var/www/inkscope/inkscopeCtrlAdm')

from inkscopeCtrlcore import app as application
