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
from S3Ctrl import S3Ctrl, S3Error
from Log import Log


# Load configuration from file
configfile = "/opt/inkscope/etc/inkscopeCtrl.conf"
datasource = open(configfile, "r")
conf = json.load(datasource)
datasource.close()

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

@app.route('/S3/user/<string:uid>/buckets', methods=['GET'])
def getUserBuckets(uid,bucket=None):
    try :
        return Response(S3Ctrl(conf).getUserBuckets(uid),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)

# bucket management

@app.route('/S3/bucket/<string:bucket>', methods=['GET'])
def getBucketInfo(bucket):
    try :
        return Response(S3Ctrl(conf).getCephBucket(bucket),mimetype='application/json')
    except S3Error , e:
        Log.err(e.__str__())
        return Response(e.reason, status=e.code)


