__author__ = 'alain.dechorgnat@orange.com'

# Copyright (c) 2014, Alain Dechorgnat
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
#  * Redistributions of source code must retain the above copyright notice, this
#    list of conditions and the following disclaimer.
#
#  * Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
# ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


from Log import Log
import json

class S3User:

    def __init__(self):
        pass

    @staticmethod
    def create(jsonUserData , conn):
        # Content of jsonUserData :
        # --------------------
        # uid /	The S3User ID to be created./ String / Required
        # display-name / The display name of the user to be created. / String / Required
        # email / The email address associated with the user./ String / not required
        # key-type / Key type to be generated, options are: swift, s3 (default). / String / not required
        # access-key / Specify access key./ String / not required
        # secret-key / Specify secret key./ String / not required
        # user-caps	/ User capabilities / String : Example:	usage=read, write; users=read / not required
        # generate-key / Generate a new key pair and add to the existing keyring./Boolean Example:	True [True]/ not required
        # max-buckets / Specify the maximum number of buckets the user can own. / Integer / not required
        # suspended / Specify whether the user should be suspended / Boolean Example:	False [False] / not required
        self = S3User()
        Log.debug("User creation input parameters : json="+jsonUserData)
        userData = json.loads(jsonUserData)
        self.uid = userData.get('uid', None)
        self.displayName = userData.get('display_name', None)
        self.email = userData.get('email',None)
        self.keyType = userData.get('key_type', None)
        self.access = userData.get('access_key', None)
        self.secret = userData.get('secret_key', None)
        self.caps = userData.get('user_caps', None)
        self.generate = userData.get('generate_key', None)
        self.maxBuckets = userData.get('max_buckets', None)
        self.suspended = userData.get('suspended', None)
        myargs = []
        myargs.append(("uid",self.uid))
        myargs.append(("display-name",self.displayName))
        if self.email is not None :
            myargs.append(("email",self.email))
        if self.keyType is not None :
            myargs.append(("key-type",self.keyType))
        if self.access is not None :
            myargs.append(("access-key",self.access))
        if self.secret is not None :
            myargs.append(("secret-key",self.secret))
        if self.caps is not None :
            myargs.append(("user-caps",self.caps))
        if self.generate is not None :
            myargs.append(("generate-key",self.generate))
        if self.maxBuckets is not None :
            myargs.append(("max-buckets",self.maxBuckets.__str__()))
        if self.suspended is not None :
            myargs.append(("suspended",self.suspended))

        Log.debug(myargs.__str__())

        request= conn.request(method="PUT", key="user", args= myargs)
        res = conn.send(request)
        user = res.read()
        Log.debug(user)
        Log.debug("Created User : "+user)
        # if needed, create swift subuser
        create_swift_subuser=userData.get('create_swift_subuser', 'False')
        Log.debug("create_swift_subuser = "+create_swift_subuser)
        if create_swift_subuser == 'True':
            subuser=userData.get('subuser', None)
            subuser_access=userData.get('subuser_access', "full")
            subuser_generate_key=userData.get('subuser_generate_key', 'True')
            subuser_secret_key = None;
            if subuser_generate_key=='False':
                subuser_secret_key=userData.get('subuser_secret_key', None)
            myargs = []
            myargs.append(("gen-subuser",""))
            myargs.append(("uid",self.uid))
            myargs.append(("access",subuser_access))
            if subuser is not None :
                myargs.append(("subuser",subuser))
            if subuser_secret_key is not None :
                myargs.append(("secret-key",subuser_secret_key))
            Log.debug(myargs.__str__())
            request= conn.request(method="PUT", key="user", args= myargs)
            res = conn.send(request)
            subusers = res.read()
            Log.debug(subusers.__str__())
        return user

    @staticmethod
    def modify(uid, jsonUserData , conn):
        # Content of jsonUserData :
        # --------------------
        # display-name / The display name of the user to be created. / String / Required
        # email / The email address associated with the user./ String / not required
        # key-type / Key type to be generated, options are: swift, s3 (default). / String / not required
        # access-key / Specify access key./ String / not required
        # secret-key / Specify secret key./ String / not required
        # user-caps	/ User capabilities / String : Example:	usage=read, write; users=read / not required
        # generate-key / Generate a new key pair and add to the existing keyring./Boolean Example:	True [True]/ not required
        # max-buckets / Specify the maximum number of buckets the user can own. / Integer / not required
        # suspended / Specify whether the user should be suspended / Boolean Example:	False [False] / not required

        self = S3User()
        Log.debug("User modification input parameters : json="+jsonUserData)
        userData = json.loads(jsonUserData)
        self.uid = uid
        self.displayName = userData.get('display_name', None)
        self.email = userData.get('email',None)
        self.maxBuckets = userData.get('max_buckets', None)
        self.suspended = userData.get('suspended', None)
        # self.keyType = userData.get('key_type', None)
        self.access = userData.get('access_key', None)
        self.secret = userData.get('secret_key', None)
        # self.caps = userData.get('user_caps', None)
        self.generate = userData.get('generate_key', None)
        myargs = []
        myargs.append(("uid",self.uid))
        if self.displayName is not None :
            myargs.append(("display-name",self.displayName))
        if self.email is not None :
            myargs.append(("email",self.email))
        # if self.keyType is not None :
        #     myargs.append(("key-type",self.keyType))
        # if self.access is not None :
        #     myargs.append(("access-key",self.access))
        # if self.secret is not None :
        #     myargs.append(("secret-key",self.secret))
        # if self.caps is not None :
        #     myargs.append(("user-caps",self.caps))
        if self.generate is not None :
            myargs.append(("generate-key",self.generate))
        else:
            if self.access is not None and self.secret is not None :
                myargs.append(("access-key",self.access))
                myargs.append(("secret-key",self.secret))

        if self.maxBuckets is not None :
            myargs.append(("max-buckets",self.maxBuckets.__str__()))
        if self.suspended is not None :
            myargs.append(("suspended",self.suspended))

        Log.debug("Modify user : "+myargs.__str__())

        request= conn.request(method="POST", key="user", args= myargs)
        res = conn.send(request)
        user = res.read()

        return user

    @staticmethod
    def view(uid , conn):
        # uid /	The user ID to view./ String / Required
        request= conn.request(method="GET", key="user", args=[("uid",uid)])
        res = conn.send(request)
        userInfo =  res.read()
        return userInfo

    @staticmethod
    def remove(uid , conn):
        # uid /	The user ID to view./ String / Required
        request= conn.request(method="DELETE", key="user", args=[("uid",uid),("purge-data","True")])
        res = conn.send(request)
        userInfo =  res.read()
        return userInfo

    @staticmethod
    def removeKey(key , conn):
        request= conn.request(method="DELETE", key="user", args=[("key",""),("access-key",key)])
        res = conn.send(request)
        userInfo =  res.read()
        print userInfo.__str__()
        return userInfo.__str__()

    @staticmethod
    def list( conn ):
        request= conn.request(method="GET", key="metadata/user")
        res = conn.send(request)
        data = json.loads(res.read())
        userList = []
        for userId in data:
            userList.append({"uid": userId , "display_name": userId})
        print "User list : "+userList.__str__()
        return json.dumps(userList)


    @staticmethod
    def createSubuser(uid, jsonSubuserData , conn):
        self = S3User()
        subuserData = json.loads(jsonSubuserData)
        self.uid = uid
        self.subuser = subuserData.get('subuser', None)
        self.secret_key = subuserData.get('secret_key', None)
        self.access = subuserData.get('access',None)

        myargs = []
        myargs.append(("gen-subuser",""))
        myargs.append(("uid",self.uid))
        myargs.append(("access",self.access))
        if self.subuser is not None :
            myargs.append(("subuser",self.subuser))
        if self.secret_key is not None :
            myargs.append(("secret-key",self.secret_key))
        else:
            myargs.append(("generate-secret","True"))
        Log.debug(myargs.__str__())
        request= conn.request(method="PUT", key="user", args= myargs)
        res = conn.send(request)
        subusers = res.read()
        Log.debug(subusers.__str__())
        return subusers.__str__()

    @staticmethod
    def saveCapability(uid, type, perm , conn):
        myargs = []
        myargs.append(("caps",""))
        myargs.append(("uid",uid))
        myargs.append(("user-caps",type+"="+perm))
        Log.debug(myargs.__str__())
        request= conn.request(method="PUT", key="user", args= myargs)
        res = conn.send(request)
        caps = res.read()
        Log.debug(caps.__str__())
        return caps.__str__()

    @staticmethod
    def deleteCapability(uid, type, perm , conn):
        myargs = []
        myargs.append(("caps",""))
        myargs.append(("uid",uid))
        myargs.append(("user-caps",type+"="+perm))
        Log.debug(myargs.__str__())
        request= conn.request(method="DELETE", key="user", args= myargs)
        res = conn.send(request)
        caps = res.read()
        Log.debug(caps.__str__())
        return caps.__str__()

    @staticmethod
    def deleteSubuser(uid, subuser , conn):
        myargs = []
        myargs.append(("subuser",subuser))
        myargs.append(("uid", uid))
        Log.debug(myargs.__str__())
        request= conn.request(method="DELETE", key="user", args= myargs)
        res = conn.send(request)
        return "";

    @staticmethod
    def createSubuserKey(uid, subuser , generate_key, secret_key, conn):
        myargs = []
        myargs.append(("key",""))
        myargs.append(("uid", uid))
        myargs.append(("subuser",subuser))
        myargs.append(("key-type", "swift"))
        if (generate_key=='True'):
            myargs.append(("generate-key", 'True'))
        else:
            myargs.append(("secret-key", secret_key))
        Log.debug(myargs.__str__())
        request= conn.request(method="PUT", key="user", args= myargs)
        Log.debug(request.__str__())
        res = conn.send(request)
        return "";

    @staticmethod
    def deleteSubuserKey(uid, subuser , key, conn):
        myargs = []
        myargs.append(("subuser",subuser))
        myargs.append(("uid", uid))
        myargs.append(("key-type", "swift"))
        myargs.append(("secret-key", key))
        Log.debug(myargs.__str__())
        request= conn.request(method="DELETE", key="user", args= myargs)
        res = conn.send(request)
        return "";

    @staticmethod
    def getBuckets (uid , jsonData, conn):
        # Content of jsonData :
        # --------------------
        # stats / Specify whether the stats should be returned / Boolean Example:	False [False] / not required

        self = S3User()
        if jsonData is not None :
            data = json.loads(jsonData)
            self.stats = data.get('stats', None)
        else:
            self.stats = "True"
        myargs = []
        myargs.append(("uid",uid))

        if self.stats is not None :
            myargs.append(("stats",self.stats))

        Log.debug("myArgs: "+myargs.__str__())
        request= conn.request(method="GET", key="bucket", args= myargs)
        res = conn.send(request)
        info = res.read()
        return info
