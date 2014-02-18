**InkscopeProbe** collects Ceph cluster metrics and host metrics and put them in a database named as the cluster and put the data in dedicated mongodb collection. The datamodel is described in datamodel.txt and datamodeloverview.odp

0. Prerequisites

    - a [mongodb](http://www.mongodb.org/) database
    - **ceph-rest-api** active
    - need package **python-dev** (on every host)
    - need **psutil** module (on every host)
    - need **pymongo** module (on every host)

1. Installation

    - grab files from the Github repository
    - run *install.sh* in inkscopeProbe directory to copy conf files in /opt/inkscope/etc and scripts in/opt/inkscope/bin

    Two daemons are defined:

    - sysprobe to collect system information; it must be installed on each machine running Ceph nodes (mon, mds, osd...)
    - cephprobe to collect ceph cluster information; it must be installed on only one machine running  a Ceph node


2. SysProbe configuration

    Sysprobe collect and push the informations into a mongodb. The config file should be stored at /opt/inkscope/etc/sysprobe.conf and should look like this (json format). The unit of the refresh times is second.
    You must adapt the values to your environment.

        {
            "mongodb_host" : 10.10.10.10,
            "mongodb_port" : 27017,
            "cluster": "ceph",
            "mem_refresh": 60,
            "swap_refresh": 600,
            "disk_refresh": 60,
            "partition_refresh": 60,
            "cpu_refresh": 60,
            "net_refresh": 30,
        }

    Sysprobe is defined as a daemon:

        sysprobe.py start|stop|restart

2. CephProbe configuration

    A Ceph info collector (cephprobe.py) should be run on a node thant can access to ceph-rest-api and the mongodb.

    The config file be stored at /opt/inkscope/etc/cephprobe.conf and should look like this (json format). The unit of the refresh times is second.

        {
            "mongodb_host" : 10.10.10.10,
            "mongodb_port" : 27017,
            "cluster" : "ceph",
            "ceph_conf": "/etc/ceph/ceph.conf",
            "ceph_rest_api": '127.0.0.1:5000',
            "status_refresh": 3,
            "osd_dump_refresh": 3,
            "pg_dump_refresh": 60,
            "crushmap_refresh": 60,
            "df_refresh": 60
        }

    Cephprobe is defined as a daemon:

        cephprobe.py start|stop|restart
