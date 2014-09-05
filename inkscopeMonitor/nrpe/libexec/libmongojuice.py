#author Philippe Raipin
#licence : apache v2
from flask import Flask, request,Response
from pymongo import MongoClient, MongoReplicaSetClient
from pymongo.read_preferences import ReadPreference

import json
from bson.dbref import DBRef
from bson.json_util import dumps
from bson import ObjectId
import time
from bson.dbref import DBRef
from bson.json_util import dumps
from bson import ObjectId
import time
from pymongo import Connection
from bson import BSON
from bson import json_util
from bson.objectid import ObjectId


configfile = "/opt/inkscope/etc/inkscopeCtrl.conf"


def load_conf(config):
    '''
        load the  configfile  an return  a json  objet
    '''
    datasource = open(configfile, "r")
    data = json.load(datasource)
    datasource.close
    return data



def getClient(conf):
    '''
        Return  a connexion to  database specified  in  conf file
        take care with autentication
    '''
    mongodb_host = conf.get("mongodb_host", "127.0.0.1")
    mongodb_port = conf.get("mongodb_port", "27017")
    mongodb_URL = "mongodb://"+mongodb_host+":"+mongodb_port
    #mongodb replication
    is_mongo_replicat = conf.get("is_mongo_replicat", 0)
    mongodb_set = "'"+conf.get("mongodb_set","")+"'"
    mongodb_replicaSet =conf.get("mongodb_replicaSet",None)
    mongodb_read_preference = conf.get("mongodb_read_preference",None)
    cluster = conf.get("cluster", "ceph")
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
        client[cluster].authenticate(mongodb_user,mongodb_passwd)
    return client
             

def getvalue(dbname,collection,item):
    '''
        get the item value of  database
        or return a json object if 
    '''
    conf=load_conf(configfile)
    client=getClient(conf)
    database=client[dbname]
    coll=database[collection]
    cursor=coll.find_one()
    if isinstance(cursor[item], DBRef):
         return getdbreftarget(dbref)
    else:
       return cursor[item]
    

def getdbreftarget(dbref):
    '''
    return the target of a dbref item
    '''
    db=conf.get("cluster","ceph")
    conf=load_conf(configfile)
    client=getClient(conf)
    database=client[db]
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
    res=getvalue('ceph','cluster','health')
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
    res=getvalue('ceph','cluster','osdmap-info')
    if res['full'] != False:
        val = 2
    return val 

def check_nearfull():
    '''
        check if cluster is nearfull
        only two states 0 or 2 for  shinken 
    '''

    val=0
    res=getvalue('ceph','cluster','osdmap-info')
    if res['nearfull'] != False:
        val = 2
    return val 

def isallosd_up():
    '''
        check if all osd in are up
    '''
    val=0
    res=getvalue('ceph','cluster','osdmap-info')
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
    res=getvalue('ceph','cephprobe','timestamp')
    curtim= int(round(time.time() * 1000))
    diff=curtim - res
    if diff > tolerance:
        val=2
    return val



'''

test1=check_health()
test2=check_full()
test3=check_nearfull()
test4=isallosd_up()
test5=cephprobeis_uptodate(10000)
print test1, test2, test3,test4,test5
    
res=getvalue('ceph','cluster','df')
if isinstance(res, DBRef):
    print res.collection
    print res.database
    print res.id
    

db='ceph'
conf=load_conf(configfile)
client=getClient(conf)
database=client[db]
coll=database[res.collection]
cursor=coll.find_one({"_id" : ObjectId(res.id)})
print cursor
'''
#cursor=coll.find_one()
#if isinstance(cursor['stat'], DBRef):
#    dbref=cursor['stat']
#    colli=database[dbref.collection]
#    curd=colli.find_one()
#    print curd
