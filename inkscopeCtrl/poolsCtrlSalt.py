# Alpha O. Sall
# 07/2014

from flask import Flask, request, Response
import json
import requests
from array import *
import salt.client
local = salt.client.LocalClient()

def getCephRestApiUrl(request):
    # discover ceph-rest-api URL
    return request.url_root.replace("inkscopeCtrl","ceph-rest-api")

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

def getpoolname(ind, jsondata):
    r = jsondata.json()
    poolname = r['output']['pools'][ind]['pool_name']

    return str(poolname)

def create_pool(poolname, pg_num, pgp_num,minion):
    cmd = local.cmd(minion,'cmd.run',['ceph osd pool create %s %d %d' % (poolname, pg_num, pgp_num)])
    return 'salt-run last job id'

def set_pool_values(poolname, **kwargs):
    minion ='v-intceph06'
    for key in kwargs:
        cmd = local.cmd(minion,'cmd.run',['ceph osd pool set %s %s %d' % (poolname, key, kwargs[key])])
        return 'salt-run last job id'

def set_pool_quotas(poolname, **kwargs):
    minion ='v-intceph06'
    for key, value in kwargs.iteritems():

        cmd = local.cmd(minion,'cmd.run',['ceph osd pool set-quota %s %s %d' % (poolname, key, value)])
        return 'salt-run last job id'

def del_pool(poolname, minion):
    cmd = local.cmd(minion,'cmd.run',['ceph osd pool delete %s %s --yes-really-really-mean-it' % (poolname, poolname)])
    return 'salt-run last job id'


# @app.route('/poolsalt/', methods=['GET','POST'])
# @app.route('/poolsalt/<int:id>', methods=['GET','DELETE','PUT'])
def pool_manage_salt(id, minion):
    if request.method == 'GET':
        if id == None:

            my_cmd = local.cmd(minion,'cmd.run',['ceph osd lspools --format=json'])
            list_pools = json.loads(my_cmd[minion])
          
            skeleton = {'status':'OK','output':[]}
            for i in list_pools:
                skeleton['output'].append(i) 
            result = json.dumps(skeleton)        
            return Response(result, mimetype='application/json')  

        else:
            cmd = local.cmd(minion,'cmd.run',['ceph osd dump --format=json'])
            result = json.loads(cmd[minion])
            all_pools = result['pools']
            skeleton = {'status':'OK','output':''}
            for i in range(len(all_pools)):
                if id == all_pools[i]['pool']:
                    indice = i
                    break
            try:
                skeleton = {'status':'OK','output':all_pools[indice]}
                the_pool = json.dumps(skeleton)
                return Response(the_pool, mimetype='application/json')
            except UnboundLocalError:
                return 'Pool id not found'

    elif request.method =='POST':
        jsonform = request.form['json']
        newpool = Pools()
        newpool.newpool_attribute(jsonform)

        a=create_pool(newpool.name, newpool.pg_num, newpool.pgp_num, minion)
        kwargs = {'size':newpool.size, 'min_size':newpool.min_size, 'crash_replay_interval':newpool.crash_replay_interval,'crush_ruleset':newpool.crush_ruleset}
        b=set_pool_values(newpool.name, **kwargs)
        quotas = {'max_objects':newpool.quota_max_objects, 'max_bytes': newpool.quota_max_bytes}
        c=set_pool_quotas(newpool.name, **quotas)
        return c

    elif request.method == 'DELETE':
        cmd = local.cmd(minion,'cmd.run',['ceph osd lspools --format=json'])
        result = json.loads(cmd[minion])
        for i in range(len(result)):
            if id == result[i]['poolnum']:
                poolname = str(result[i]['poolname'])
                    
        e=del_pool(str(poolname), minion)
        return e

    else:
        # jsonform = request.form['json']
        # newpool = Pools()
        # newpool.newpool_attribute(jsonform)
        #
        # a=rename_pool(newpool.name, newpool.pg_num, newpool.pgp_num, minion)
        # kwargs = {'size':newpool.size, 'min_size':newpool.min_size, 'crash_replay_interval':newpool.crash_replay_interval,'crush_ruleset':newpool.crush_ruleset}
        # b=set_pool_values(newpool.name, **kwargs)
        # quotas = {'max_objects':newpool.quota_max_objects, 'max_bytes': newpool.quota_max_bytes}
        # c=set_pool_quotas(newpool.name, **quotas)
        # return c

        data = requests.get(cephRestApiUrl+'osd/dump.json')
        if data.status_code != 200:
            return 'Error '+str(data.status_code)+' on the request getting pools'
        else:
            #r = data.json()
            r = data.content
            r = json.loads(r)
            ind = getindice(id, data)
            savedpool = Pools()
            savedpool.savedpool_attribute(ind, data)

            # rename the poolname

            if str(newpool.name) != str(savedpool.name):
                r = requests.put(cephRestApiUrl+'osd/pool/rename?srcpool='+str(savedpool.name)+'&destpool='+str(newpool.name))

            # set pool parameter

            var_name= ['size', 'min_size', 'crash_replay_interval','pg_num','pgp_num','crush_ruleset']
            param_to_set_list = [newpool.size, newpool.min_size, newpool.crash_replay_interval, newpool.pg_num, newpool.pgp_num, newpool.crush_ruleset]
            default_param_list = [savedpool.size, savedpool.min_size, savedpool.crash_replay_interval, savedpool.pg_num, savedpool.pgp_num, savedpool.crush_ruleset]

            for i in range(len(default_param_list)):
                if param_to_set_list[i] != default_param_list[i]:
                    r = requests.put(cephRestApiUrl+'osd/pool/set?pool='+str(newpool.name)+'&var='+var_name[i]+'&val='+str(param_to_set_list[i]))
                else:
                    pass

            # set object or byte limit on pool

            field_name = ['max_objects','max_bytes']
            param_to_set = [newpool.quota_max_objects, newpool.quota_max_bytes]
            default_param = [savedpool.quota_max_objects, savedpool.quota_max_bytes]

            for i in range(len(default_param)):
                if param_to_set[i] != default_param[i]:
                    r = requests.put(cephRestApiUrl+'osd/pool/set-quota?pool='+str(newpool.name)+'&field='+field_name[i]+'&val='+str(param_to_set[i]))
                else:
                    pass
            return str(r.status_code)

def makesnapshot_salt(id, minion):
    cephRestApiUrl = getCephRestApiUrl(request);
    data = requests.get(cephRestApiUrl+'osd/dump.json')
    #r = data.json()
    r = data.content
    r = json.loads(r)
    ind = getindice(id,data)
    id = ind

    poolname = r['output']['pools'][id]['pool_name']

    jsondata = request.form['json']
    jsondata = json.loads(jsondata)
    snap = jsondata['snapshot_name']
    r = requests.put(cephRestApiUrl+'osd/pool/mksnap?pool='+str(poolname)+'&snap='+str(snap))
    return str(r.status_code)


def removesnapshot_salt(id, namesnapshot, minion):
    cephRestApiUrl = getCephRestApiUrl(request);
    data = requests.get(cephRestApiUrl+'osd/dump.json')
    #r = data.json()
    r = data.content
    r = json.loads(r)
    ind = getindice(id,data)
    id = ind

    poolname = r['output']['pools'][id]['pool_name']

    try:
        r = requests.put(cephRestApiUrl+'osd/pool/rmsnap?pool='+str(poolname)+'&snap='+str(namesnapshot))
    except HTTPException, e:
        return e
    else:
        return r.content