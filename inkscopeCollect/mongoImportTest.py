import mongodbHelper
import json

db = mongodbHelper.client.ceph
db
collection =db.etest
collection

etest_json=open('dump.json')
data_etest = json.load(etest_json)
db.etest.insert(data_etest)
