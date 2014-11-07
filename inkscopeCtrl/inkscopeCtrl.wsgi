#author Philippe Raipin
#licence : apache v2

import logging, sys, os
 
abspath = os.path.dirname(__file__) 

sys.path.append(abspath) 

os.chdir(abspath)

logging.basicConfig(stream=sys.stderr)

sys.path.insert(0, '/var/www/inkscope/inkscopeCtrl')

from inkscopeCtrlcore import app as application
