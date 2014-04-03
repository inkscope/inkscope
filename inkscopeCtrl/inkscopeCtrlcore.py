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

@app.route('/<db>/<collection>', methods=['GET', 'POST'])
def find(db, collection):
    return mongoJuiceCore.find(db, collection)

@app.route('/<db>', methods=['POST'])
def full(db):
    return mongoJuiceCore.full(db)

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




































