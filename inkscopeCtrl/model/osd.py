__author__ = 'Alexis.Koalla@orange.com'

import json

class OSD:
    #""" Definition de la classe """

    def __init__(self,id,status,host,capacity,occupation):
        self.id=id
        self.capacity = capacity
        self.status = status
        self.host=host
        if occupation!='null':
            self.occupation=occupation

    def getId(self):
        #""" Accesseur """
        return self.id

    def getStatus(self):
        #""" Accesseur """
        return self.status

    def getCapacity(self):
        return self.capacity

    def getHost(self):
        return self.host

    def getOccupation(self):
        return self.occupation

    def dump(self):
         #content={"id":self._id,"status":self._status,"host":self._host,"capacity":self._capacity,"occupation":self._occupation}
        # print(json.dumps(content))
         return json.dumps(self, default=lambda  o: o.__dict__,sort_keys=True, indent=4)



