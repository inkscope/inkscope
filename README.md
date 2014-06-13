inkScope
========

**Inkscope** is  a [Ceph](http://ceph.com) admin and supervision interface. It  relies on a nosql solution. We use  mongodb to store real time metrics and history metrics but not on the same collection. Each collection is ruled by a TTL.

The main folders are:

**documentation** contains diagram of inkScope architecture, datamodel...

**inkscopeViz** : GUI to visualize Ceph cluster status (dashboard) and and relations between Ceph cluster objects and manage of a ceph cluster

**inkscopeCtrl** : server part for inkscopeAdm and inkscopeViz

**inkscopeProbe** : probes to collect information about the cluster (Ceph and system info)

**inkscopeMonitor** : for supervision of Ceph 

Manual installation is described in the [inkScope wiki](https://github.com/inkscope/inkscope/wiki)

Here is the dashboard screenshot and an object storage user management screenshot. Other screenshots can be found [there](https://github.com/inkscope/inkscope/tree/master/screenshots)

![dashboard](https://raw.github.com/inkscope/inkscope/master/screenshots/Screenshot-Status.png)
![Object storage user management](https://raw.github.com/inkscope/inkscope/master/screenshots/Screenshot-S3userManagement.png)