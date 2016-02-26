#author Philippe Raipin
#author eric Mourgaya
#licence : apache v2
from flask import Flask, request,Response
from pymongo import MongoClient, MongoReplicaSetClient
from pymongo.read_preferences import ReadPreference

from bson.dbref import DBRef
from bson.json_util import dumps
from bson import ObjectId
import time
from pymongo import Connection
from bson import BSON
from bson import json_util
from bson.objectid import ObjectId

# for ceph command call
import subprocess

configfile = "/opt/inkscope/etc/inkscope.conf"


def load_conf():
    '''
        load the  configfile  an return  a json  objet
    '''
    datasource = open(configfile, "r")
    data = json.load(datasource)
    datasource.close
    return data


# get a field value from global conf
def ceph_conf_global(field):
    p = subprocess.Popen(
        args=[
            'ceph-conf',
            '--show-config-value',
            field
            ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE)
    outdata, errdata = p.communicate()
    if len(errdata):
        raise RuntimeError('unable to get conf option %s: %s' % (field, errdata))
    return outdata.rstrip()


# get a field value from global conf according to the specified ceph conf
def ceph_conf_global(cephConfPath, field):
    p = subprocess.Popen(
        args=[
            'ceph-conf',
            '-c',
            cephConfPath,
            '--show-config-value',
            field
            ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE)
    outdata, errdata = p.communicate()
    if len(errdata):
        raise RuntimeError('unable to get conf option %s: %s' % (field, errdata))
    return outdata.rstrip()


def getClient(conf):
    '''
        Return  a connexion to  database specified  in  conf file
        take care with autentication
    '''
    mongodb_host = conf.get("mongodb_host", "127.0.0.1")
    mongodb_port = conf.get("mongodb_port", "27017")
    mongodb_URL = "mongodb://"+str(mongodb_host)+":"+str(mongodb_port)
    #mongodb replication
    is_mongo_replicat = conf.get("is_mongo_replicat", 0)
    mongodb_set = "'"+conf.get("mongodb_set","")+"'"
    mongodb_replicaSet =conf.get("mongodb_replicaSet",None)
    mongodb_read_preference = conf.get("mongodb_read_preference",None)
    #cluster = conf.get("cluster", "ceph")
    if is_mongo_replicat ==  1:
        client = MongoReplicaSetClient(eval(mongodb_set), replicaSet=mongodb_replicaSet, read_preference=eval(mongodb_read_preference))
    else:
        #if not replicated
        client = MongoClient(mongodb_URL)
    # mongo db  authentication
    is_mongo_authenticate = conf.get("is_mongo_authenticate", 0)
    mongodb_user = conf.get("mongodb_user", "ceph")
    mongodb_passwd = conf.get("mongodb_passwd", "empty")
    if is_mongo_authenticate == 1:
        client[fsid].authenticate(mongodb_user,mongodb_passwd)
    return client
             
# load conf
conf = load_conf()
global fsid
ceph_conf_file = conf.get("ceph_conf", "/etc/ceph/ceph.conf")
print "ceph_conf = ", ceph_conf_file

fsid = ceph_conf_global(ceph_conf_file, 'fsid')
print "fsid = ", fsid

client=getClient(conf)
database=client[fsid]


def getvalue(collection,item):
    '''
        get the item value of  database
        or return a json object if 
    '''

    coll=database[collection]
    cursor=coll.find_one()
    if isinstance(cursor[item], DBRef):
       dbref=cursor[item]
       print dbref.collection
       return getdbreftarget(dbref)
    else:
       return cursor[item]
    

def getdbreftarget(dbref):
    '''
    return the target of a dbref item
    '''

    coll=database[dbref.collection]
    cursor=coll.find_one({"_id" : ObjectId(dbref.id)})
    return cursor

def check_health():
    '''
         check cluster health from  database
        db:ceph
        collection: ceph
        item: health
    '''

    val = 0
    res=getvalue('cluster','health')
    if res == 'HEALTH_OK':
       return val
    elif res == 'HEALTH_WARN':
        val = 2
        # put val =1 if you  want a warn  state  in shinken
    else :
        val = 2

    return val


def check_full():
    '''
        check if cluster is full
        only two states 0 or 2 for  shinken 
    '''

    val=0
    res=getvalue('cluster','osdmap-info')
    if res['full'] != False:
        val = 2
    return val 


def check_nearfull():
    '''
        check if cluster is nearfull
        only two states 0 or 2 for  shinken 
    '''

    val=0
    res=getvalue('cluster','osdmap-info')
    if res['nearfull'] != False:
        val = 2
    return val 


def isallosd_up():
    '''
        check if all osd in are up
    '''
    val=0
    res=getvalue('cluster','osdmap-info')
    _in=res['num_in_osds']
    _up=res['num_up_osds']
    if _in != _up:
        val = 2
    return val


def cephprobeis_uptodate(tolerance):
    '''
        check if  informations in mongodb  is uptodate for 
        tolerance is an interger : for example 60000 for 1 minute
    '''
    val=0
    res=getvalue('cephprobe','timestamp')
    msg=getvalue('cephprobe','_id')
    curtim= int(round(time.time() * 1000))
    diff=curtim - res
    if diff > tolerance:
        val=2
    return val,msg
def sysprobeis_uptodate(tolerance):
    '''
        check if  informations in mongodb  is uptodate for 
        tolerance is an interger : for example 60000 for 1 minute
    '''
    val=0

    coll=database["sysprobe"]
    cursor=coll.find()
    curtim= int(round(time.time() * 1000))
    val = 0
    msg= ""
    for item in cursor:
	res=item["timestamp"]
        diff=curtim - res
    	if diff > tolerance:
        	val=2
		msg = msg + " " +item["_id"]
    return val,msg
        


def mon_df():
    '''
	check  the  available space  for mon 
    '''
    
    coll=database["mon"]
    cursor=coll.find()
    msg=""
    state=0
    for item in cursor:
	myid=item["stat"].id
	mycol=item["stat"].collection
	coll2=database[mycol]
        cursor=coll2.find_one({"_id" : myid})
	if cursor["avail_percent"] < 25:
		state=2
	 	msg="disk space "+myid
	elif cursor["avail_percent"] < 55:
		state=1
	 	msg="disk space "+myid
    return state,msg

def check_partition(seuil):
	'''
	check full partition  for all osd
	'''
	
	coll=database["hosts"]
	cursor=coll.find()
	listpart={}
	for item in cursor:
		for dbref in item["partitions"]:
			coll2=database[dbref.collection]
			cur=coll2.find_one({"_id" : dbref.id})
			newcoll=database[cur["stat"].collection]
			cursorino=newcoll.find_one({"_id" : cur["stat"].id})
			try:
				peravail=cursorino["free"]*100/ cursorino["total"]
			except ZeroDivisionError,e:
				print ah
				peravail=seuil
			#print cursorino["free"]*100/cursorino["total"]
			if peravail < seuil:
				listpart[dbref.id]=cur["mountpoint"]
	if listpart =={}:
		return 0
	else:
		for item in listpart:
			print item	
		return 2