inkscope
========

Inkscope is  a ceph admin  interface. It  relies on a nosql solution. We use  mongodb to store real time metrics and history metrics but not on the same collection. Each collection is ruled by a TTL.


diagrams contains diagram of inkscope architecture

inkscopeAdm :  for management  of a ceph cluster

inkscopeCollect : for collect information about the cluster

inkscopeD3js : for d3js representation 

inkscopeMonitor : for  supervision of  ceph

Collections: to do
Explain relation beetwen collections
