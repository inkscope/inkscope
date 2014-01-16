#!/usr/bin/python
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
import getdf 
import getosddump
import getosdtree 
import getpgdump
import getstatus
import itertools
import time
import psutil
#import sysprobe
from pymongo import MongoClient
import httplib
import json
from StringIO import StringIO

clusterName = "ceph"
restip='10.156.232.71'
restport='5000'
resthttpprefix='http://'+restip+':'+restport+'/api/v0.1/'

class deepdict(dict):
    """Implementation of perl's autovivification feature."""
    def __getitem__(self, item):
        try:
            return dict.__getitem__(self, item)
        except KeyError:
            value = self[item] = type(self)()
            return value

def deeptojson(jsonobj):
	'''
		make a pretty print of json file
	'''
	jsond=json.dumps(jsonobj,sort_keys=True,indent=4, separators=(',', ': '))
	#print jsond
	e=json.loads(jsond)
	return e

# parse json file from /api/v0.1/df.json

pool=deepdict()
cluster=deepdict()
osd=deepdict()
pg=deepdict()
obj=deepdict()
mons=deepdict()

httpdumpdf = resthttpprefix+'df.json'
dumpdf=getdf.connect(httpdumpdf)
getdf.parsejson(dumpdf,pool,cluster)


#parse json from /api/v0.1/osd/dump.json
httpdumposd= resthttpprefix+'osd/dump.json'
osddump=getosddump.connect(httpdumposd)
getosddump.parsejson(osddump,osd,pool,cluster)


# parsejson from  api/v0.1/osd/tree.json
httpdumposdtree=resthttpprefix+'osd/tree.json'
dumposdtree=getosdtree.connect(httpdumposdtree)
getosdtree.parsejson(dumposdtree,osd,obj)

#i parsejson from v0.1/pg/dump_json.json
httppgdump=resthttpprefix+'pg/dump_json.json'
pgdump=getpgdump.connect(httppgdump)
getpgdump.parsejson(pgdump,pool,osd,pg,cluster)


#parsejson  from /api/v0.1/status.json
httpdumpstatus=resthttpprefix+'status.json'
statusdump=getstatus.connect(httpdumpstatus)
getstatus.parsejson(statusdump,mons,cluster)

# insert  datas in mongo db database

client = MongoClient()
db = client[clusterName]

jpool=deeptojson(pool)

for poolid in jpool['pools']:
	vkey="'" + str(jpool['pools'][poolid]['name']) +"'"
	db.pool.update({'name': vkey},jpool['pools'][poolid],True)


josd=deeptojson(osd)
for osdid in josd['osd']:
	if osdid =='stats':
		print josd['osd'][osdid]
		#db.stats.insert(josd['osd'][osdid])
	else:
		vkey="'" + str(josd['osd'][osdid]['name']) +"'"
		#print vkey
		db.osd.update({'name': vkey},josd['osd'][osdid],True)


jcluster=deeptojson(cluster)
fsid=jcluster['cluster']['fsid']
print fsid
#print jcluster['cluster']
db.cluster.update({'fsid':fsid},jcluster['cluster'],True)


jpg=deeptojson(pg)
for pgid in jpg['pg']:
	if pgid == 'stats':
		 print jpg['pg'][pgid]
	else:
		pgname=jpg['pg'][pgid]['pgid']
		db.pg.update({'pgid':pgname},jpg['pg'][pgid],True)

jmons=deeptojson(mons)
#print jmons['mons']['fsid']
db.mon.update({'fsid':jmons['mons']['fsid']},jmons['mons'],True)

jobj=deeptojson(obj)
for  objid in  jobj['obj']:
	#print jobj['obj'][objid]
	db.types.update({'name':jobj['obj'][objid]['name']},jobj['obj'][objid],True)
