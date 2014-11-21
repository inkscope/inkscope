
__author__ = 'Alexis.Koalla@orange.com'

import json
class Chunk:
    #""" Definition de la classe """

    def __init__(self,id,size,pgid):
        self.id=id
        self.size = size
        self.pgid = pgid


    def getId(self):
        #""" Accesseur """
        return self.id

    def getPgid(self):
        #""" Accesseur """
        return self.pgid

    def getSize(self):
		return self.size

    def dump(self):
        #content={"id":self._id,"size":self._size,"pgid":self._pgid}
        #print(json.dumps(content))
        return json.dumps(self, default=lambda  o: o.__dict__,sort_keys=True, indent=4)
