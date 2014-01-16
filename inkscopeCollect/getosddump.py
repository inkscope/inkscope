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
import json
from os import system
import sys
import re
import time
import commands
#from StringIO import StringIO
import re


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
		#	httpdump = 'http://10.156.232.71:5000/api/v0.1/osd/dump.json'
		dump =  genreqget(httpdump)
		print 'using ceph-rest-api'
	else:
		f = open('dumps/dump_osddump.json', 'r')
		dump = json.load(f)
		f.close()
	return dump

#dump=connect()
#pool['pools'][str(item['id'])]['poolid']=str(item['id'])

def parsejson(osddump,dictosd,dictpool,dictclust):
	#dictosd=deepdict()
	#dictpool=deepdict()
	#dictclust=deepdict()
	for key in osddump['output'].iterkeys():
        	        if key == 'osds':
				for node in osddump['output'][key]:
					dictosd['osd'][str(node['osd'])]['hearbeat_front']=str(node['heartbeat_front_addr'])
					dictosd['osd'][str(node['osd'])]['hearbeat_back']=str(node['heartbeat_back_addr'])
					dictosd['osd'][str(node['osd'])]['public_addr']=str(node['public_addr'])
					dictosd['osd'][str(node['osd'])]['isup']=str(node['up'])
					dictosd['osd'][str(node['osd'])]['isin']=str(node['in'])
			elif key == 'pools':
				for pool in  osddump['output'][key]:
					dictpool['pools'][str(pool['pool'])]['snap_seq']=str(pool['snap_seq'])
					dictpool['pools'][str(pool['pool'])]['snap_mode']=str(pool['snap_mode'])
					dictpool['pools'][str(pool['pool'])]['pool_name']=str(pool['pool_name'])
					dictpool['pools'][str(pool['pool'])]['type']=str(pool['type'])
					dictpool['pools'][str(pool['pool'])]['pg_placement_num']=str(pool['pg_placement_num'])
					dictpool['pools'][str(pool['pool'])]['min_size']=str(pool['min_size'])
					dictpool['pools'][str(pool['pool'])]['crash_replay_interval']=str(pool['crash_replay_interval'])
					dictpool['pools'][str(pool['pool'])]['quota_max_bytes']=str(pool['quota_max_bytes'])
					dictpool['pools'][str(pool['pool'])]['size']=str(pool['size'])
					dictpool['pools'][str(pool['pool'])]['pg_num']=str(pool['pg_num'])
					dictpool['pools'][str(pool['pool'])]['snap_epoch']=str(pool['snap_epoch'])
					dictpool['pools'][str(pool['pool'])]['crush_ruleset']=str(pool['crush_ruleset'])
					dictpool['pools'][str(pool['pool'])]['last_change']=str(pool['last_change'])
					dictpool['pools'][str(pool['pool'])]['removed_snaps']=str(pool['removed_snaps'])
			elif key == 'osd_xinfo':
				for xosd in  osddump['output'][key]:
					dictosd['osd'][str(xosd['osd'])]['laggy_probability']=str(xosd['laggy_probability'])
					dictosd['osd'][str(xosd['osd'])]['laggy_interval']=str(xosd['laggy_interval'])
			else: 
				dictclust['cluster'][key]=str(osddump['output'][key])

				
	return dictosd,dictpool,dictclust


#a,b,c=parsejson(dump)
#print a
#print b
#print c
