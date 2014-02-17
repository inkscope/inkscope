Collect ceph cluster metrics and host metrics and put them in a database named as the cluster and put the data in dedicated mongodb collection. The datamodel is described in datamodel.txt and datamodeloverview.odp

Deployment
----------

0. prerequisites
    - a mongodb
    - ceph-rest-api
    - need package python-dev (on every host)
    - need psutil module (on every host)
    - need pymongo module (on every host)

1. SysProbe

    Each host should run sysprobe.py to collect and push the informations into a mongodb config file should be stored at /etc/sysprobe.conf and should look like (json format). The unit of the refresh times is second.

        #################################
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
        ##################################

    Launch :

    Sysprobe is defined as a daemon:

        sysprobe.py start|stop|restart

2. CephProbe

    a Ceph info collector (cephprobe.py) should be run on a node thant can access to ceph-rest-api and the mongodb.

    config file be stored at /etc/cephprobe.conf and should look like (json format). The unit of the refresh times is second.

        #################################
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
        #################################

    Launch :

    cephprobe is defined as a daemon:

        cephprobe.py start|stop|restart
