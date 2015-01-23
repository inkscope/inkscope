#author Philippe Raipin
#licence : apache v2

# change dir for inkscopeCtrl folder
import sys, os
abspath = os.path.dirname(__file__)
sys.path.append(abspath)
os.chdir(abspath)

from Log import Log

sys.path.insert(0, '/var/www/inkscope/inkscopeCtrl')
from inkscopeCtrlcore import app as application