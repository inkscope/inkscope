=======================================
supervision framework
=======================================

Description
-----------

The idea is simple,  mongodb collections are updated by probes scripts. This module allow to get some  values  in collections and  check if this values  are ok.

TO DO
-----
- Script to check ceph and cluster health


- implemente history of cluster states

CONTAINS
------ 
     This contains a lib to create a  supervision  with nrpe and shinken framework.

REMARKS
-------
- this  user the configuration file inkscopeCtrl.conf. it must be put in /opt/inkscope/etc/
-needs some python modules:

pip install pymongo
pip install flask
pip install bson

