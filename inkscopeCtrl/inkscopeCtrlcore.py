# Alpha O. Sall
# 03/24/2014

from flask import Flask, request, Response, render_template
app = Flask(__name__)#,template_folder='/var/www/inkscope/inkscopeAdm/')

import requests
from array import *
import sys
from urllib2 import HTTPError
import json
from bson.json_util import dumps
import time
import mongoJuiceCore
import poolsCtrl
#import poolsCtrlSalt
import osdsCtrl
from S3Ctrl import S3Ctrl, S3Error
from Log import Log


# Load configuration from file
configfile = "/opt/inkscope/etc/inkscopeCtrl.conf"
datasource = open(configfile, "r")
conf = json.load(datasource)
datasource.close()
#minion = conf.get("minion")
#
# mongoDB query facility
#

@app.route('/<db>/<collection>', methods=['GET', 'POST'])
def find(db, collection):
    return mongoJuiceCore.find(conf, db, collection)

@app.route('/<db>', methods=['POST'])
def full(db):
    return mongoJuiceCore.full(conf, db)

#
# Pools management
#
## Ceph Rest API

@app.route('/pools/', methods=['GET','POST'])
@app.route('/pools/<int:id>', methods=['GET','DELETE','PUT'])
def pool_manage(id=None):
    return poolsCtrl.pool_manage(id)

@app.route('/pools/<int:id>/snapshot', methods=['POST'])
def makesnapshot(id):
    return poolsCtrl.makesnapshot(id)

@app.route('/pools/<int:id>/snapshot/<namesnapshot>', methods=['DELETE'])
def removesnapshot(id, namesnapshot):
    return poolsCtrl.removesnapshot(id, namesnapshot)

## Rest API with Salt
#@app.route('/poolsalt/', methods=['GET','POST'])
#@app.route('/poolsalt/<int:id>', methods=['GET','DELETE','PUT'])
#def pool_manage_salt(id=None):
#    return poolsCtrlSalt.pool_manage_salt(id, minion)

#@app.route('/poolsalt/<int:id>/snapshot', methods=['POST'])
#def makesnapshot_salt(id):
#    return poolsCtrl.makesnapshot(id, minion)

#@app.route('/poolsalt/<int:id>/snapshot/<namesnapshot>', methods=['DELETE'])
#def removesnapshot_salt(id, namesnapshot):
#    return poolsCtrl.removesnapshot(id, namesnapshot, minion)

#
# Osds management
#

@app.route('/osds', methods=['PUT'])
def osds_manage(id=None):
    return osdsCtrl.osds_manage(id)


#
# Object storage management
#

# User management
@app.route('/S3/user', methods=['GET'])
def listUser():
    try :
        return Response(S3Ctrl(conf).listUsers(),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/user', methods=['POST'])
def createUser():
    try:
        return Response(S3Ctrl(conf).createUser(),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/user/<string:uid>', methods=['GET'])
def getUser(uid):
    try :
        return Response(S3Ctrl(conf).getUser(uid),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/user/<string:uid>', methods=['PUT'])
def modifyUser(uid):
    try :
        return Response(S3Ctrl(conf).modifyUser(uid),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/user/<string:uid>', methods=['DELETE'])
def removeUser(uid):
    try :
        return Response(S3Ctrl(conf).removeUser(uid),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)


@app.route('/S3/user/<string:uid>/key/<string:key>', methods=['DELETE'])
def removeUserKey(uid,key):
    try :
        return Response(S3Ctrl(conf).removeUserKey(uid,key),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/user/<string:uid>/subuser', methods=['PUT'])
def createSubuser(uid):
    try :
        return Response(S3Ctrl(conf).createSubuser(uid),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/user/<string:uid>/subuser/<string:subuser>', methods=['DELETE'])
def deleteSubuser(uid, subuser):
    try :
        return Response(S3Ctrl(conf).deleteSubuser(uid, subuser),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)


@app.route('/S3/user/<string:uid>/subuser/<string:subuser>/key', methods=['PUT'])
def createSubuserKey(uid, subuser):
    Log.debug("createSubuserKey")
    try :
        return Response(S3Ctrl(conf).createSubuserKey(uid, subuser),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/user/<string:uid>/subuser/<string:subuser>/key/<string:key>', methods=['DELETE'])
def deleteSubuserKey(uid, subuser, key):
    Log.debug("deleteSubuserKey")
    try :
        return Response(S3Ctrl(conf).deleteSubuserKey(uid, subuser,key),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/user/<string:uid>/caps', methods=['PUT', 'POST'])
def saveCapability(uid):
    Log.debug("saveCapability")
    try :
        return Response(S3Ctrl(conf).saveCapability(uid),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/user/<string:uid>/caps', methods=['DELETE'])
def deleteCapability(uid):
    Log.debug("deleteCapability")
    try :
        return Response(S3Ctrl(conf).deleteCapability(uid),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

# bucket management

@app.route('/S3/user/<string:uid>/buckets', methods=['GET'])
def getUserBuckets(uid,bucket=None):
    try :
        return Response(S3Ctrl(conf).getUserBuckets(uid),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)


@app.route('/S3/bucket', methods=['PUT'])
def createBucket():
    try :
        return Response(S3Ctrl(conf).createBucket(), mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)


@app.route('/S3/bucket', methods=['GET'])
def getBuckets():
    try :
        return Response(S3Ctrl(conf).getBucketInfo(None), mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/bucket/<string:bucket>', methods=['GET'])
def getBucketInfo(bucket=None):
    try :
        return Response(S3Ctrl(conf).getBucketInfo(bucket), mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/bucket/<string:bucket>', methods=['DELETE'])
def deleteBucket(bucket):
    try :
        return Response(S3Ctrl(conf).deleteBucket(bucket), mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

@app.route('/S3/bucket/<string:bucket>/link', methods=['DELETE','PUT'])
def linkBucket(bucket):
    try :
        uid = request.form['uid']
        if request.method =='PUT':
            return Response(S3Ctrl(conf).linkBucket(uid, bucket), mimetype='application/json')
        else:
            return Response(S3Ctrl(conf).unlinkBucket(uid, bucket), mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

