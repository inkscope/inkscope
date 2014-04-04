# Alpha O. Sall
# 03/24/2014
# Alpha O. Sall
# 03/24/2014
from flask import Flask, request, Response
import json
import requests
from array import *

port = 8080
url = 'http://localhost:'+str(port)
class Pools:
    """docstring for pools"""
    def __init__(self):
        pass       

    def newpool_attribute(self, jsonform):
        jsondata = json.loads(jsonform)
        self.name = jsondata['pool_name']
        self.pg_num = jsondata['pg_num']
        self.pgp_num = jsondata['pg_placement_num']
        self.size = jsondata['size']
        self.min_size = jsondata['min_size']
        self.crash_replay_interval = jsondata['crash_replay_interval']
        self.crush_ruleset = jsondata['crush_ruleset']
        self.quota_max_objects = jsondata['quota_max_objects']
        self.quota_max_bytes = jsondata['quota_max_bytes']

    def savedpool_attribute(self, ind, jsonfile):
        r = jsonfile.json()
        self.name = r['output']['pools'][ind]['pool_name']
        self.pg_num = r['output']['pools'][ind]['pg_num']
        self.pgp_num = r['output']['pools'][ind]['pg_placement_num']
        self.size = r['output']['pools'][ind]['size']
        self.min_size = r['output']['pools'][ind]['min_size']
        self.crash_replay_interval = r['output']['pools'][ind]['crash_replay_interval']
        self.crush_ruleset = r['output']['pools'][ind]['crush_ruleset']
        self.quota_max_objects = r['output']['pools'][ind]['quota_max_objects']
        self.quota_max_bytes = r['output']['pools'][ind]['quota_max_bytes']

    #osd lspools    
    def show(self):
        r = requests.get(url+'/ceph-rest-api/osd/lspools.json')
        return r.text

    def register(self):      
        register_pool = requests.put('http://localhost:8080/ceph-rest-api/osd/pool/create?pool='+self.name+'&pg_num='+str(self.pg_num)+'&pgp_num='+str(self.pgp_num))
        # if newpool.register().status_code != 200:
        # #     return 'Error '+str(r.status_code)+' on creating pools'
        # else:
    def delete(self):
        check = ''
        return requests.put('http://localhost:8080/ceph-rest-api/osd/pool/delete?pool='+poolname+'&sure=--yes-i-really-really-mean-it')



def getindice(id, jsondata):
    r = jsondata.content
    r = json.loads(r)
    mypoolsnum = array('i',[])
    for i in r['output']['pools']:
        mypoolsnum.append(i[u'pool'])
    if id not in  mypoolsnum:
        return "Pool not found"

    else:
        for i in range(len(mypoolsnum)):
            if mypoolsnum[i]==id:
                id=i
        return id

def getpoolname(ind, jsondata):

    r = jsondata.json()
    poolname = r['output']['pools'][ind]['pool_name']

    return str(poolname)

def checkpool(pool_id, jsondata):
    skeleton = {'status':'','output':{}}
    if isinstance(pool_id, int):
        ind = getindice(pool_id, jsondata)
        id = ind
        if id == "Pool id not found":
            skeleton['status'] = id
            result = json.dumps(skeleton)
            return Response(result, mimetype='application/json')
        else:
            skeleton['status'] = 'OK'
            result = json.dumps(skeleton)
            return Response(result, mimetype='application/json')   
    if isinstance(pool_id, str):
        r = jsondata.content
        r = json.loads(r)
        mypoolsname = array('i',[])
        for i in r['output']:
            mypoolsname.append(i[u'poolname'])
        if pool_id not in  mypoolsname:
            skeleton['status'] = 'OK'
            result = json.dumps(skeleton)
            return Response(result, mimetype='application/json')   
        else:
            skeleton['status'] = pool_id+'already exits. Please enter a new pool name'
            result = json.dumps(skeleton)
            return Response(result, mimetype='application/json')       

def geterrors(url, methods):
    try:
        if methods == 'GET':
            r = requests.get(url)
        else:
            r = requests.put(url)
    except HTTPError, e:
        return 'Error '+str(r.status_code) 
    else:
        return  'ok'


# @app.route('/pools/', methods=['GET','POST'])
# @app.route('/pools/<int:id>', methods=['GET','DELETE','PUT'])
def pool_manage(id):
    if request.method == 'GET':
        if id == None:

            r = requests.get(url+'/ceph-rest-api/osd/lspools.json')
             
            if r.status_code != 200:
                return Response(r.raise_for_status())
            else:
                r = r.content
                return Response(r, mimetype='application/json')

        else:
            data = requests.get(url+'/ceph-rest-api/osd/dump.json')
            if data.status_code != 200:
                return 'Error '+str(data.status_code)+' on the request getting pools'
            else:

                ind = getindice(id, data)
                id = ind
                skeleton = {'status':'','output':{}}
                if id == "Pool id not found":
                    skeleton['status'] = id
                    result = json.dumps(skeleton)
                    return Response(result, mimetype='application/json')

                else:
                    
                    r = data.content
                    r = json.loads(r)
                    #r = data.json()
                    skeleton['status'] = r['status']
                    skeleton['output'] = r['output']['pools'][id]

                    result = json.dumps(skeleton)
                    return Response(result, mimetype='application/json')

    elif request.method =='POST':
        jsonform = request.form['json']
        newpool = Pools()
        newpool.newpool_attribute(jsonform)
        
        newpool.register()

        jsondata = requests.get(url+'/ceph-rest-api/osd/dump.json')

        r = jsondata.content
        r = json.loads(r)
        #r = jsondata.json()
        nbpool = len(r['output']['pools'])

        poolcreated = Pools()
        poolcreated.savedpool_attribute(nbpool-1, jsondata)

        # set poool parameter

        var_name= ['size', 'min_size', 'crash_replay_interval','crush_ruleset']
        param_to_set_list = [newpool.size, newpool.min_size, newpool.crash_replay_interval, newpool.crush_ruleset]
        default_param_list = [poolcreated.size, poolcreated.min_size, poolcreated.crash_replay_interval, poolcreated.crush_ruleset]

        for i in range(len(default_param_list)):
            if param_to_set_list[i] != default_param_list[i]:
                r = requests.put(url+'/ceph-rest-api/osd/pool/set?pool='+str(poolcreated.name)+'&var='+var_name[i]+'&val='+str(param_to_set_list[i])) 
            else:
                pass
        
        # set object or byte limit on pool
        
        field_name = ['max_objects','max_bytes']
        param_to_set = [newpool.quota_max_objects, newpool.quota_max_bytes]
        default_param = [poolcreated.quota_max_objects, poolcreated.quota_max_bytes]

        for i in range(len(default_param)):
            if param_to_set[i] != default_param[i]:
                r = requests.put(url+'/ceph-rest-api/osd/pool/set-quota?pool='+str(poolcreated.name)+'&field='+field_name[i]+'&val='+str(param_to_set[i])) 
            
            else:
                pass        
        return 'None'

    elif request.method == 'DELETE':
        data = requests.get(url+'/ceph-rest-api/osd/dump.json')
        # if data.status_code != 200:
        #     return 'Error '+str(r.status_code)+' on the request getting pools'
        # else:
        #r = data.json()
        r = data.content
        r = json.loads(r)

        # data = requests.get('http://localhost:8080/ceph-rest-api/osd/dump.json')
        ind = getindice(id, data)
        id = ind

        poolname = r['output']['pools'][id]['pool_name']
        poolname = str(poolname)
        delete_request = requests.put(url+'/ceph-rest-api/osd/pool/delete?pool='+poolname+'&pool2='+poolname+'&sure=--yes-i-really-really-mean-it')
        return str(delete_request.status_code)

    else:

        jsonform = request.form['json']
        newpool = Pools()
        newpool.newpool_attribute(jsonform)
       
        data = requests.get(url+'/ceph-rest-api/osd/dump.json')
        if data.status_code != 200:
            return 'Error '+str(r.status_code)+' on the request getting pools'
        else:
            #r = data.json()
            r = data.content
            r = json.loads(r)
            ind = getindice(id, data)
            savedpool = Pools()
            savedpool.savedpool_attribute(ind, data)

            # rename the poolname

            if str(newpool.name) != str(savedpool.name):
                r = requests.put(url+'/ceph-rest-api/osd/pool/rename?srcpool='+str(savedpool.name)+'&destpool='+str(newpool.name)) 
                      
            # set poool parameter

            var_name= ['size', 'min_size', 'crash_replay_interval','crush_ruleset']
            param_to_set_list = [newpool.size, newpool.min_size, newpool.crash_replay_interval, newpool.crush_ruleset]
            default_param_list = [savedpool.size, savedpool.min_size, savedpool.crash_replay_interval, savedpool.crush_ruleset]

            for i in range(len(default_param_list)):
                if param_to_set_list[i] != default_param_list[i]:
                    r = requests.put(url+'/ceph-rest-api/osd/pool/set?pool='+str(newpool.name)+'&var='+var_name[i]+'&val='+str(param_to_set_list[i])) 
                else:
                    pass
       
            # set object or byte limit on pool
            
            field_name = ['max_objects','max_bytes']
            param_to_set = [newpool.quota_max_objects, newpool.quota_max_bytes]
            default_param = [savedpool.quota_max_objects, savedpool.quota_max_bytes]

            for i in range(len(default_param)):
                if param_to_set[i] != default_param[i]:
                    r = requests.put(url+'/ceph-rest-api/osd/pool/set-quota?pool='+str(newpool.name)+'&field='+field_name[i]+'&val='+str(param_to_set[i])) 
                else:
                    pass        
            return str(r.status_code)

# @app.route('/pools/<int:id>/snapshot', methods=['POST'])
def makesnapshot(id):
    data = requests.get(url+'/ceph-rest-api/osd/dump.json')
    #r = data.json()
    r = data.content
    r = json.loads(r)
    ind = getindice(id,data)
    id = ind

    poolname = r['output']['pools'][id]['pool_name']

    jsondata = request.form['json']
    jsondata = json.loads(jsondata)
    snap = jsondata['snapshot_name']
    r = requests.put(url+'/ceph-rest-api/osd/pool/mksnap?pool='+str(poolname)+'&snap='+str(snap)) 
    return str(r.status_code)

# @app.route('/pools/<int:id>/snapshot/<namesnapshot>', methods=['DELETE'])
def removesnapshot(id, namesnapshot):
    data = requests.get(url+'/ceph-rest-api/osd/dump.json')
    #r = data.json()
    r = data.content
    r = json.loads(r)
    ind = getindice(id,data)
    id = ind

    poolname = r['output']['pools'][id]['pool_name']

    try:
        r = requests.put(url+'/ceph-rest-api/osd/pool/rmsnap?pool='+str(poolname)+'&snap='+str(namesnapshot))
    except HTTPException, e:
        return e    
    else:
        return r.content
