#!/usr/bin/env python

#author Philippe Raipin
#author Eric Mourgaya
#licence : apache v2


from pymongo import MongoClient
from pymongo import MongoReplicaSetClient
from pymongo.read_preferences import ReadPreference

import time

import re

#psutil to perform system command
import psutil

# for ceph command call
import subprocess

import datetime

import sys
import os
import getopt
import socket
from daemon import Daemon
 
import json
from StringIO import StringIO

from bson.dbref import DBRef 

from threading import Thread, Event

import httplib

import signal

#from bson.objectid import ObjectId
#db.col.find({"_id": ObjectId(obj_id_to_find)})

configfile = "/opt/inkscope/etc/cephprobe.conf"
runfile = "/var/run/cephprobe/cephprobe.pid"
logfile = "/var/log/cephprobe.log"
clusterName = "ceph"
fsid = ""




#load the conf (from json into file)
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
    if (len(errdata)):
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
    if (len(errdata)):
        raise RuntimeError('unable to get conf option %s: %s' % (field, errdata))
    return outdata.rstrip()


# extract mons from conf and put them into mons
def processConf():
    mon_sections=ceph_conf_list('mon.')
    if (len(mon_sections)==0):
        initmon = ceph_conf_global('mon_initial_members')
        if (not initmon):
            raise RuntimeError('enable to find a mon')
        mons = [initmon]
    else:
        for mon in mon_sections:
            mons.append(ceph_conf('host', mon))
        




#cluster
def initCluster(restapi, db):
    global fsid
    fsid = processStatus(restapi, db)
    processCrushmap(restapi, db)
    processOsdDump(restapi, db)
    processPgDump(restapi, db)
    processDf(restapi, db)
   
#health value 
healthCst = ["HEALTH_OK", "HEALTH_WARN", "HEALTH_ERROR"]
healthMap = {}
for idx, h in enumerate(healthCst) :
    healthMap[h] = idx
    
    
def worstHealth(h1, h2) :
    return healthCst[max(healthMap[h1], healthMap[h2])]

#uri : /api/v0.1/status.json
def processStatus(restapi, db):
    print str(datetime.datetime.now()), "-- Process Status"  
    sys.stdout.flush()
    restapi.request("GET", "/api/v0.1/status.json")
    r1=restapi.getresponse()
    if (r1.status == 200) :
        data1 = r1.read()
        io = StringIO(data1)
        c_status = json.load(io)
        
        monmap = c_status['output']['monmap']
        
        map_stat_mon = {}
        health_services_list = c_status['output']['health']['health']['health_services']
       
        time_checks  = c_status['output']['health']['timechecks']
        timecheckmap = {}
        for tc in time_checks["mons"]:
            tc["time_health"] = tc["health"]
            del tc["health"]
            monname = tc["name"]
            del tc["name"]
            timecheckmap[monname] = tc
            
        
        
        # complete timecheck
        
        for health_service in health_services_list:
            health_services_mons = health_service['mons']        
            for monst in health_services_mons:
                monstat = monst.copy()
                monstat["mon"] =  DBRef( "mon", monst['name'])
                monstat["_id"] = monst['name']+":"+monst["last_updated"]
                monstat["capacity_health"] = monstat["health"] 
                
                #complete with timecheck
                if monstat["name"] in timecheckmap:
                    tc = timecheckmap[monstat["name"]]
                    monstat.update(tc)
                
                monstat["health"] = worstHealth(monstat["capacity_health"], monstat["time_health"] )
                del monstat["name"]
                db.monstat.update({"_id" : monstat["_id"]}, monstat, upsert= True)
                map_stat_mon[monst['name']] = monstat["_id"]
        
        map_rk_name = {}
        
        for mon in monmap['mons'] :
            mondb = {"_id" : mon['name'],
               "host" : DBRef( "hosts", mon['name']),
               "addr" : mon['addr'],
               "rank" : mon['rank'],
               }
            
            if mon['name'] in map_stat_mon :
                mondb["stat"] = DBRef("monstat", map_stat_mon[mon['name']])
            db.mon.update({"_id" : mon['name']}, mondb, upsert= True)
            map_rk_name[mon['rank']] =  mon['name']        
            #no skew and latency ? 
            
        mm = {"epoch" : monmap['epoch'],
              "created" : monmap['created'],
              "modified" : monmap['modified'],
              "mons" : [DBRef( "mon", m['name']) for m in monmap['mons']],
              "quorum" : [DBRef( "mon", map_rk_name[rk]) for rk in c_status['output']['quorum']]
              }      
        cluster = {"_id" : c_status['output']['fsid'], 
                   "election_epoch" : c_status['output']['election_epoch'], 
                   "monmap" : mm,
                   "pgmap" : c_status['output']['pgmap'],
                   "osdmap-info" : c_status['output']['osdmap']['osdmap'],
                   "name" : clusterName, 
                   "health" : c_status['output']['health']['overall_status'],
                   "health_detail" : c_status['output']['health']['detail'],
                   "health_summary" : c_status['output']['health']['summary']
                   }     
        db.cluster.update({'_id' : c_status['output']['fsid']}, cluster, upsert= True)
        
        return c_status['output']['fsid']
   

#uri : /api/v0.1/osd/dump.json
def processOsdDump(restapi, db):   
    print str(datetime.datetime.now()), "-- Process OSDDump"  
    sys.stdout.flush()
    restapi.request("GET", "/api/v0.1/osd/dump.json")
    r1=restapi.getresponse()
    if (r1.status == 200) :
        data1 = r1.read()
        io = StringIO(data1)
        osd_dump = json.load(io)
        
        osdsxinfo_map = {}
        for xi in osd_dump['output']['osd_xinfo'] :
            osdsxinfo_map[xi["osd"]] = xi
        
        osds = osd_dump['output']['osds']
        
        for osd in osds :
            osd_stat = {"osd" : DBRef( "osd", osd["osd"]),
                        "timestamp" : int(round(time.time() * 1000)),
                        "up" : osd["up"] == 1,
                        "in" : osd["in"] == 1,
                        "last_clean_begin" : osd["last_clean_begin"],
                        "last_clean_end" : osd["last_clean_end"],
                        "up_from" : osd["up_from"],
                        "up_thru" : osd["up_thru"],
                        "down_at" : osd["down_at"],
                        "lost_at" : osd["lost_at"],
                        "state" : osd["state"]
                        }
            osd_stat_id = db.osdstat.insert(osd_stat)
            
            
            hostaddr = osd["public_addr"].partition(':')[0]
            osdhost = db.hosts.find_one({"hostip" : hostaddr})
            osdhostid = None
            
            if not osdhost :
                osdneti = db.net.find_one({"$where":  "this.inet.addr === '"+hostaddr+"'"})
                if osdneti :
                    osdhostid = osdneti["_id"].partition(":")[0]
            else :
                osdhostid = osdhost["_id"]
            
            osddatapartitionid = None
            if osdhostid :
                osddatapartition = db.partitions.find_one({"_id" : {'$regex' : osdhostid+":.*"}, "mountpoint" : '/var/lib/ceph/osd/'+clusterName+'-'+str(osd["osd"])})
                if osddatapartition :
                    osddatapartitionid = osddatapartition['_id']
                
            osddb = {"_id" : osd["osd"],
                   "uuid" : osd["uuid"],    
                   "node" : DBRef( "nodes", osd["osd"]),
                   "stat" :  DBRef( "osdstat", osd_stat_id),
                   "public_addr" : osd["public_addr"],
                   "cluster_addr" : osd["cluster_addr"],
                   "heartbeat_back_addr" : osd["heartbeat_back_addr"],
                   "heartbeat_front_addr" : osd["heartbeat_front_addr"],
                   "down_stamp" : osdsxinfo_map[osd["osd"]]["down_stamp"],
                   "laggy_probability" : osdsxinfo_map[osd["osd"]]["laggy_probability"],
                   "laggy_interval" : osdsxinfo_map[osd["osd"]]["laggy_interval"],
                   "host" :  DBRef( "hosts", osdhostid),
                   "partition" : DBRef( "partitions", osddatapartitionid)
                   }
            db.osd.update({'_id' : osddb["_id"]}, osddb, upsert= True)
            
        pools = osd_dump['output']['pools']
        
        for pool in pools:
            p = pool.copy()
            p["_id"] = pool["pool"]
            del p["pool"]
            if p['auid'] : 
                p['auid'] = str(p['auid'])
            db.pools.update({'_id' : p["_id"]}, p, upsert= True)
            
# osd host from conf : "host" : DBRef( "hosts", hostmap[i]),
#"partition" : DBRef( "partitions", hostmap[i]+":/dev/sdc1"),

#uri : /api/v0.1/pg/dump.json
def processPgDump(restapi, db):
    print str(datetime.datetime.now()), "-- Process PGDump"  
    sys.stdout.flush()
    restapi.request("GET", "/api/v0.1/pg/dump.json")
    r1=restapi.getresponse()
    if (r1.status == 200) :
        data1 = r1.read()
        io = StringIO(data1)
        pgdump = json.load(io)
        for pg in pgdump["output"]["pg_stats"] :
            #db.pg.insert(pg)
            pg['_id'] = pg['pgid']
            del pg['pgid']
            pg['pool'] = DBRef('pools', int(pg['_id'].partition('.')[0]))
            
            ups = pg['up']
            pg['up'] = [DBRef('osd', i_osd) for i_osd in ups]
            
            actings = pg['acting']
            pg['acting'] = [DBRef('osd', i_osd) for i_osd in actings]
            
            db.pg.update({'_id' : pg["_id"]}, pg, upsert= True)


#uri : /api/v0.1/osd/crush/dump.json
def processCrushmap(restapi, db):
    print str(datetime.datetime.now()), "-- Process Crushmap"  
    sys.stdout.flush()
    restapi.request("GET", "/api/v0.1/osd/crush/dump.json")
    r1=restapi.getresponse()
    if (r1.status == 200) :
        data1 = r1.read()
        io = StringIO(data1)
        crush_dump = json.load(io)
        #types
        types = crush_dump['output']['types'] 
        types_ref = []
        for t in types :
            db.types.update({'_id' : t["name"]}, {"_id":  t["name"], "num" :  t["type_id"]}, upsert= True)
            types_ref.append(DBRef("types", t["name"]))
        
        #nodes
        nodes_ref = []
        devices = crush_dump['output']['devices']
        for d in devices:
            db.nodes.update({'_id' : d["id"]}, {"_id":  d["id"], "name" :  d["name"], "type" : DBRef("types", "osd")}, upsert= True)
            nodes_ref.append(DBRef("nodes", d["id"]))
            
        buckets = crush_dump['output']['buckets']
        for b in buckets :       
            nod = {"_id" : b["id"],
                   "name" : b["name"],
                   "weight" : b["weight"],
                   "type" : DBRef("types", b["type_name"]),
                   "hash" : b["hash"],
                   "alg" : b["alg"],
                   "items" : [{"item" : DBRef("nodes", i["id"]), "weight" : i["weight"], "pos" : i["pos"]} for i in b["items"]]
                   }
            db.nodes.update({'_id' : nod["_id"]}, nod, upsert= True)
            nodes_ref.append(DBRef("nodes", nod["_id"]))
            
        #rules
        rules_ref = []
        rules = crush_dump['output']['rules']
        for r in rules:
            steps = []
            for s in r["steps"]:
                st = {"op" : s["op"]}
                if s.has_key("item"):
                    st["item"] =  DBRef("nodes", s["item"])
                if s.has_key("num"):
                    st["num"] = s["num"]
                if s.has_key("type"):
                    st["type"] = DBRef("types", s["type"])
                
                steps.append(st)
                
            rul = {"_id" : r["rule_id"],
                   "name" : r["rule_name"],
                   "ruleset" : r["ruleset"],
                   "type" : r["type"], 
                   "min_size" : r["min_size"], 
                   "max_size" : r["max_size"], 
                   "steps" : steps
                   }
            db.rules.update({'_id' : rul["_id"]}, rul, upsert= True)
            rules_ref.append(DBRef("rules", rul["_id"]))
            
        tunables = crush_dump['output']['tunables']
        
        crushmap = {"_id" : clusterName,
                    "types" : types_ref,
                    "nodes" : nodes_ref,
                    "rules" : rules_ref,
                    "tunables" : tunables
                    }
        db.crushmap.update({'_id' : crushmap["_id"]}, crushmap, upsert= True)

#uri : /api/v0.1/df
def processDf(restapi, db): 
    print str(datetime.datetime.now()), "-- Process DF"  
    sys.stdout.flush()
    restapi.request("GET", "/api/v0.1/df.json")
    r1=restapi.getresponse()
    if (r1.status == 200) :
        data1 = r1.read()
        io = StringIO(data1)
        df = json.load(io)
        #cluster stat
        clusterdf = df['output']['stats'] 
        stats = clusterdf.copy()
        stats["timestamp"] = int(round(time.time() * 1000))
        stats["cluster"] = DBRef("cluster", fsid)    
        statsid = db.clusterstat.insert(stats)        
        db.cluster.update({'_id' : fsid}, {"$set" : {"df" : DBRef("clusterstat",statsid)}})
        
        #pool stat
        pooldf = df['output']['pools'] 
        for pdf in pooldf :
            pstats = pdf["stats"].copy()
            pstats["timestamp"] = int(round(time.time() * 1000))
            pstats["pool"] = DBRef("pools", pdf["id"])    
            statsid = db.poolstat.insert(pstats)       
            db.pools.update({'_id' : pdf["id"]}, {"$set" : {"df" : DBRef("poolstat",statsid)}})
        
        
#delete the oldest stats
def dropStat(db, collection, window):
    before = int(round(time.time() * 1000)) - window
    print str(datetime.datetime.now()), "-- drop Stats :", collection, "before", before       
    db[collection].remove({"timestamp" : {"$lt" : before}})
    
def heartBeat(hostname, db):
    beat = {
            "timestamp" : int(round(time.time() * 1000)),
            }
    db.cephprobe.update({'_id' : hostname}, {"$set":beat}, upsert= True)

def ensure_dir(f):
    d = os.path.dirname(f)
    if not os.path.exists(d):
        os.makedirs(d)  


class Repeater(Thread):
    def __init__(self, event, function, args=[], period = 5.0):
        Thread.__init__(self)
        self.stopped = event
        self.period = period
        self.function = function
        self.args = args
    def run(self):
        while not self.stopped.wait(self.period):
            try:
                # call a function
                self.function(*self.args)
            except:
                # retry later
                pass



class Usage(Exception):
    def __init__(self, msg):
        self.msg = msg
        
        
evt = Event()
   
def handler(signum, frame):
    print 'Signal handler called with signal', signum
    evt.set()
    

class SysProbeDaemon(Daemon):
    def __init__(self, pidfile):
        Daemon.__init__(self, pidfile, stdout = logfile, stderr = logfile)
        
    def run(self):
        print str(datetime.datetime.now()), "-- CephProbe loading"  
        #load conf
        conf = load_conf()
        global clusterName
        
        clusterName = conf.get("cluster", "ceph")
        print "clusterName = ", clusterName
        
        cephConf = conf.get("ceph_conf", "/etc/ceph/ceph.conf")
        print "cephConf = ", cephConf
        
        ceph_rest_api = conf.get("ceph_rest_api", '127.0.0.1:5000')
        print "ceph_rest_api = ", ceph_rest_api
        
        hb_refresh = conf.get("hb_refresh", 5)
        print "hb_refresh = ", hb_refresh
        
        status_refresh = conf.get("status_refresh", 3)
        print "status_refresh = ", status_refresh
        
        osd_dump_refresh = conf.get("osd_dump_refresh", 3)
        print "osd_dump_refresh = ", osd_dump_refresh
        
        pg_dump_refresh = conf.get("pg_dump_refresh", 60)
        print "pg_dump_refresh = ", pg_dump_refresh
        
        crushmap_refresh = conf.get("crushmap_refresh", 60)
        print "crushmap_refresh = ", crushmap_refresh
        
        df_refresh = conf.get("df_refresh", 60)
        print "df_refresh = ", df_refresh
        
        
        cluster_window = conf.get("cluster_window", 1200)
        print "cluster_window = ", cluster_window
        
        osd_window = conf.get("osd_window", 1200)
        print "osd_window = ", osd_window
        
        pool_window = conf.get("pool_window", 1200)
        print "pool_window = ", pool_window
        
        mongodb_host = conf.get("mongodb_host", None)
        print "mongodb_host = ", mongodb_host
        
        mongodb_port = conf.get("mongodb_port", None)
        print "mongodb_port = ", mongodb_port
        
        is_mongo_replicat = conf.get("is_mongo_replicat", 0)
        print "is_mongo_replicat = ", is_mongo_replicat
        mongodb_set = "'"+conf.get("mongodb_set","")+"'"
        print "mongodb_set = ", mongodb_set
        mongodb_replicaSet =conf.get("mongodb_replicaSet",None)
        print "mongodb_replicaSet = ",mongodb_replicaSet
        mongodb_read_preference = conf.get("mongodb_read_preference",None)
        print "mongodb_read_preference = ", mongodb_read_preference
        is_mongo_authenticate = conf.get("is_mongo_authenticate",0)
        print "is_mongo_authenticate",is_mongo_authenticate
        mongodb_user = conf.get("mongodb_user","cephdefault")
        print "mongodb_user = ", mongodb_user
        mongodb_passwd = conf.get("mongodb_passwd", None)
        print "mongodb_passwd = ", mongodb_passwd

        sys.stdout.flush()
        
        # end conf extraction
        
        
        hostname = socket.gethostname() #platform.node()
        
	 # take care with mongo set and authentication
        if is_mongo_replicat ==  1:
            print  "replicat set connexion"
            client=MongoReplicaSetClient(eval(mongodb_set), replicaSet=mongodb_replicaSet, read_preference=eval(mongodb_read_preference))
        else:
            print  "no replicat set"
            client = MongoClient(mongodb_host, mongodb_port)
        if is_mongo_authenticate == 1:
            print "authentication  to database"
            client.ceph.authenticate(mongodb_user,mongodb_passwd)
        else:
            print "no authentication"

        db = client[clusterName]
        
        
        restapi = httplib.HTTPConnection(ceph_rest_api)  
        initCluster(restapi, db)
        
        
        conf["_id"] = hostname   
        db.cephprobe.remove({'_id' : hostname})
        db.cephprobe.insert(conf)
        
        hbThread = None    
        if hb_refresh > 0 :
            hbThread = Repeater(evt, heartBeat, [hostname, db], hb_refresh)
            hbThread.start()
        
        statusThread = None    
        if status_refresh > 0 :
            restapi = httplib.HTTPConnection(ceph_rest_api)
            statusThread = Repeater(evt, processStatus, [restapi, db], status_refresh)
            statusThread.start()
            
        osdDumpThread = None    
        if osd_dump_refresh > 0 :
            restapi = httplib.HTTPConnection(ceph_rest_api)
            osdDumpThread = Repeater(evt, processOsdDump, [restapi, db], osd_dump_refresh)
            osdDumpThread.start()
            
        pgDumpThread = None    
        if pg_dump_refresh > 0 :
            restapi = httplib.HTTPConnection(ceph_rest_api)
            pgDumpThread = Repeater(evt, processPgDump, [restapi, db], pg_dump_refresh)
            pgDumpThread.start()
            
        crushmapThread = None    
        if crushmap_refresh > 0 :
            restapi = httplib.HTTPConnection(ceph_rest_api)
            crushmapThread = Repeater(evt, processCrushmap, [restapi, db], crushmap_refresh)
            crushmapThread.start()
            
        dfThread = None    
        if df_refresh > 0 :
            restapi = httplib.HTTPConnection(ceph_rest_api)
            dfThread = Repeater(evt, processDf, [restapi, db], df_refresh)
            dfThread.start()
            
            
        # drop threads : osdstat, poolstat, clusterstat
        clusterDBDropThread = None    
        if cluster_window > 0 :
            clusterDBDropThread = Repeater(evt, dropStat, [db, "clusterstat", cluster_window], cluster_window)
            clusterDBDropThread.start()
            
        osdDBDropThread = None    
        if osd_window > 0 :
            osdDBDropThread = Repeater(evt, dropStat, [db, "osdstat", osd_window], osd_window)
            osdDBDropThread.start()
            
        poolDBDropThread = None    
        if pool_window > 0 :
            poolDBDropThread = Repeater(evt, dropStat, [db, "poolstat", pool_window], pool_window)
            poolDBDropThread.start()
        
        signal.signal(signal.SIGTERM, handler)
        
        while not evt.isSet() : 
            evt.wait(600)

        print str(datetime.datetime.now()), "-- CephProbe stopped"
    
   

if __name__ == "__main__":   
    ensure_dir(runfile)
    daemon = SysProbeDaemon(runfile)
    if len(sys.argv) == 2:
        if 'start' == sys.argv[1]:
            daemon.start()
        elif 'stop' == sys.argv[1]:
            daemon.stop()
        elif 'restart' == sys.argv[1]:
            daemon.restart()
        else:
            print "Unknown command"
            sys.exit(2)
        sys.exit(0)
    else:
        print "usage: %s start|stop|restart" % sys.argv[0]
        sys.exit(2)



