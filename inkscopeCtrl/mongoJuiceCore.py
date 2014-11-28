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




configfile = "/opt/inkscope/etc/inkscope.conf"


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
        conf : json  conf objet
        conf=load_conf(configfile)
        db = getClient(conf)['ceph']
        collection =db['cluster']
        cursor=collection.find_one()
        Return  a connexion to  database specified  in  conf file
        take care with authentication
    '''
    mongodb_host = conf.get("mongodb_host", "127.0.0.1")
    mongodb_port = conf.get("mongodb_port", "27017")
    mongodb_URL = "mongodb://"+mongodb_host+":"+str(mongodb_port)
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

def getObject(db, collection, objectId, depth, branch):
    """
        get an object from mongo database  
        depth specified how to dig the dabase to embed the DBRef
    """
    br = None
    if branch != None :
        br = branch.copy()
        br.add(collection+":"+str(objectId))
    
    obj = db[collection].find_one({"_id" : objectId}) 
    return _getObject(db, obj, depth, br)
    
    
def _getObject(db, obj, depth, branch):
    if obj is None:
        return None
    
    if (depth <= 0): 
        for key in obj :
            if isinstance(obj[key], DBRef):
                if isinstance(obj[key].id, ObjectId):
                    obj[key] = {'$ref': obj[key].collection, '$id' : {'$oid': str(obj[key].id)}}
                else : 
                    obj[key] = {'$ref': obj[key].collection, '$id' : obj[key].id}
            elif isinstance(obj[key], ObjectId):
                obj[key] = {'$oid': str(obj[key])}
            elif isinstance(obj[key], list):
                obj[key] = _listObjects(db, obj[key], depth-1, branch)
        return obj
    for key in obj :
        if isinstance(obj[key], DBRef):
            if (obj[key].collection+":"+str(obj[key].id) not in branch) :
                obj[key] = getObject(db, obj[key].collection, obj[key].id, depth - 1, branch) 
        elif isinstance(obj[key], ObjectId):
            obj[key] = {'$oid': str(obj[key])}
        elif isinstance(obj[key], list):
            obj[key] = _listObjects(db, obj[key], depth, branch)
    return obj
    
    
def _listObjects(db, objs, depth, branch):
    if (depth <= 0): 
        r_objs = []
        for obj in objs:
            if isinstance(obj, int) or isinstance(obj, long) or isinstance(obj, float) or isinstance(obj, bool) or isinstance(obj, str)  or isinstance(obj, unicode) :
                pass
            elif isinstance(obj, list):
                obj = _listObjects(db, obj, depth, branch)
            elif isinstance(obj, DBRef):
                if isinstance(obj.id, ObjectId):
                    obj = {'$ref': obj.collection, '$id' : {'$oid': str(obj.id)}}
                else : 
                    obj = {'$ref': obj.collection, '$id' : obj.id}
            else:
                for key in obj :
                    if isinstance(obj[key], DBRef):
                        if isinstance(obj[key].id, ObjectId):
                            obj[key] = {'$ref': obj[key].collection, '$id' : {'$oid': str(obj[key].id)}}
                        else : 
                            obj[key] = {'$ref': obj[key].collection, '$id' : obj[key].id}
                    elif isinstance(obj[key], ObjectId):
                        obj[key] = {'$oid': str(obj[key])}
                    elif isinstance(obj[key], list):
                        obj[key] = _listObjects(db, obj[key], depth-1, branch)
            r_objs.append(obj)    
        return r_objs
    
    r_objs = []
    for obj in objs:
        if isinstance(obj, int) or isinstance(obj, long) or isinstance(obj, float) or isinstance(obj, bool) or isinstance(obj, str) or isinstance(obj, unicode) :
            pass
        elif isinstance(obj, list):
            obj = _listObjects(db, obj, depth, branch)
        elif isinstance(obj, DBRef):
            if (obj.collection+":"+str(obj.id) not in branch) :
                obj = getObject(db, obj.collection, obj.id, depth - 1, branch) 
        else:    
            for key in obj :     
                if isinstance(obj[key], DBRef):
                    if (obj[key].collection+":"+str(obj[key].id) not in branch) :
                        obj[key] = getObject(db, obj[key].collection, obj[key].id, depth - 1, branch)
                elif isinstance(obj[key], ObjectId):
                    obj[key] = {'$oid': str(obj[key])}
                elif isinstance(obj[key], list):
                    obj[key] = _listObjects(db, obj[key], depth-1, branch)
        r_objs.append(obj)             
    return r_objs


def listObjects(db, filters, collection, depth ):
    """
        get a list of filtered objects from mongo database   
        depth specified how to dig the dabase to embed the DBRef
    """
    
    select = None
    template = None
    
    if filters != None:
        _complex = False
        if "$select" in filters :
            select = filters["$select"]
            _complex = True
        if "$template" in filters :
            template = filters["$template"]
            _complex = True
        if not _complex :
            select = filters
            template = None
            
    objs = list(db[collection].find(select, template))
    return _listObjects(db, objs, depth, set()) 


def execute(db, command, keyvalues):
    
    if "action" not in command :
        return None
    action = command["action"]
    
    
    if action == "get":
        return evaluate(command.get("field", None), keyvalues)
    elif action == "find":
        if "collection" not in command :
            return None
        collection = command["collection"]
        depth = command.get("depth", 0)
        select = evaluate(command.get("select", None), keyvalues)
        template = command.get("template", None)        
        objs = list(db[collection].find(select, template))
        return _listObjects(db, objs, depth, set()) 
       
    elif action == "findOne":
        if "collection" not in command :
            return None
        depth = command.get("depth", 0)
        collection = command["collection"]
        select = evaluate(command.get("select", None), keyvalues)
        template = command.get("template", None)              
        objs = list(db[collection].find(select, template))
        r = _listObjects(db, objs, depth, set())
        if r :
            return r[0]
        else:
            return None
    elif action == "aggregate":
        if "collection" not in command :
            return None
        depth = command.get("depth", 0)
        collection = command["collection"]
        pipeline = evaluate(command.get("pipeline", None), keyvalues)
        if not pipeline :
            return None
        objs = list(db[collection].aggregate(pipeline))
        return _listObjects(db, objs, depth, set()) 
   

def evaluate(obj, keyvalues):
    if not obj :
        return obj
    elif isinstance(obj, basestring):
        if obj.startswith("@"):
            return getValue(keyvalues, obj[1:])
        else :
            return obj
    elif isinstance(obj, list):
        l = []
        for item in obj:
            l.append(evaluate(item, keyvalues))
        return l
    elif isinstance(obj, dict):
        d = obj.copy()      
        for key in d:
            d[key] = evaluate(d[key], keyvalues)     
        return d   
    return obj

def getValue(res, path):
    wpath = path.split(".")
    path = []
    for node in wpath:     
        if '#' in node:
            part = node.partition('#')
            path.append(part[0])
            path.append(int(part[2]))
        else:
            path.append(node)
    
    walk = res
    for node in path:
        walk = walk[node]
    return walk
    

def build(db, obj):
    res = {}
    allres = {}
    steps = {}
    for key in obj:
        command = obj[key]
        command["key"] = key
        c_step= command.get("step", 0)
        step = steps.get(c_step, [])
        step.append(command)
        steps[c_step] = step 
        
    for step in sorted(steps.iterkeys()):
        for command in steps[step]:
            resp = execute(db, command, allres)           
            if not command["key"].startswith("__"):
                 res[command["key"]] = resp
            allres[command["key"]] = resp
    return res


#@app.route('/<db>/<collection>', methods=['GET', 'POST'])
def find(conf, db, collection):
    depth = int(request.args.get('depth', '0'))
    if request.method == 'POST':
        body_json = request.get_json(force=True)
        db = getClient(conf)[db]
        response_body = dumps(listObjects(db, body_json, collection, depth))
        return Response(response_body, headers = {"timestamp" :  int(round(time.time() * 1000))}, mimetype='application/json')
    else:
        db = getClient(conf)[db]
        response_body = dumps(listObjects(db, None, collection, depth))
        return Response(response_body, headers = {"timestamp" :  int(round(time.time() * 1000))}, mimetype='application/json')

# @app.route('/<db>', methods=['POST'])
def full(conf, db):
    if request.method == 'POST':
        body_json = request.get_json(force=True)
        db = getClient(conf)[db]
        response_body = dumps(build(db, body_json))
        return Response(response_body, headers = {"timestamp" :  int(round(time.time() * 1000))}, mimetype='application/json')

