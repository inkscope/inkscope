#!/usr/bin/env python

#author Philippe Raipin
#licence : apache v2

# need package python-dev : sudo apt-get install python-dev
# need module psutil : download module tar.gz, unzip, python setup.py install
# need pip to install pymongo : http://www.pip-installer.org/en/latest/installing.html
# need pymongo module : download module, 


from pymongo import MongoClient
import time

import re

#psutil to perform system command
import psutil

# for ceph command call
import subprocess

import sys
import getopt
import socket
 
import json
from StringIO import StringIO

from bson.dbref import DBRef 

from threading import Thread, Event

import signal


#from bson.objectid import ObjectId
#db.col.find({"_id": ObjectId(obj_id_to_find)})

configfile = "/etc/sysprobe.conf"





#load the conf (from json into file)
def load_conf():
    datasource = open(configfile, "r")
    data = json.load(datasource)
    
    datasource.close()
    return data


# mem

def pickMem(hostname, db):
    res = psutil.virtual_memory()
    #convert to base
    mem4db = {
        "timestamp" : int(round(time.time() * 1000)),
        "total" : res.total,
        "used" : res.used,
        "free" : res.free,
        "buffers" : res.buffers,
        "cached" : res.cached,
        "host" : DBref("hosts", hostname)
        }
    mem_id = db.memstat.insert(mem4db)
    db.hosts.update({"_id": hostname}, {"$set": {"mem": DBRef("memstat", mem_id)}})

# swap

def pickSwap(hostname, db): 
    res = psutil.swap_memory()
    #convert to base
    swap4db = {
               "timestamp" : int(round(time.time() * 1000)),
               "total" : res.total,
               "used" : res.used,
               "free" : res.free,
               "host" : DBref("hosts", hostname)
               }
    swap_id = db.swapstat.insert(swap4db)
    db.hosts.update({"_id": hostname}, {"$set": {"swap": DBRef("swapstat",swap_id)}})



#/var/lib/ceph/osd/$cluster-$id  


# partitions
def getPartitions(hostname):
    _partitions = psutil.disk_partitions()
    parts = []
    for p in _partitions :
        res = {
               "_id" : hostname+":"+p.device,
               "dev" : p.device,
               "mountpoint": p.mountpoint,
               "fs" : p.fstype,
               "stat" : None
            }
        parts.append(res)
    return parts
       


def pickPartitionsStat(hostname, db):
    _partitions = psutil.disk_partitions()
    for p in _partitions :
        # disk usage
        part_stat = psutil.disk_usage(p.mountpoint)
        
        res = {
               "timestamp" : int(round(time.time() * 1000)),
               "total" : part_stat.total,
               "used" : part_stat.used,
               "free" : part_stat.free,
               "partition" : DBRef("partitions", hostname+":"+p.device)
               }
        partstat_id = db.partitionstat.insert(res)
        db.partitions.update({"_id": hostname+":"+p.device}, {"$set": {"stat": DBRef("partitionstat", partstat_id)}})
    
#osd_dirs = [f for f in os.listdir(ceph_osd_root_path) if re.match(clusterName+ r'-.*', f) and os.path.isdir(ceph_osd_root_path+'/'+f)]


#filter the hardware list according to the class
def filterHW(hw, cl):
    res = []
    if ("children" in hw) :
        for child in hw["children"]:
            if child["class"] == cl :
                res.append(child)
                continue
            else :
                res.extend(filterHW(child, cl))
    return res




def getHW():  
    output = subprocess.Popen(['lshw', '-json'], stdout=subprocess.PIPE).communicate()[0]
    hw_io = StringIO(output)
    hw = json.load(hw_io)    
    return hw
    
def getHW_Disk(hostname, hw):  
    localDisks = [] 
    #the disks
    disks = filterHW(hw, "disk")  
    for disk in disks:
        if disk['id'].startswith('disk') : 
            logname = "NA"
            if isinstance(disk['logicalname'], list):
                logname = disk['logicalname'][0]
            else:
                logname = disk['logicalname']    
            description = "NA"
            if "description" in disk : 
                description = disk["description"]          
            product = "NA"
            if "product" in disk : 
                product = disk["product"]
            vendor = "NA"
            if "vendor" in disk : 
                vendor = disk["vendor"]          
            physid = "NA"
            if "physid" in disk :
                physid = disk["physid"]         
            diskversion = "NA"
            if "version" in disk :
                diskversion = disk["version"]         
            serial = "NA"
            if "serial" in disk :
                serial = disk["serial"]        
            disksize = 0
            if "size" in disk :    
                if disk["units"] == "bytes" :
                    disksize = disk["size"]
                # other units ?                  
            d = {"_id" : hostname+":"+logname,
                 "description" :description,
                 "product" : product,
                 "manufacturer" : vendor,
                 "physical_id" : physid,
                 "logical_name" : logname,
                 "version" : diskversion,
                 "serial_number" : serial,
                 "size": disksize,
                 "stat" : None
                 }
            localDisks.append(d)
    return localDisks


def get_network_info(interface):
    output = subprocess.Popen(['ip', 'addr', 'show', 'dev', interface], stdout=subprocess.PIPE).communicate()[0].rsplit('\n')
    mtu = re.findall('mtu ([0-9]+) ', output[0])[0]
    link_ha = re.findall('link/(\w+) ([0-9a-fA-F:]+) ', output[1])[0]
    inet = None
    inet6 = None
    for line in output[2:] :   
        if (not inet) :
            tinet = re.findall('inet ([0-9\.]+)/([0-9]+) ', line)
            if (tinet) :
                inet = {"addr" : tinet[0][0], "mask" : tinet[0][1]}
                continue
        if (not inet6) :
            tinet6 = re.findall('inet6 ([0-9a-fA-F:]+)/([0-9]+) ', line)
            if (tinet6) :
                inet6 = {"addr" : tinet6[0][0], "mask" : tinet6[0][1]}
        if (inet and inet6): 
            break  
    return {"mtu":int(mtu), "link" : link_ha[0], "HWaddr" : link_ha[1], "inet":inet, "inet6":inet6}

            

def getHW_Net(hostname, hw):  
    localNets = [] 
    #the disks
    nets = filterHW(hw, "network")  
    for net in nets:
        if net['id'].startswith('network') : 
            logname = "NA"
            if isinstance(net['logicalname'], list):
                logname = net['logicalname'][0]
            else:
                logname = net['logicalname']    
            description = "NA"
            if "description" in net : 
                description = net["description"]          
            product = "NA"
            if "product" in net : 
                product = net["product"]
            vendor = "NA"
            if "vendor" in net : 
                vendor = net["vendor"]          
            physid = "NA"
            if "physid" in net :
                physid = net["physid"]         
            netversion = "NA"
            if "version" in net :
                netversion = net["version"]         
            serial = "NA"
            if "serial" in net :
                serial = net["serial"]        
            netsize = 0
            if "size" in net :    
                if net["units"] == "bit/s" :
                    netsize = net["size"]
            netcapacity = 0
            if "capacity" in net :    
                if net["units"] == "bit/s" :
                    netcapacity = net["capacity"]
                # other units ?                  
            d = {"_id" : hostname+":"+logname,
                 "description" :description,
                 "product" : product,
                 "manufacturer" : vendor,
                 "physical_id" : physid,
                 "logical_name" : logname,
                 "version" : netversion,
                 "serial_number" : serial,
                 "size": netsize,
                 "capacity" : netcapacity,
                 "stat" : None
                 }
            d_info = get_network_info(logname)
            d.update(d_info)
            localNets.append(d)
    return localNets
            


def getHW_Cpu(hostname, hw):
    localCpus = []
    #the cpus
    cpus = filterHW(hw, "processor")  
    for cpu in cpus:
        if cpu['id'].startswith('cpu') : 
            description = "NA"
            if "description" in cpu : 
                description = cpu["description"]          
            product = "NA"
            if "product" in cpu : 
                product = cpu["product"]
            vendor = "NA"
            if "vendor" in cpu : 
                vendor = cpu["vendor"]          
            physid = "NA"
            if "physid" in cpu :
                physid = cpu["physid"]         
            cpuversion = "NA"
            if "version" in cpu :
                cpuversion = cpu["version"]          
            frequency = 0
            if "size" in cpu :    
                if cpu["units"] == "Hz" :
                    frequency = cpu["size"]
            cpuwidth = 0
            if "width" in cpu :    
                cpuwidth = cpu["width"]
            cores = 0
            enabledcores = 0
            threads = 0
            if "configuration" in cpu :   
                config = cpu["configuration"]
                if "cores" in config:
                    cores = int(config["cores"])
                if "enabledcores" in config:
                    enabledcores = int(config["enabledcores"])
                if "threads" in config:
                    threads = int(config["threads"])
            
                 
            c = {"_id" : hostname+":"+physid,
                 "description" :description,
                 "product" : product,
                 "manufacturer" : vendor,
                 "physical_id" : physid,
                 "version" : cpuversion,
                 "frequency": frequency,
                 "width" : cpuwidth,
                 "cores" : cores,
                 "enabledcores" : enabledcores,
                 "threads" : threads,
                 "stat" : None
                 }
            localCpus.append(c)    
    return localCpus




def initHost(hostname, db):
    hw = getHW()
    
    HWdisks = getHW_Disk(hostname, hw)   
    for d in HWdisks :
        db.disks.update({'_id' : d['_id']}, d, upsert= True)
      
    partitions = getPartitions(hostname)
    for p in partitions :
        db.partitions.update({'_id' : p['_id']}, p, upsert= True)
           
    HWnets = getHW_Net(hostname, hw)
    for n in HWnets :
        db.net.update({'_id' : n['_id']}, n, upsert= True)
       
    HWcpus = getHW_Cpu(hostname, hw)
    for c in HWcpus :
        db.cpus.update({'_id' : c['_id']}, c, upsert= True)
            
    host__ = {
              "hostip" : socket.gethostbyname(hostname),
              "timestamp" : int(round(time.time() * 1000)),
              "mem" : None,
              "swap" : None,
              "disks" : [DBRef( "disks",  d["_id"]) for d in HWdisks],
              "partitions" : [DBRef( "partitions",  p["_id"]) for p in partitions],
              "cpus" : [DBRef( "cpus",  c["_id"]) for c in HWcpus],
              "cpus_stat" : None,
              "network_interfaces" : [DBRef( "net",  n["_id"]) for n in HWnets]
              }
    db.hosts.update({'_id' : hostname}, host__, upsert= True)
    return HWdisks, partitions, HWnets, HWcpus



diskStatHdr = ["rrqm_s", "wrqm_s", "r_s" ,"w_s","rkB_s", "wkB_s"]

# disk stat
def pickDiskStat(db, HWdisks):    
    p = subprocess.Popen(args=['iostat','-dx']+[d["logical_name"] for d in HWdisks],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    outdata, errdata = p.communicate()
    if (len(errdata)):
        raise RuntimeError('unable to run iostat: %s' % (errdata))
    lines = outdata.rstrip().splitlines(); 
    for d in HWdisks :
        dev = re.findall('.*/([a-zA-Z0-9]+)', d['logical_name'])[0]
        iostat = [line for line in lines if re.match(dev+'.*', line)]
        if iostat :
            lineio = iostat[0].split()[1:]
            diskstat = dict([(k,float(v.replace(',','.'))) for k,v in zip(diskStatHdr, lineio)])
            diskstat["disk"] = DBRef("disks", d["_id"])
            diskstat["timestamp"] = int(round(time.time() * 1000)) 
            disk_stat_id = db.diskstat.insert(diskstat)
            db.disks.update({"_id": d["_id"]}, {"$set": {"stat": DBRef("diskstat",disk_stat_id)}})
           




# net stat
def pickNetStat(db, HWnets):
    netio = psutil.net_io_counters(pernic=True)
    for n in HWnets :
        net_interface = n["logical_name"]
        netstat = netio[net_interface]
        if netstat :
            network_interface_stat = {"network_interface" : DBRef("net", n['_id']),
                                      "timestamp" : int(round(time.time() * 1000)) ,
                                      "rx" : {"packets": netstat.packets_recv,
                                              "errors": netstat.errin,
                                              "dropped": netstat.dropin,
                                              "bytes": netstat.bytes_recv
                                              },
                                      "tx" : {"packets": netstat.packets_sent,
                                              "errors": netstat.errout,
                                              "dropped": netstat.dropout,
                                              "bytes": netstat.bytes_sent
                                              }
                                      }
            network_interface_stat_id = db.netstat.insert(network_interface_stat)
            db.net.update({"_id": n["_id"]}, {"$set": {"stat": DBRef("netstat",network_interface_stat_id)}})
           
            
# cpu stat
def pickCpuStat(hostname, db):
    cputimes = psutil.cpu_times()
    cpus_stat = {
                 "timestamp" : int(round(time.time() * 1000)) ,
                 "host" : DBRef( "hosts",  hostname),
                 "user": cputimes.user,
                 "system": cputimes.system,
                 "idle": cputimes.idle,
                 "iowait": cputimes.iowait,
                 "irq": cputimes.irq,
                 "softirq" :  cputimes.softirq,
                 "steal": cputimes.steal,
                 "guest" : cputimes.guest,
                 "guest_nice" : cputimes.guest_nice
                 }
    cpus_stat_hostx_id = db.cpustat.insert(cpus_stat)
    db.hosts.update({"_id": hostname}, {"$set": {"stat": DBRef("cpus_stat",cpus_stat_hostx_id)}})
        




class Repeater(Thread):
    def __init__(self, event, function, args=[], period = 5.0):
        Thread.__init__(self)
        self.stopped = event
        self.period = period
        self.function = function
        self.args = args
    def run(self):
        while not self.stopped.wait(self.period):
            # call a function
            self.function(*self.args)



    
#ceph probe 
#cephClient = httplib.HTTPConnection("localhost", port)

# gethostname -> hn
# if hn is mon of rank 0 -> update db



class Usage(Exception):
    def __init__(self, msg):
        self.msg = msg
        


evt = Event()
   
def handler(signum, frame):
    print 'Signal handler called with signal', signum
    evt.set()
    

def main(argv=None):
    if argv is None:
        argv = sys.argv
    try:
        try:
            opts, args = getopt.getopt(argv[1:], "h:", ["help"])
        except getopt.error, msg:
            raise Usage(msg)
        # more code, unchanged
    except Usage, err:
        print >>sys.stderr, err.msg
        print >>sys.stderr, "for help use --help"
        return 2
    
    #load conf
    data = load_conf()
    
    clusterName = data.get("cluster", "ceph")
    mem_refresh = data.get("mem_refresh", 60)
    swap_refresh = data.get("swap_refresh", 600)
    disk_refresh = data.get("disk_refresh", 60)
    partition_refresh = data.get("partition_refresh", 60)
    cpu_refresh = data.get("cpu_refresh", 60)
    net_refresh = data.get("net_refresh", 30)
    
    mongodb_host = data.get("mongodb_host", None)
    mongodb_port = data.get("mongodb_port", None)
    # end conf extraction
    
    
    hostname = socket.gethostname() #platform.node()
    
    client = MongoClient(mongodb_host, mongodb_port)
    db = client[clusterName]
    
    HWdisks, partitions, HWnets, HWcpus = initHost(hostname, db)
    
    
    
    cpuThread = None    
    if cpu_refresh > 0 :
        cpuThread = Repeater(evt, pickCpuStat, [hostname, db], cpu_refresh)
        cpuThread.start()
    
    netThread = None
    if net_refresh > 0 :
        netThread = Repeater(evt, pickNetStat, [db, HWnets], net_refresh)
        netThread.start()
    
    memThread = None
    if mem_refresh > 0:
        memThread = Repeater(evt, pickMem, [hostname, db], mem_refresh)
        memThread.start()
    
    swapThread = None
    if swap_refresh > 0 : 
        swapThread = Repeater(evt, pickSwap, [hostname, db], swap_refresh)
        swapThread.start()
    
    diskThread = None
    if disk_refresh > 0:
        diskThread = Repeater(evt, pickDiskStat, [db, HWdisks], disk_refresh)
        diskThread.start()
    
    partThread = None
    if partition_refresh > 0:
        partThread = Repeater(evt, pickPartitionsStat, [hostname, db], partition_refresh)
        partThread.start()
    
    signal.signal(signal.SIGTERM, handler)
    
    while not evt.isSet() : 
        evt.wait(600)
    return 0
    
   

if __name__ == "__main__":
    sys.exit(main())

