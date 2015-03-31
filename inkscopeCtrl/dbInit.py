#!/usr/bin/env python

#author Philippe Raipin
#licence : apache v2

import getopt
import getpass

from pymongo import MongoClient
from pymongo import MongoReplicaSetClient
from pymongo.read_preferences import ReadPreference

# for ceph command call
import subprocess

import sys
import os


configfile = "/opt/inkscope/etc/inkscope.conf"
runfile = "/var/run/cephprobe/cephprobe.pid"
logfile = "/var/log/cephprobe.log"
clusterName = "ceph"
fsid = ""


# load the conf (from json into file)
def load_conf():
    datasource = open(configfile, "r")
    data = json.load(datasource)
    datasource.close()
    return data


# list sections prefixed
def ceph_conf_list(prefix):
    p = subprocess.Popen(
        args=[
            'ceph-conf',
            '-l',
            prefix
            ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE)
    outdata, errdata = p.communicate()
    if (len(errdata)):
        raise RuntimeError('unable to get conf option prefix %s: %s' % (prefix, errdata))
    return outdata.rstrip().splitlines();


# get a field value from named section
def ceph_conf(field, name):
    p = subprocess.Popen(
        args=[
            'ceph-conf',
            '--show-config-value',
            field,
            '-n',
            name,
            ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE)
    outdata, errdata = p.communicate()
    if len(errdata):
        raise RuntimeError('unable to get conf option %s for %s: %s' % (field, name, errdata))
    return outdata.rstrip()


# get a field value from global conf
def ceph_conf_global(field):
    p = subprocess.Popen(
        args=[
            'ceph-conf',
            '--show-config-value',
            field
            ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE)
    outdata, errdata = p.communicate()
    if len(errdata):
        raise RuntimeError('unable to get conf option %s: %s' % (field, errdata))
    return outdata.rstrip()


# get a field value from global conf according to the specified ceph conf
def ceph_conf_global(cephConfPath, field):
    p = subprocess.Popen(
        args=[
            'ceph-conf',
            '-c',
            cephConfPath,
            '--show-config-value',
            field
            ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE)
    outdata, errdata = p.communicate()
    if len(errdata):
        raise RuntimeError('unable to get conf option %s: %s' % (field, errdata))
    return outdata.rstrip()


# extract mons from conf and put them into mons
def process_conf():
    mon_sections=ceph_conf_list('mon.')
    if len(mon_sections)==0:
        initmon = ceph_conf_global('mon_initial_members')
        if not initmon:
            raise RuntimeError('enable to find a mon')
        mons = [initmon]
    else:
        for mon in mon_sections:
            mons.append(ceph_conf('host', mon))


def load_init(self):
    # load conf
    conf = load_conf()
    
    global clusterName
    global fsid
    global hostname
    global mongodb_host
    global mongodb_port
    global is_mongo_replicat
    global mongodb_set
    global mongodb_replicaSet
    global mongodb_read_preference
    global is_mongo_authenticate
    global mongodb_user
    global mongodb_passwd
    global client
    
    clusterName = conf.get("cluster", "ceph")
    print "clusterName = ", clusterName
    
    ceph_conf_file = conf.get("ceph_conf", "/etc/ceph/ceph.conf")
    print "ceph_conf = ", ceph_conf_file

    fsid = ceph_conf_global(ceph_conf_file, 'fsid')
    print "fsid = ", fsid
    
    
    mongodb_host = conf.get("mongodb_host", None)
    print "mongodb_host = ", mongodb_host
    
    mongodb_port = conf.get("mongodb_port", None)
    print "mongodb_port = ", mongodb_port
    
    is_mongo_replicat = conf.get("is_mongo_replicat", 0)
    print "is_mongo_replicat = ", is_mongo_replicat

    mongodb_set = "'"+conf.get("mongodb_set", "")+"'"
    print "mongodb_set = ", mongodb_set

    mongodb_replicaSet =conf.get("mongodb_replicaSet", None)
    print "mongodb_replicaSet = ",mongodb_replicaSet

    mongodb_read_preference = conf.get("mongodb_read_preference", None)
    print "mongodb_read_preference = ", mongodb_read_preference

    is_mongo_authenticate = conf.get("is_mongo_authenticate", 0)
    print "is_mongo_authenticate",is_mongo_authenticate

    mongodb_user = conf.get("mongodb_user", "cephdefault")
    print "mongodb_user = ", mongodb_user

    mongodb_passwd = conf.get("mongodb_passwd", None)
    print "mongodb_passwd = ", mongodb_passwd
    

    sys.stdout.flush()
    hostname = socket.getfqdn()
    
    # end conf extraction
  
    
    # take care with mongo set and authentication
    if is_mongo_replicat == 1:
        print  "replicat set connexion"
        client = MongoReplicaSetClient(eval(mongodb_set), replicaSet=mongodb_replicaSet, read_preference=eval(mongodb_read_preference))
    else:
        print "no replicat set"
        client = MongoClient(mongodb_host, mongodb_port)



def authAdmin():
    admin_name = raw_input("admin login : ")
    admin_pwd = getpass.getpass("admin password : ")
    try :
        client.admin.authenticate(admin_name, admin_pwd)
    except :
        print "authentication failed"
        sys.exit(2)  
    

def createUser():  
    user_name = raw_input("login : ")
    user_pwd = getpass.getpass("password : ")
    
    if user_name == '' :
        user_name = mongodb_user
    
    if user_pwd == '' :
        user_pwd = mongodb_passwd
        
    if user_name == None or user_name == '':
        print "bad user name"
        sys.exit(2)  
        
    db = client[fsid]
    db.add_user(user_name, user_pwd, roles=[{'role':'readWrite','db':fsid}, {'role':'dbAdmin','db':fsid}])
    print "user added ( ", user_name, ' ; ', user_pwd, ' )' 
    sys.stdout.flush()
    mongodb_user = user_name
    mongodb_passwd = user_pwd
    db.authenticate(mongodb_user, mongodb_passwd)

def authUser():
    name = raw_input("login : ")
    pwd = getpass.getpass("password : ")
    db = client[fsid]
    try :
        db.authenticate(mongodb_user, mongodb_passwd)
    except :
        print "authentication failed"
        sys.exit(2)  
        
def dropDb():
    client.drop_database(fsid)
    #db = client[fsid]


def usage():
    print "h, help : show this help"
    print "c, create : create a user to manage the database"
    print "d, drop : drop the database"

def main():
    try:
        opts, args = getopt.getopt(sys.argv[1:], "hcd", ["help", "create" , "drop"])
    except getopt.GetoptError as err:
        # print help information and exit:
        print(err) # will print something like "option -a not recognized"
        usage()
        sys.exit(2)
    output = None
    verbose = False
    for o, a in opts:
        if o in ("-c", "create"):
            load_init()
            authAdmin()
            createUser()    
            sys.exit()      
        elif o in ("-d", "drop"):
            load_init()
            authUser()
            dropDb()    
            sys.exit() 
        elif o in ("-h", "--help"):
            usage()
            sys.exit()
        else:
            assert False, "unhandled option"

if __name__ == "__main__":
    main()
