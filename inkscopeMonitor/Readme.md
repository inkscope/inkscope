=======================================
supervision framework
=======================================

Description
-----------

The idea is simple,  mongodb collections are updated by probes scripts. This module allow to get some  values  in collections and  check if this values  are ok. These check must  be on a  single server which can request mongodb database. so  from shinken or nagios a single host must be declare to check all the cluster.

TODO
---------
    check rest-api process

CONTAINS
------ 
This contains a lib to create a  supervision  with nrpe and shinken framework.

REMARKS
-------
It uses the configuration file inkscope.conf that must be put in /opt/inkscope/etc/

It needs also some python modules:

    pip install pymongo
    
    pip install flask
    
    pip install bson


libmongojuice.py must  be in /opt/inkscope/lib
all check files must be in nrpe/libexec dire
add follow line in nrpe.cfg:
 
    include =/path/to/nrpeceph.cfg

------------

check_ceph_cephprobe : check the process cephprobe
check_ceph_df: check the ceph  using space
check_ceph_full : check the ceph using space
check_ceph_health : check the ceph  health
check_ceph_mondf: check the ceph mon space df
check_ceph_nearfull: check the nearfull ceph 
check_ceph_osdup: check if all osd are up
check_ceph_sysprobe: check sysprobe process
