__author__ = 'alain.dechorgnat@orange.com'

from flask import Flask, request, Response
from S3.bucket import S3Bucket
from S3.user import  S3User
from Log import Log


class S3Ctrl:

    def __init__(self,conf):
        self.admin = conf.get("radosgw_admin", "admin")
        self.key = conf.get("radosgw_key", "")
        self.secret = conf.get("radosgw_secret", "")
        self.url = conf.get("radosgw_url", "127.0.0.1")

        if not self.url.endswith('/'):
            self.url += '/'
        self.url += self.admin
        print "config url: "+self.url
        print "config admin: "+self.admin
        print "config key: "+self.key
        print "config secret: "+self.secret

    def getAdminConnection(self):
        return S3Bucket(self.admin, access_key=self.key, secret_key=self.secret , base_url= self.url)

    def listUsers(self):
        Log.debug( "list users from rgw api")
        return S3User.list(self.getAdminConnection())

    def createUser(self):
        Log.debug( "user creation")
        jsonform = request.form['json']
        return S3User.create(jsonform,self.getAdminConnection())

    def modifyUser(self, uid):
        Log.debug( "get user with uid "+ uid)
        jsonform = request.form['json']
        return S3User.modify(uid,jsonform,self.getAdminConnection())

    def getUser(self, uid):
        Log.debug( "get user with uid "+ uid)
        return S3User.view(uid,self.getAdminConnection())

    def removeUser(self, uid):
        Log.debug( "remove user with uid "+ uid)
        return S3User.remove(uid,self.getAdminConnection())

    def getUserBuckets(self, uid):
        Log.debug( "getBuckets for uid " + uid)
        jsonform = None
        return S3User.getBuckets(uid,jsonform,self.getAdminConnection())

    def getCephBucket(self, bucket):
        Log.debug( "getCephBucket for bucket " + bucket)
        jsonform = None
        return self.getBucketInfo(bucket,jsonform,self.getAdminConnection())


    def getBucketInfo (self,bucket, jsonform, conn):
        myargs = [("bucket",bucket),("stats","True")]
        request= conn.request(method="GET", key="bucket", args= myargs)
        res = conn.send(request)
        info = res.read()
        print info
        return info