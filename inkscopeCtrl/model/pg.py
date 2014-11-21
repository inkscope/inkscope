__author__ = 'Alexis.Koalla@orange.com'

import json

class PG:
    #""" Definition de la classe """

    def __init__(self,pgid,state,acting, up, acting_primary, up_primary):
        self.pgid=pgid
        self.state= state
        self.up = up
        self.acting=acting
        self.acting_primary=acting_primary
        self.up_primary = up_primary


    def getPgid(self):
        #""" Accesseur """
        return self.pgid

    def getState(self):
        #""" Accesseur """
        return self.state

    def getActing(self):
        return self.acting

    def getUp(self):
        return self.up

    def getActingPrimary(self):
        return self.acting_primary

    def getUpPrimary(self):
        return self.up_primary

    def dump(self):
         #content={"pgid":self._pgid,"state":self._state,"acting":self._acting,"acting_primary":self._acting_primary,"up_primary":self._up_primary}
         #print(json.dumps(content))
         return json.dumps(self, default=lambda  o: o.__dict__,sort_keys=True, indent=4)

