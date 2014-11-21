__author__ = 'Alexis.Koalla@orange.com'

import json

class S3Object:

    def __init__(self,id, bucketName,bucketId,poolId,poolName,poolType,size,chunks=[],pgs=[], osds=[]):
       self.id=id
       self.bucketName=bucketName
       self.bucketId=bucketId
       self.poolId=poolId
       self.poolName=poolName
       self.poolType=poolType
       self.size=size
       self.chunks=chunks
       self.pgs=pgs
       self.osds = osds

    def getSize(self):
        return self.size
    def getOsds(self):
        return self.osds
    def getPgs(self):
        return self.pgs

    def getChunks(self):
        return self.chunks

    def getId(self):
        return self.id
    def dump(self):
        return json.dumps(self, default=lambda  o: o.__dict__,sort_keys=True, indent=4)