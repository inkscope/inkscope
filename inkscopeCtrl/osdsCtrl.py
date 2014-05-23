# Alain Dechorgnat
# 05/19/2014

from flask import Flask, request, Response
import json
import requests
from array import *


def getCephRestApiUrl(request):
    # discover ceph-rest-api URL
    return request.url_root.replace("inkscopeCtrl","ceph-rest-api")

class Osds:
    """docstring for Osds"""
    def __init__(self):
        pass

def osds_manage(id):
    cephRestApiUrl = getCephRestApiUrl(request);
    action = request.form.get("action","none");
    if action == "reweight-by-utilisation" :
        print "reweight-by-utilisation"
        r = requests.put(cephRestApiUrl+'osd/reweight-by-utilization')
        print str(r.content)
        return str(r.content)
    else :
        print "unknown command"
