__author__ = 'alain.dechorgnat@orange.com'

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
        userData = json.loads(jsonUserData)
        self.uid = userData.get('uid', None)
        self.displayName = userData.get('display-name', None)
        self.email = userData.get('email',None)
        self.keyType = userData.get('key-type', None)
        self.access = userData.get('access-key', None)
        self.secret = userData.get('secret-key', None)
        self.caps = userData.get('user-caps', None)
        self.generate = userData.get('generate-key', None)
        self.maxBuckets = userData.get('max-buckets', None)
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
            myargs.append(("max-buckets",self.maxBuckets))
        if self.suspended is not None :
            myargs.append(("suspended",self.suspended))

        Log.debug(myargs.__str__())

        request= conn.request(method="PUT", key="user", args= myargs)
        res = conn.send(request)
        user = res.read()
        Log.debug(user)
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
        userData = json.loads(jsonUserData)
        self.uid = uid
        self.displayName = userData.get('display-name', None)
        self.email = userData.get('email',None)
        self.keyType = userData.get('key-type', None)
        self.access = userData.get('access-key', None)
        self.secret = userData.get('secret-key', None)
        self.caps = userData.get('user-caps', None)
        self.generate = userData.get('generate-key', None)
        self.maxBuckets = userData.get('max-buckets', None)
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
            myargs.append(("max-buckets",self.maxBuckets))
        if self.suspended is not None :
            myargs.append(("suspended",self.suspended))

        Log.debug(myargs.__str__())

        request= conn.request(method="PUT", key="user", args= myargs)
        res = conn.send(request)
        user = res.read()
        Log.debug(user)
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
    def list( conn):
        request= conn.request(method="GET", key="user")
        res = conn.send(request)
        print res.read()
