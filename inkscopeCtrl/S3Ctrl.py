__author__ = 'alain.dechorgnat@orange.com'

from flask import Flask, request, Response
from S3.bucket import S3Bucket, S3Error
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
        Log.debug( "modify user with uid "+ uid)
        jsonform = request.form['json']
        return S3User.modify(uid,jsonform,self.getAdminConnection())

    def getUser(self, uid):
        Log.debug( "get user with uid "+ uid)
        return S3User.view(uid,self.getAdminConnection())

    def removeUser(self, uid):
        Log.debug( "remove user with uid "+ uid)
        return S3User.remove(uid,self.getAdminConnection())

    def removeUserKey(self, uid, key):
        Log.debug( "remove key for user with uid "+ uid)
        return S3User.removeKey(key,self.getAdminConnection())

    def createSubuser(self, uid):
        Log.debug( "create subuser for user with uid "+ uid)
        jsonform = request.form['json']
        return S3User.createSubuser(uid,jsonform,self.getAdminConnection())

    def saveCapability(self, uid):
        capType = request.form['type']
        capPerm = request.form['perm']
        Log.debug( "saveCapability "+capType+"="+capPerm+" for user with uid "+ uid)
        return S3User.saveCapability(uid, capType, capPerm, self.getAdminConnection())

    def deleteCapability(self, uid):
        capType = request.form['type']
        capPerm = request.form['perm']
        Log.debug( "deleteCapability "+capType+"="+capPerm+" for user with uid "+ uid)
        return S3User.deleteCapability(uid, capType, capPerm, self.getAdminConnection())

    def deleteSubuser(self, uid, subuser):
        Log.debug( "delete subuser "+subuser+" for user with uid "+ uid)
        return S3User.deleteSubuser(uid, subuser, self.getAdminConnection())

    def createSubuserKey(self, uid, subuser):
        Log.debug( "create key for subuser "+subuser+" for user with uid "+ uid)
        generate_key = request.form['generate_key']
        secret_key = request.form['secret_key']
        return S3User.createSubuserKey(uid, subuser, generate_key, secret_key, self.getAdminConnection())

    def deleteSubuserKey(self, uid, subuser, key):
        Log.debug( "delete key "+key+" for subuser "+subuser+" for user with uid "+ uid)
        return S3User.deleteSubuserKey(uid, subuser, key, self.getAdminConnection())

    def getUserBuckets(self, uid):
        Log.debug( "getBuckets for uid " + uid)
        jsonform = None
        return S3User.getBuckets(uid,jsonform,self.getAdminConnection())


# bucket management

    def getBucketInfo (self, bucket):
        myargs = []
        stats = request.form.get('stats', None)
        if stats is not None:
            myargs.append(("stats",stats))
        if bucket is not None:
            myargs.append(("bucket",bucket))

        conn = self.getAdminConnection()
        request2= conn.request(method="GET", key="bucket", args= myargs)
        res = conn.send(request2)
        info = res.read()
        print info
        return info

    def linkBucket (self,uid, bucket):
        conn = self.getAdminConnection()
        myargs = [("bucket",bucket),("uid",uid)]
        request= conn.request(method="PUT", key="bucket", args= myargs)
        res = conn.send(request)
        info = res.read()
        print info
        return info

    def unlinkBucket (self,uid, bucket):
        conn = self.getAdminConnection()
        myargs = [("bucket",bucket),("uid",uid)]
        request= conn.request(method="POST", key="bucket", args= myargs)
        res = conn.send(request)
        info = res.read()
        print info
        return info

    def deleteBucket (self,bucket):
        conn = self.getAdminConnection()
        myargs = [("bucket",bucket),("purge-objects","True")]
        request= conn.request(method="DELETE", key="bucket", args= myargs)
        res = conn.send(request)
        info = res.read()
        print info
        return info
