# Launching ceph-rest-api with Apache
# author Alain Dechorgnat
# inspired by Wido den Hollander wsgi script
# https://gist.github.com/wido/8bf032e5f482bfef949c

import json
import ceph_rest_api
import os, sys

# change dir for inkscopeCtrl folder
abspath = os.path.dirname(__file__)
sys.path.append(abspath)
os.chdir(abspath)

from Log import Log

# Load inkscope configuration from file
inkscope_config_file = "/opt/inkscope/etc/inkscope.conf"
datasource = open(inkscope_config_file, "r")
inkscope_config = json.load(datasource)
datasource.close()

ceph_config_file=inkscope_config.get("ceph_conf", "/etc/ceph/ceph.conf").encode('ascii', 'ignore')
ceph_cluster_name="ceph"
ceph_client_name=None
ceph_client_id="admin"
args=None

application = ceph_rest_api.generate_app(ceph_config_file, ceph_cluster_name, ceph_client_name, ceph_client_id, args)