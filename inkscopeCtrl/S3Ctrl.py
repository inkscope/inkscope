__author__ = 'alain.dechorgnat@orange.com'

from flask import Flask, request, Response
from S3.bucket import S3Bucket
from S3.user import  S3User
from Log import Log


class S3Ctrl:

    def __init__(self):
        endpoint= "p-sbceph11"

    def getAdminConnection(self):
        return S3Bucket("admin", access_key="s3adminrgw", secret_key="s3secret")


    def listUser(self):
        Log.debug( "list users")
        userList= ' [{"uid":"alaind", "display-name":"Alain Dechorgnat"}, ' \
                  '{"uid":"jacques", "display-name":"Jacques Denoual"}, ' \
                  '{"uid":"johndoe", "display-name":"John Doe"},' \
                  '{"uid":"funambol", "display-name":"Funambol"},' \
                  '{"uid":"toto", "display-name":"Computer John Doe"}]'
        return userList


    def createUser(self):
        Log.debug( "user creation")
        jsonform = request.form['json']
        return S3User.create(jsonform,self.getAdminConnection())

    def getUser(self,uid):
        Log.debug( "get user with uid "+ uid)
        return S3User.view(uid,self.getAdminConnection())

    def removeUser(self,uid):
        Log.debug( "remove user with uid "+ uid)
        return S3User.remove(uid,self.getAdminConnection())
