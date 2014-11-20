inkScope
========

**Inkscope** is  a [Ceph](http://ceph.com) admin and supervision interface. It  relies on API provided by ceph. We also use  mongoDB to store real time metrics and history metrics.

The main folders are:

**documentation** contains diagram of inkScope architecture, datamodel...

**inkscopeViz** : GUI to visualize Ceph cluster status (dashboard),relations between Ceph cluster objects and to manage some elements of a ceph cluster

**inkscopeCtrl** : server part of inkscopeViz. It provides a REST API, orchestrating calls to ceph API's and command lines

**inkscopeProbe** : probes to collect information about the cluster (Ceph and system info)

**inkscopeMonitor** : for supervision of Ceph (to be developed) 

Manual installation is fully described in the [inkScope wiki](https://github.com/inkscope/inkscope/wiki)

Here is the dashboard screenshot and an object storage user management screenshot. Other screenshots can be found [there](https://github.com/inkscope/inkscope/tree/master/screenshots)

![dashboard](https://raw.github.com/inkscope/inkscope/master/screenshots/Screenshot-Status.png)
![Object storage user management](https://raw.github.com/inkscope/inkscope/master/screenshots/Screenshot-S3userManagement.png)

what do we plan in Inkscope?
============================

- Extend or replace Ceph Rest API request by command lines powered by Salt or the use of Calamari REST API
- Improve S3/swift features : zones and regions management
- Improve probes operations
- Implement objects visualization
- Plug the monitoring module to feed Nagios/Shinken

Other ideas:
- Simulation : impact calculation in case of crushmap update (storage capacity, bandwidth,..)
