__author__ = 'alain.dechorgnat@orange.com'

from flask import Flask, request, Response
from S3.bucket import S3Bucket, S3Error
from S3.user import  S3User
from Log import Log
import json

import boto
import boto.s3.connection
from boto.exception import S3PermissionsError
#import boto3
from InkscopeError import InkscopeError

class S3Ctrl:

    def __init__(self,conf):
        self.admin = conf.get("radosgw_admin", "admin")
        self.key = conf.get("radosgw_key", "")
        self.secret = conf.get("radosgw_secret", "")
        self.radosgw_url = conf.get("radosgw_url", "127.0.0.1")
	self.radosgw_endpoint = conf.get("radosgw_endpoint","")
        self.secure = self.radosgw_url.startswith("https://")

        if not self.radosgw_url.endswith('/'):
            self.radosgw_url += '/'
        self.url = self.radosgw_url + self.admin
        #print "config url: "+self.url
        #print "config admin: "+self.admin
        #print "config key: "+self.key
        #print "config secret: "+self.secret

    def connectS3(self):
	#boto
	conn = boto.connect_s3(
	    aws_access_key_id = self.key,
	    aws_secret_access_key = self.secret,
	    host = self.radosgw_endpoint,
	    is_secure=False,               # comment if you are using ssl
	    calling_format = boto.s3.connection.OrdinaryCallingFormat(),
	)
	#boto3 ## for the future migration
#	s3_resource = boto3.resource('s3')
#	iam = boto3.resource('iam',i
#	    aws_access_key_id=self.key
#	    aws_secret_access_key=self.secret,
#	)
	return conn

    def getAdminConnection(self):
        return S3Bucket(self.admin, access_key=self.key, secret_key=self.secret , base_url= self.url, secure= self.secure)

    def getBucket(self,bucketName):
        return S3Bucket(bucketName, access_key=self.key, secret_key=self.secret , base_url= self.radosgw_url +bucketName, secure= self.secure)

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

    def deleteSubuserKey(self, uid, subuser):
        Log.debug( "delete key for subuser "+subuser+" for user with uid "+ uid)
        return S3User.deleteSubuserKey(uid, subuser, self.getAdminConnection())

    def getUserBuckets(self, uid):
        Log.debug( "getBuckets for uid " + uid)
        jsonform = None
        return S3User.getBuckets(uid,jsonform,self.getAdminConnection())


# bucket management

    def createBucket(self):
        bucket = request.form['bucket']
        owner = request.form['owner']
	acl = request.form['acl']

        Log.debug( "createBucket "+bucket+" for user "+owner+" with acl "+acl)
        print "\n--- info user for owner ---"
        userInfo = self.getUser(owner)
        #print userInfo
        userInfo = json.loads(userInfo)
        keys = userInfo.get('keys')
        #print keys
        access_key = keys[0].get('access_key')
        secret_key = keys[0].get('secret_key')
        #print access_key
        #print secret_key

        print "\n--- create bucket for owner ---"
        mybucket = S3Bucket(bucket, access_key=access_key, secret_key=secret_key , base_url= self.radosgw_url+bucket, secure= self.secure)
	res = mybucket.put_bucket(acl=acl)
	return 'OK'

    def getUserAccess(self, bucketName, user):
	conn = self.connectS3()
	mybucket = conn.get_bucket(bucketName, validate=False)

	bucket_acl = mybucket.get_acl()
	print "getting "+user+" access to "+bucketName

	perm = ""
	for grant in bucket_acl.acl.grants:
	    if grant.id == user:
		if perm == "":
		    perm =  grant.permission
		else:
		    perm = perm + ", " + grant.permission
	if perm == "":
	    perm = "none"

	return perm

    def getBucketACL(self, bucketName):
	conn = self.connectS3()
	mybucket = conn.get_bucket(bucketName, validate=False)
	#validate=False if you are sure the bucket exists
	#validate=true to make a request to check if it exists first

	### getting everything needed
	usersdata = self.listUsers()
	userList = json.loads(usersdata)
	bucket_acl = mybucket.get_acl() # bucket_acl do not mention every user
	print "getting "+bucketName+" ACL"

	### building the JSON file
	mylist = []
	grantGroup = ""
	for user in userList:
	    obj = {}
	    obj['uid'] = user['uid']
	    obj['type'] = "user"
	    obj['permission'] = ""

	    for grant in bucket_acl.acl.grants:
		# checking if there is a group in the ACL and saving it
		if grant.type == 'Group':
		    if grant.uri.endswith("AllUsers"):
			grantGroup = "all"
			groupPerm = grant.permission
		    else: # if AuthenticatedUsers
			grantGroup = "auth"
			groupPerm = grant.permission

		# getting permission(s)
		if grant.id == user['uid']:
		    if obj['permission'] == "":
			obj['permission'] =  grant.permission
		    else:
			obj['permission'] = obj['permission'] + ", " + grant.permission

	    if obj['permission'] == "":
		obj['permission'] = "none"
	    mylist.append(obj)

	# need to set groups manually 
	allUsers = {}
	allUsers['uid'] = "AllUsers"
	allUsers['type'] = "group"
	authUsers = {}
	authUsers['uid'] = "AuthenticatedUsers"
	authUsers['type'] = "group"
	if grantGroup == "":
	    allUsers['permission'] = "none"
	    authUsers['permission'] = "none"
	elif grantGroup == "all":
	    allUsers['permission'] = groupPerm
	    authUsers['permission'] = "none"
	else: #if grantGroup == "auth"
	    allUsers['permission'] = "none"
	    authUsers['permission'] = groupPerm
	mylist.append(allUsers)
	mylist.append(authUsers)

	print 'Complete access list : [%s]' % ', '.join(map(str, mylist))
	return json.dumps(mylist)

    def grantGroupAccess (self, bucket, bucketName, bucketACL):
	bucketInfo = self.getBucketInfo(bucketName)
	bucketInfo = json.loads(bucketInfo)
	owner = bucketInfo.get('owner')
	#print "owner : "+owner
	for grant in bucketACL.acl.grants:
	    if grant.id != owner: #no need to grant access to the owner
		userInfo = self.getUser(grant.id)
		userInfo = json.loads(userInfo)
		email = userInfo.get('email')
		#print "id : "+grant.id
		#print "mail : "+email
		bucket.add_email_grant(permission=grant.permission, email_address=email)

    def grantAccess (self, user, bucketName):
	msg = "no message"
	access = request.form['access']
	email = request.form['email']

	conn = self.connectS3()
	mybucket = conn.get_bucket(bucketName, validate=False)
	bucket_acl = mybucket.get_acl()

	group = ""
	granted = ""
	for grant in bucket_acl.acl.grants:
	    if grant.id == user: #checking if the user already has access
		if (grant.permission == access) or (grant.permission == "FULL_CONTROL"):
		    granted = grant.permission
	    if grant.type == 'Group': #checking if a group has access
		group = grant.uri

	### granting access
	# using canned ACLs when granting access to a group of users
	if email == "all":
	    if group != "": #if a group as access to the bucket
		if group.endswith("AllUsers"): #if this group is AllUsers
		    raise InkscopeError("error1", 400) #shouldn't happen
		else: #if this group is AuthenticatedUsers
		    raise InkscopeError("error2", 400)
	    else: #if there's no group : grant access
		mybucket.set_canned_acl("public-read")
		self.grantGroupAccess(mybucket, bucketName, bucket_acl)
		return "ok"
	elif email == "auth":
	    if group != "":
		if group.endswith("AllUsers"):
		    raise InkscopeError("error2", 400)
		else:
		    raise InkscopeError("error1", 400)
	    else:
		mybucket.set_canned_acl("authenticated-read")
		self.grantGroupAccess(mybucket, bucketName, bucket_acl)
		return "ok"
	else : #if it's a single user
	    if granted == access:
		raise InkscopeError("error1", 400)
	    else:
		if granted == "FULL_CONTROL":
		    raise InkscopeError("error3", 400)
		elif access == "FULL_CONTROL":
		    msg = self.revokeAccess(user, bucketName)
		    mybucket.add_email_grant(permission=access, email_address=email)
		else :
		    mybucket.add_email_grant(permission=access, email_address=email)
		    msg = "ok"
		return msg

    def revokeAccess(self, user, bucketName):
	conn = self.connectS3()
	bucket = conn.get_bucket(bucketName, validate=False)
	bucketACL = bucket.get_acl()

	new_grants = []
	for grantee in bucketACL.acl.grants:
	    if (user == "AllUsers") or (user =="AuthenticatedUsers"): #if revoking a group's access
		if grantee.type != "Group": #no groups in the acl
		    new_grants.append(grantee)
	    else : #if revoking a user's access
		if grantee.id != user:
		    new_grants.append(grantee)
	bucketACL.acl.grants = new_grants

	bucket.set_acl(bucketACL)
	return "ok"

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
        print "BucketInfo : "+info
        return info

    def linkBucket (self,uid, bucket):
        conn = self.getAdminConnection()
        myargs = [("bucket",bucket),("uid",uid)]
        request= conn.request(method="PUT", key="bucket", args= myargs)
        res = conn.send(request)
        info = res.read()
        print info
        return info

    def listBucket (self, bucketName):
        myargs = []
        if bucketName is not None:
            myargs.append(("bucket",bucketName))
        conn = self.getAdminConnection()
        request2= conn.request(method="GET", key="bucket", args= myargs)
        res = conn.send(request2)
        bucketInfo = json.loads(res.read())
        print bucketInfo
        owner = bucketInfo.get('owner')
        userInfo = self.getUser(owner)
        print userInfo
        userInfo = json.loads(userInfo)
        keys = userInfo.get('keys')
        print keys
        access_key = keys[0].get('access_key')
        secret_key = keys[0].get('secret_key')
        bucket = S3Bucket(bucketName, access_key=access_key, secret_key=secret_key , base_url= self.radosgw_url+bucketName, secure= self.secure)
        list = []
        for (key, modify, etag, size) in bucket.listdir():
            obj = {}
            obj['name'] = key
            obj['size'] = size
            list.append(obj)
            print "%r (%r) is size %r, modified %r" % (key, etag, size, modify)
        return json.dumps(list)

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
