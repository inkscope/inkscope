inkScope
========

**Inkscope** is about to die. As ceph-rest-api has been deleted since Mimic version, Inkscope cannot be maintained anymore.

**Inkscope** is  a [Ceph](http://ceph.com) admin and supervision interface. It relies on an API provided by ceph. We also use  mongoDB to store real time metrics and history metrics.

We recommend to install Inkscope installation with the help of an [ansible playbook](https://github.com/inkscope/inkscope-ansible)


![inkscope architecture](https://github.com/inkscope/inkscope/raw/master/documentation/inkscope-platform.png)

The main folders are:

**documentation** contains diagram of inkScope architecture, datamodel...

**inkscopeViz** : GUI to visualize Ceph cluster status (dashboard), relations between Ceph cluster objects and to manage some elements of a ceph cluster like flags, pools, erasure code profiles, rados gateway users and buckets...

**inkscopeCtrl** : server part of inkscopeViz. It provides a REST API, orchestrating calls to ceph rest API's, Rados gateway administration API and command lines

**inkscopeProbe** : probes to collect information about the cluster (Ceph and system info)

**inkscopeMonitor** : for supervision of Ceph (to be developed) 

Here is the dashboard screenshot and an object storage user management screenshot. Other screenshots can be found [there](https://github.com/inkscope/inkscope/tree/master/screenshots)

![dashboard](https://raw.github.com/inkscope/inkscope/master/screenshots/Screenshot-Status.png)
![Object storage user management](https://raw.github.com/inkscope/inkscope/master/screenshots/Screenshot-S3userManagement.png)

what do we plan in Inkscope?
============================
- to maintain compatibility of inkscope with new ceph versions (Luminous and olders are currently supported)

