import errno
import json
import logging
import logging.handlers
import os
import textwrap
import commands
import ast
import requests

CONNECT='yes'
clustername='ceph'

class deepdict(dict):
    """Implementation of perl's autovivification feature."""
    def __getitem__(self, item):
        try:
            return dict.__getitem__(self, item)
        except KeyError:
            value = self[item] = type(self)()
            return value


def genreqget(url):
        '''
                use ceph-rest-api instead of  file user for dev
        '''     
        r = requests.get(url,headers={"Accept":"application/json"})
	print 'get    ' + r.url
        print r.status_code
        if r.status_code != requests.codes.ok:
                r.raise_for_status()
        else:
	        return r.json()



def connect(httpdump):
        if CONNECT == 'yes':
        	#httpdump = 'http://10.156.232.71:5000/api/v0.1/osd/tree.json'
                dump =  genreqget(httpdump)
                print 'using ceph-rest-api'
        else:
                j = open('dumps/dump_pgdump.json', 'r')
                dump = json.load(j)
                j.close()
        return dump


def parsejson(dump,osd,obj):
	for key in dump['output']['nodes']:	
		obj['obj'][str(key['name'])]=key
		if key['type'] == 'osd':
			osd['osd'][str(key['id'])]=key
	return obj,osd

#parsejson(osddump)

