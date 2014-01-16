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
'''
pg_stats_delta
pg_stats_sum
stamp
osd_stats_sum
last_pg_scan
full_ratio
pool_stats ---
version
last_osdmap_epoch
near_full_ratio
pg_stats -----
osd_stats ----
'''

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
        	#httpdump = 'http://10.156.232.71:5000/api/v0.1/pg/dump_json.json'
                dump =  genreqget(httpdump)
                print 'using ceph-rest-api'
        else:
		j = open('dumps/dump_pgdump.json', 'r')
                dump = json.load(j)
                j.close()
        return dump


#manage pgdump

def parsejson(pgdump,dictpool,dictosd,dictpg,dictclust):
	#dictpool=deepdict()
	#dictosd=deepdict()
	#dictpg=deepdict()
	#dictclust=deepdict()
	for key in pgdump['output'].iterkeys():
		if key == 'pg_stats':
			for nodpg in pgdump['output']['pg_stats']:
				for item in nodpg.iterkeys():
					if item == "stat_sum":
						for subitem in nodpg[item]:
							dictpg['pg'][nodpg['pgid']][subitem]=nodpg[item][subitem]
							#print 'pg ' + str(nodpg['pgid'])+' '+subitem+' '+str(nodpg[item][subitem]) 
					else:
						dictpg['pg'][nodpg['pgid']][item]=nodpg[item]
						#print 'pg ' +str(nodpg['pgid'])+' '+item +' '+ str(nodpg[item])
		elif key == 'pg_stats_delta':
			for pgosd in pgdump['output'][key]:
					pass
					#print pgdump['output'][key][pgosd]
					#for subsubitem in  pgdump['output'][key][pgosd]:
					#	pass
					#	print 'pg stats delta '+subsubitem+' '+str(pgdump['output'][key][pgosd][subsubitem]) 
		elif key == 'osd_stats':
			for nodpgo in pgdump['output'][key]: 
				for  subitem  in nodpgo.iterkeys():
							dictosd['osd'][nodpgo['osd']][subitem]=nodpgo[subitem]
		elif key == 'pool_stats':
			for pgo in pgdump['output'][key]:
				for  subitem  in pgo.iterkeys():
					if  subitem =='stat_sum':
						for subsubitem in  pgo[subitem]:
							dictpool['pools'][pgo['poolid']][subsubitem]=pgo[subitem][subsubitem]
					else:
						dictpool['pools'][pgo['poolid']][subitem]=pgo[subitem]
		elif key == 'osd_stats_sum':
			for pgosd in pgdump['output'][key]:
				dictosd['osd']['stats'][pgosd]=pgdump['output'][key][pgosd]
		elif key == 'pg_stats_sum':
			for pgosd in pgdump['output'][key]:
				if  pgosd =='stat_sum':
					for subsubitem in  pgdump['output'][key][pgosd]:
						dictpg['pg']['stats'][subsubitem]=pgdump['output'][key][pgosd][subsubitem]
				else:	
					dictpg['pg']['stats'][pgosd]=pgdump['output'][key][pgosd]
		else:
			dictclust['cluster'][key]=pgdump['output'][key]
	return dictpool,dictosd,dictpg,dictclust

