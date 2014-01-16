# Eric  Mourgaya
# licence 
#  get dump of json file
import sys
import re
import os
import errno
import json
import logging
import logging.handlers
import os
import textwrap
import requests
from requests import *
import json
from os import system
import sys
import re
import time
import commands
#from StringIO import StringIO
import re
from pymongo import Connection

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
       		#httpdump = 'http://10.156.232.71:5000/api/v0.1/df.json'
       		dump =  genreqget(httpdump)
      		print 'using ceph-rest-api'
	else:
		j = open('dumps/dump_df.json', 'r')
		dump = json.load(j)
		j.close()
	return dump



def parsejson(dump,pool,cluster):
	'''
	 return  pool and cluster
	'''
	#pool=deepdict()
	#cluster=deepdict()
	for key in dump['output']:
		if key == 'pools':
			for item in  dump['output'][key]:
				for subitem in item.iterkeys():
					if subitem == 'stats':
						for subsubitem in  item[subitem]:
							#print 'pool '+ str(item['id'])+' '+ subsubitem +' '+str(item[subitem][subsubitem])
							pool['pools'][str(item['id'])][subsubitem]=str(item[subitem][subsubitem])
					elif subitem!= 'id':
						pool['pools'][str(item['id'])][str(subitem)]=str(item[subitem])
					elif subitem== 'id':
						pool['pools'][str(item['id'])]['poolid']=str(item['id'])
					else: print subitem
		else:
			for item in  dump['output'][key]:
					#print 'cluster '+key +' '+item+' '+str(dump['output'][key][item])	
					cluster['cluster'][item]=str(dump['output'][key][item])
	cluster['cluster']['status']=str(dump['status'])
	return pool,cluster


#connection = Connection('localhost', 27017)
#doom=connect()
#firstd=getpooldf(doom)

#print firstd
