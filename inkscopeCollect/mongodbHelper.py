import pymongo
from pymongo import MongoReplicaSetClient
from pymongo.read_preferences import ReadPreference


client = MongoReplicaSetClient('mongodb01:27017,mongodb02:27017,mongodb03:27017', replicaSet='replmongo05', read_preference=ReadPreference.SECONDARY_PREFERRED )
client.ceph.authenticate('ceph','Duephisrc0ojr')
True




