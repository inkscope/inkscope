inkScope
========

**Inkscope** is  a ceph admin  interface. It  relies on a nosql solution. We use  mongodb to store real time metrics and history metrics but not on the same collection. Each collection is ruled by a TTL.

The main folders are:

**diagrams** contains diagram of inkscope architecture and screenshots

**inkscopeAdm** :  for management  of a ceph cluster

**inkscopeCollect** : for collect information about the cluster

**inkscopeViz** : to visualize Ceph cluster status and and relations between Ceph cluster objects

**inkscopeMonitor** : for  supervision of  ceph

**Collections** : (todo) Explain relation beetwen collections
