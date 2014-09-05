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
It uses the configuration file inkscopeCtrl.conf that must be put in /opt/inkscope/etc/

It needs also some python modules:

    pip install pymongo
    
    pip install flask
    
    pip install bson

