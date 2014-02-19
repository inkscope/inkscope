#author Philippe Raipin
#licence : apache v2

from flask import Flask, request, Response
app = Flask(__name__)

from pymongo import MongoClient
import json
from bson.dbref import DBRef 
from bson.json_util import dumps
from bson import ObjectId


configfile = "/opt/inkscope/etc/inkscopeCtrl.conf"
#load the conf (from json into file)
def load_conf():
    datasource = open(configfile, "r")
    data = json.load(datasource)
    datasource.close()
    return data


import  sys
sys.path.append('.')

conf = load_conf()

mongodb_host = conf.get("mongodb_host", "127.0.0.1")
mongodb_port = conf.get("mongodb_port", "27017")
mongodb_URL = "mongodb://"+mongodb_host+":"+mongodb_port


client = MongoClient(mongodb_URL)

def getObject(db, collection, objectId, depth):
    """
        get an object from mongo database  
        depth specified how to dig the dabase to embed the DBRef
    """
    obj = db[collection].find_one({"_id" : objectId})
    return _getObject(db, obj, depth)
    
    
def _getObject(db, obj, depth):
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
                obj[key] = _listObjects(db, obj[key], depth-1)
        return obj
    for key in obj :
        if isinstance(obj[key], DBRef):
            obj[key] = getObject(db, obj[key].collection, obj[key].id, depth - 1) 
        elif isinstance(obj[key], ObjectId):
            obj[key] = {'$oid': str(obj[key])}
        elif isinstance(obj[key], list):
            obj[key] = _listObjects(db, obj[key], depth)
    return obj
    
    
def _listObjects(db, objs, depth):
    if (depth <= 0): 
        r_objs = []
        for obj in objs:
            if isinstance(obj, int) or isinstance(obj, long) or isinstance(obj, float) or isinstance(obj, bool) or isinstance(obj, str)  or isinstance(obj, unicode) :
                pass
            elif isinstance(obj, list):
                obj = _listObjects(db, obj, depth)
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
                        obj[key] = _listObjects(db, obj[key], depth-1)
            r_objs.append(obj)    
        return r_objs
    
    r_objs = []
    for obj in objs:
        if isinstance(obj, int) or isinstance(obj, long) or isinstance(obj, float) or isinstance(obj, bool) or isinstance(obj, str) or isinstance(obj, unicode) :
            pass
        elif isinstance(obj, list):
            obj = _listObjects(db, obj, depth)
        elif isinstance(obj, DBRef):
            obj = getObject(db, obj.collection, obj.id, depth - 1) 
        else:    
            for key in obj :     
                if isinstance(obj[key], DBRef):
                    obj[key] = getObject(db, obj[key].collection, obj[key].id, depth - 1)
                elif isinstance(obj[key], ObjectId):
                    obj[key] = {'$oid': str(obj[key])}
                elif isinstance(obj[key], list):
                    obj[key] = _listObjects(db, obj[key], depth-1)
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
    return _listObjects(db, objs, depth) 


@app.route('/<db>/<collection>', methods=['GET', 'POST'])
def find(db, collection):
    depth = int(request.args.get('depth', '0'))
    if request.method == 'POST':
        body_json = request.get_json(force=True)
        db = client[db]
        response_body = dumps(listObjects(db, body_json, collection, depth))
        return Response(response_body, mimetype='application/json')
    else:
        db = client[db]
        response_body = dumps(listObjects(db, None, collection, depth))
        return Response(response_body, mimetype='application/json')
