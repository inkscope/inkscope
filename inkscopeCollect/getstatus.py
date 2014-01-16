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
CONNECT='yen'
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
        	#httpdump = 'http://10.156.232.71:5000/api/v0.1/status.json'
        	dump =  genreqget(httpdump)
        	print 'using ceph-rest-api'
	else:
		i = open('dumps/dump_status.json', 'r')
		dump = json.load(i)
		i.close()
	return dump


def parsejson(dump,dictmon,dictclust):
	#dictclust=deepdict()
	#dictmon=deepdict()
	#dictmds=deepdict()
	#dictpg=deepdict()
	#dictosd=deepdict() 
	dictclust['cluster']['stats']['status']=dump['status']
	for key in dump['output']:
		if key == 'mdsmap':
			for item in dump['output'][key]:
				pass
				#print 'cluster mds'+key+' '+item +' '+str(dump['output'][key][item]) 
		elif key == 'monmap':
			for item in dump['output'][key]:
				if item == 'mons':
					for subitem in dump['output'][key]['mons']:
						for subsubitem  in subitem.iterkeys():
							#if subsubitem != 'name':
							dictmon['mons']['hosts'][subitem['name']][subsubitem]=subitem[subsubitem]
							#print 'mons ......' + str(subitem['name'])+' '+ str(subsubitem) +' ' + str(subitem[subsubitem])
				else:
					dictmon['mons'][item]=dump['output'][key][item]
					#print 'cluster mon '+ item +' '+str(dump['output'][key][item]) 
		elif key == 'quorum_names':
			for item in  dump['output'][key]:
				pass
				#print 'mon name '+ item
		elif key == 'osdmap':
			for  item in dump['output'][key]['osdmap'].iterkeys():
				dictclust['cluster'][item]=dump['output'][key]['osdmap'][item]
				#print 'cluster osd '+item+' '+str(dump['output'][key]['osdmap'][item])
		elif key == 'pgmap':
			for  item in dump['output'][key].iterkeys():
				if item == 'pgs_by_state':
					for subitem in dump['output'][key][item]:
						for subsubitem in subitem.iterkeys():
							dictclust['cluster'][subsubitem]=subitem[subsubitem]
							#print 'cluster pg  state '+ subsubitem +' '+str(subitem[subsubitem]) 
				else:	
					dictclust['cluster'][item]=dump['output'][key][item]
					#print 'cluster pg '+item+' '+str(dump['output'][key][item])
		elif key	 == 'health':
			for  item in dump['output'][key].iterkeys():
				if item == 'health':
					for subitem in   dump['output'][key][item]['health_services']:
						for subsubitem in subitem['mons']:
							for ind in  subsubitem.iterkeys():
								#print 'mons .....'+ subsubitem['name']+''+item+' '+ ind +' ' + str(subsubitem[ind])
								dictmon['mons']['hosts'][subsubitem['name']][ind]=subsubitem[ind]
				elif item == 'timechecks':
					for subitem in   dump['output'][key][item]:
						if subitem =='mons':
							for subsubitem in dump['output'][key][item][subitem]:
								for ind in subsubitem.iterkeys():
								 	dictmon['mons']['hosts'][subsubitem['name']][ind]=subsubitem[ind]
									#print 'mons ..... '+ subsubitem['name']+' '+ind +' ' + str(subsubitem[ind])
						#else:
							#dictmon['mons'][subitem]=dump['output'][key][item][subitem]
							#print '' + subitem +' '+ str(dump['output'][key][item][subitem])
				else:
					pass
					# v2
					#print 'health ....'+item +' '+ str(dump['output'][key][item])
		
		else:
			dictclust['cluster'][key]=dump['output'][key]
			#print 'cluster ' +key +'  ' +str(dump['output'][key])
	return dictmon,dictclust
