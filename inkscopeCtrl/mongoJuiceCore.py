#author Philippe Raipin
#licence : apache v2


from pymongo import MongoClient
import json
from bson.dbref import DBRef 
from bson.json_util import dumps
from bson import ObjectId
import time


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

@app.route('/mongodb/<db>/<collection>', methods=['GET', 'POST'])
def find(db, collection):
    depth = int(request.args.get('depth', '0'))
    if request.method == 'POST':
        body_json = request.get_json(force=True)
        db = client[db]
        response_body = dumps(listObjects(db, body_json, collection, depth))
        return Response(response_body, headers = {"timestamp" :  int(round(time.time() * 1000))}, mimetype='application/json')
    else:
        db = client[db]
        response_body = dumps(listObjects(db, None, collection, depth))
        return Response(response_body, headers = {"timestamp" :  int(round(time.time() * 1000))}, mimetype='application/json')

@app.route('/moongodb/<db>', methods=['POST'])
def full(db):
    if request.method == 'POST':
        body_json = request.get_json(force=True)
        db = client[db]
        response_body = dumps(build(db, body_json))
        return Response(response_body, headers = {"timestamp" :  int(round(time.time() * 1000))}, mimetype='application/json')



#========================================================================================================#=========================

# class Pools:
#     """docstring for pools"""
#     def __init__(self):
#         self.pool_name = ''
#         self.pg_num = ''
#         self.pgp_num = ''
#         self.pool_name = ''
#         self.pg_num = ''
#         self.pgp_num = ''
#         self.size = ''
#         self.min_size = ''
#         self.crash_replay_interval = ''
#         self.crush_ruleset = ''
#         self.quota_max_objects = ''
#         self.quota_max_bytes = ''
        

#     def getdataform(self):
#         jsondata = request.form['json']
#         jsondata = json.loads(jsondata)
#         pool_name = jsondata['name']
#         pg_num = jsondata['pg_num']
#         pgp_num = jsondata['pgp_num']
#         size = jsondata['size']
#         min_size = jsondata['size_min']
#         crash_replay_interval = jsondata['crash_replay_interval']
#         crush_ruleset = jsondata['crush_ruleset']
#         quota_max_objects = jsondata['quota_max_objects']
#         quota_max_bytes = jsondata['quota_max_bytes']
#         return render_template('pools/createPool.html')

#     #osd lspools    
#     def show(self):
#         r = requests.get('http://localhost:8080/ceph-rest-api/osd/lspools.json')
#         return r.text

#     def create(self):
#         return requests.put('http://localhost:8080/ceph-rest-api/osd/pool/create?pool='+poolname+'&pg_num='+pg_num+'&pgp_num='+pgp_num)

#     def delete(self):
#         check = ''
#         return requests.put('http://localhost:8080/ceph-rest-api/osd/pool/delete?pool='+poolname+'&sure=--yes-i-really-really-mean-it')


# def getindice(id, jsondata):
#     r = jsondata.json()
#     mypoolsnum = array('i',[])
#     for i in r['output']['pools']:
#         mypoolsnum.append(i[u'pool'])
#     if id not in  mypoolsnum:
#         return "That pool's id does not exit"

#     else:
#         for i in range(len(mypoolsnum)):
#             if mypoolsnum[i]==id:
#                 id=i
#         return id

# def getpoolname(id, jsondata):
#     r = jsondata.json()
#     ind = getindice(id, jsondata)
#     poolname = r['output']['pools'][ind]['pool_name']
#     return str(poolname)

# def geterrors(url, methods):
#     try:
#         if methods == 'GET':
#             r = requests.get(url)
#         else:
#             r = requests.put(url)
#     except HTTPError, e:
#         return 'Error '+str(r.status_code) 
#     else:
#         return  'kjh'


# @app.route('/pools/', methods=['GET','POST'])
# @app.route('/pools/<int:id>', methods=['GET','DELETE','PUT'])
# def pool_manage(id=None):
#     if request.method == 'GET':
#         if id == None:
            
#             r = requests.get('http://localhost:8080/ceph-rest-api/osd/lspools.json')
             
#             if r.status_code != 200:
#                 return Response(r.raise_for_status())
#             else:
#                 return Response(r, mimetype='application/json')
#         else:
#             data = requests.get('http://localhost:8080/ceph-rest-api/osd/dump.json')
#             if data.status_code != 200:
#                 return 'Error '+str(r.status_code)+' on the request getting pools'
#             else:

#                 ind = getindice(id, data)
#                 id = ind
#                 if id == "That pool's id does not exit":
#                     return id

#                 else:
#                     skeleton = {'status':'','output':{}}
                    
#                     r = data.json()
#                     skeleton['status'] = r['status']
#                     skeleton['output'] = r['output']['pools'][id]

#                     result = json.dumps(skeleton)
#                     return Response(result, mimetype='application/json')

#     elif request.method =='POST':

#         jsondata = request.form['json']
#         jsondata = json.loads(jsondata)

#         pool_name = jsondata['pool_name']
#         pg_num = jsondata['pg_num']
#         pgp_num = jsondata['pg_placement_num']
#         size = jsondata['size']
#         min_size = jsondata['min_size']
#         crash_replay_interval = jsondata['crash_replay_interval']
#         crush_ruleset = jsondata['crush_ruleset']
#         quota_max_objects = jsondata['quota_max_objects']
#         quota_max_bytes = jsondata['quota_max_bytes']

#         # typee = request.form['type']
        
        
#         create_pool = requests.put('http://localhost:8080/ceph-rest-api/osd/pool/create?pool='+pool_name+'&pg_num='+str(pg_num)+'&pgp_num='+str(pgp_num))

#         if create_pool.status_code != 200:
#             return 'Error '+str(r.status_code)+' on creating pools'
#         else:

#             r = requests.get('http://localhost:8080/ceph-rest-api/osd/dump.json')
#             r = r.json()
#             nbpool = len(r['output']['pools'])
#             poolname = r['output']['pools'][nbpool-1]['pool_name']
#             poolname = str(poolname)
#             size_default = r['output']['pools'][nbpool-1]['size']
#             min_size_default = r['output']['pools'][nbpool-1]['min_size']
#             crash_replay_interval_default = r['output']['pools'][nbpool-1]['crash_replay_interval']
#             crush_ruleset_default = r['output']['pools'][nbpool-1]['crush_ruleset']

#             quota_max_objects_default = r['output']['pools'][nbpool-1]['crush_ruleset']
#             quota_max_bytes_default = r['output']['pools'][nbpool-1]['crush_ruleset']

#             """ 
#                 set poool parameter

#             """ 
#             var_name= ['size', 'min_size', 'crash_replay_interval','crush_ruleset']
#             param_to_set_list = [size, min_size, crash_replay_interval, crush_ruleset]
#             default_param_list = [size_default, min_size_default, crash_replay_interval_default, crush_ruleset_default]

#             for i in range(len(default_param_list)):
#                 if param_to_set_list[i] != default_param_list[i]:
#                     r = requests.put('http://localhost:8080/ceph-rest-api/osd/pool/set?pool='+poolname+'&var='+var_name[i]+'&val='+str(param_to_set_list[i])) 
#                 else:
#                     pass

#             """
#                 set object or byte limit on pool
#             """
#             field_name = ['max_objects','max_bytes']
#             param_to_set = [quota_max_objects, quota_max_bytes]
#             default_param = [quota_max_objects_default, quota_max_bytes_default]

#             for i in range(len(default_param)):
#                 if param_to_set[i] != default_param[i]:
#                     r = requests.put('http://localhost:8080/ceph-rest-api/osd/pool/set-quota?pool='+poolname+'&field='+field_name[i]+'&val='+str(param_to_set[i])) 
                
#                 else:
#                     pass        
#             return "size"

#     elif request.method == 'DELETE':
#         r = requests.get('http://localhost:8080/ceph-rest-api/osd/dump.json')
#         if r.status_code != 200:
#             return 'Error '+str(r.status_code)+' on the request getting pools'
#         else:
#             r = r.json()

#             data = requests.get('http://localhost:8080/ceph-rest-api/osd/dump.json')
#             ind = getindice(id, data)
#             id = ind

#             poolname = r['output']['pools'][id]['pool_name']
#             poolname = str(poolname)
#             delete_request = requests.put('http://localhost:8080/ceph-rest-api/osd/pool/delete?pool='+poolname+'&pool2='+poolname+'&sure=--yes-i-really-really-mean-it')
#             return str(delete_request.status_code)

#     else:

#         jsondata = request.form['json']
#         jsondata = json.loads(jsondata)
#         pool_name = jsondata['pool_name']
#         pg_num = jsondata['pg_num']
#         pgp_num = jsondata['pg_placement_num']
#         size = jsondata['size']
#         min_size = jsondata['min_size']
#         crash_replay_interval = jsondata['crash_replay_interval']
#         crush_ruleset = jsondata['crush_ruleset']
#         quota_max_objects = jsondata['quota_max_objects']
#         quota_max_bytes = jsondata['quota_max_bytes']


#         data = requests.get('http://localhost:8080/ceph-rest-api/osd/dump.json')
#         if data.status_code != 200:
#             return 'Error '+str(r.status_code)+' on the request getting pools'
#         else:
#             r = data.json()

#             ind = getindice(id, data)
#             id = ind

#             nbpool = len(r['output']['pools'])
#             poolname = r['output']['pools'][id]['pool_name']
#             size_default = r['output']['pools'][id]['size']
#             min_size_default = r['output']['pools'][id]['min_size']
#             crash_replay_interval_default = r['output']['pools'][id]['crash_replay_interval']
#             crush_ruleset_default = r['output']['pools'][id]['crush_ruleset']

#             quota_max_objects_default = r['output']['pools'][id]['crush_ruleset']
#             quota_max_bytes_default = r['output']['pools'][id]['crush_ruleset']

#             '''rename the poolname'''

#             if str(poolname) != str(pool_name):
#                 r = requests.put('http://localhost:8080/ceph-rest-api/osd/pool/rename?srcpool='+str(poolname)+'&destpool='+str(pool_name)) 
#                 poolname = str(pool_name)

#             """ 
#                 set poool parameter

#             """ 
#             var_name= ['size', 'min_size', 'crash_replay_interval','crush_ruleset']
#             param_to_set_list = [size, min_size, crash_replay_interval, crush_ruleset]
#             default_param_list = [size_default, min_size_default, crash_replay_interval_default, crush_ruleset_default]

#             for i in range(len(default_param_list)):
#                 if param_to_set_list[i] != default_param_list[i]:
#                     r = requests.put('http://localhost:8080/ceph-rest-api/osd/pool/set?pool='+str(poolname)+'&var='+var_name[i]+'&val='+str(param_to_set_list[i])) 
#                 else:
#                     pass

#             """
#                 set object or byte limit on pool
#             """
#             field_name = ['max_objects','max_bytes']
#             param_to_set = [quota_max_objects, quota_max_bytes]
#             default_param = [quota_max_objects_default, quota_max_bytes_default]

#             for i in range(len(default_param)):
#                 if param_to_set[i] != default_param[i]:
#                     r = requests.put('http://localhost:8080/ceph-rest-api/osd/pool/set-quota?pool='+poolname+'&field='+field_name[i]+'&val='+str(param_to_set[i])) 
#                 else:
#                     pass        
#             return str(r.status_code)

# @app.route('/pools/<int:id>/snapshot', methods=['POST'])
# def makesnapshot(id):
#     data = requests.get('http://localhost:8080/ceph-rest-api/osd/dump.json')
#     r = data.json()
#     ind = getindice(id,data)
#     id = ind

#     poolname = r['output']['pools'][id]['pool_name']

#     jsondata = request.form['json']
#     jsondata = json.loads(jsondata)
#     snap = jsondata['snapshot_name']
#     r = requests.put('http://localhost:8080/ceph-rest-api/osd/pool/mksnap?pool='+str(poolname)+'&snap='+str(snap)) 
#     return str(r.status_code)

# @app.route('/pools/<int:id>/snapshot/<namesnapshot>', methods=['DELETE'])
# def removesnapshot(id,namesnapshot):

#     data = requests.get('http://localhost:8080/ceph-rest-api/osd/dump.json')
#     r = data.json()
#     ind = getindice(id,data)
#     id = ind

#     poolname = r['output']['pools'][id]['pool_name']

#     try:
#         r = requests.put('http://localhost:8080/ceph-rest-api/osd/pool/rmsnap?pool='+str(poolname)+'&snap='+str(namesnapshot))
#     except HTTPException, e:
#         return e    
#     else:
#         return r.content
