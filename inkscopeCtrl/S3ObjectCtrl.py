__author__ = 'alexis.koalla@orange.com'

from flask import request
from S3.bucket import S3Bucket
from Log import Log

from subprocess import PIPE, Popen
import simplejson as json
from model.chunk import Chunk
from model.osd import OSD
from model.pg import PG
from model.S3Object import S3Object
import requests
import re
from S3.user import  S3User
import rados
from datetime import  datetime

def getCephRestApiUrl(request):
    # discover ceph-rest-api URL
    return request.url_root.replace("inkscopeCtrl", "ceph-rest-api")

class S3ObjectCtrl:
    Log.debug("Entering in S3ObjectCtrl class <<")
    def __init__(self, conf):
        self.admin = conf.get("radosgw_admin", "admin")
        self.key = conf.get("radosgw_key", "")
        self.secret = conf.get("radosgw_secret", "")
        self.conffile = conf.get("ceph_conf", '/etc/ceph/ceph.conf')
        self.radosgw_url = conf.get("radosgw_url", "127.0.0.1")
        self.clusterName = conf.get("cluster", "ceph")
        self.secure = self.radosgw_url.startswith("https://")

        if not self.radosgw_url.endswith('/'):
            self.radosgw_url += '/'
        self.url = self.radosgw_url + self.admin

        self.cluster = rados.Rados(conffile=str(self.conffile))
        print "\nlibrados version: " + str(self.cluster.version())
        print "Will attempt to connect to: " + str(self.cluster.conf_get('mon initial members'))

        self.cluster.connect()
        print "\nCluster ID: " + self.cluster.get_fsid()
        # print "config url: "+self.url
        # print "config admin: "+self.admin
        # print "config key: "+self.key
        # print(json.dumps(conf))


    def getAdminConnection(self):
        return S3Bucket(self.admin, access_key=self.key, secret_key=self.secret , base_url=self.url, secure=self.secure)

    def getObjectStructure(self) :
        startdate = datetime.now()
        print(str(startdate) + ' -Calling method getObjectStructure() begins <<')
        print" __request", request
        objectId = request.args.get('objectId')
        bucketname = request.args.get('bucketName')
        osd_dump = self.getOsdDump()

       # objectIdd=request.form['objectId']
        # bucketnamee=request.form['bucketName']
        Log.debug("__getS3Object(objectId=" + str(objectId) + ", bucketName= " + str(bucketname) + ")")

        # Log.debug("getS3Object(objectIdd="+str(objectIdd)+", bucketNamee= "+str(bucketnamee)+")")
        # Retrieve the bucketId using the bucket name

        bucketId = self.getBucketInfo(bucketname)["bucketid"]
        # Get the pool name using the
        poolname = self.getBucketInfo(bucketname)["poolname"]

        # Retrieve the pool id
        poolid = self.getPoolId(poolname)
        # poolname=getPoolName(bucketName)
        extended_objectId = bucketId + "_" + objectId
        # Retrieve the user.rgw.manifest that contains the chunks list for the object
        # usermnf=self.getUserRgwManifest(poolname,extended_objectId)

        # Retrieve the chunk base name in the user.rgw.manifest attribute
        chunkbasename = self.getChunkBaseName(poolname, extended_objectId)

        print '__Chunk base name: ', chunkbasename
        if  len(chunkbasename):  # chek if there is chunk por not for the object
                # Retrieve the chunks list of the object
            chunks = self.getChunks(bucketId, poolname, objectId, chunkbasename)
            chunks.append(extended_objectId)  # Add the last object that is around 512.0 kb
        else :
            chunks = [extended_objectId]

        print "__Chunks list", chunks
        # bucketInfo=self.getBucketInfo(bucketId)
        chunklist = []
        pgs = []
        osds = []
        osdids = []
        pgid4osd = []
        for chunk in chunks :
                if len(chunk) > 0 :
                    print 'Chunk= ', chunk
                    chunksize = self.getChunkSize(poolname, chunk)
                    pgid = self.getPgId(poolname, '  ' + chunk)
                    c = Chunk(chunk, chunksize, pgid[0])
                    chunklist.append(c)
                    if pgid4osd.count(pgid[1]) == 0:
                        pgid4osd.append(pgid[1])

                    if pgid4osd.count(pgid[0]) == 0:
                        pgid4osd.append(pgid[0])

                    # Create the PG for this chunk
                    # ef __init__(self,pgid,state,acting, up, acting_primary, up_primary):
                    pginfos = self.getOsdMapInfos(pgid[1]);
                    pg = PG(pgid[0], pginfos['state'],
                          pginfos['acting'],
                          pginfos['up'],
                          pginfos['acting_primary'],
                          pginfos['up_primary'])
                   # print(pg.dump())
                    pgs.append(pg)  # Append the PG in the pgs list
                   # print "____ OSD List for PG ", pgid[1],self.getOsdsListForPg(pgid[1])
        for pgid in pgid4osd:
            for id in self.getOsdsListForPg(pgid):  # sortir la boucle pour les pg
                if osdids.count(id) == 0:
                    osdids.append(id)  # construct the list of the OSD to be displayed



        # Log.debug("Total number of chunks retrived:"+str(nbchunks))
       # print "_____osds list=",osdids
        for osdid in osdids:  # Loop the OSD list and retrieve the osd and add it in the osds list fot the S3 object
            osd = self.getOsdInfos(osd_dump, osdid)
            # print(osd.dump())
            osds.append(osd)

        s3object = S3Object(extended_objectId,
                          bucketname,
                          bucketId,
                          poolid,
                          poolname,
                          self.getPoolType(poolname, poolid),
                          self.getChunkSize(poolname, extended_objectId),
                          chunklist,
                          pgs,
                          osds)
        print(s3object.dump())
        duration = datetime.now() - startdate
        Log.info(str(datetime.now()) + ' ___Calling method getObjectStructure() end >> duration= ' + str(duration.seconds))
        return s3object.dump()
# This method returns the pool id of a given pool name
    def getPoolId(self, poolname):
        Log.info("___getPoolId(poolname=" + str(poolname) + ")")
        outdata = self.executeCmd('ceph osd pool stats ', [poolname], [])
        poolid = outdata.strip().split('\n')[0].split(' id ')[1]  # ['pool .rgw.buckets', ' 16']
        return poolid

    # This method returns the pool type of a pool using the poolname and the pool id parameters
    def getPoolType(self, poolname, poolId):
        Log.info("___getPoolType(poolname=" + str(poolname) + ", poolId=" + str(poolId) + ")")
        outdata = self.executeCmd('ceph osd dump ', [], [poolname, ' ' + poolId])
        pooltype = outdata.strip().split(' ')[3]  # ['pool', '26', "'.rgw.buckets'", 'replicated', 'size', '2', 'min_size', '1', 'crush_ruleset', '0', 'object_hash', 'rjenkins', 'pg_num', '8', 'pgp_num', '8', 'last_change', '408', 'stripe_width', '0']
        return pooltype

        # This method computes the size of an object
        # arguments: bucketName: The bucket name to look for
        # objectId: the object id we want to compute the size


    def getChunkSize2(self, poolName, objectid):
        Log.debug("___getChunkSize(poolName=" + str(poolName) + ", objectId=" + str(objectid) + ")")
        outdata = self.executeCmd('rados --pool=', [poolName, ' stat ', objectid], [])
        #'.rgw.buckets/default.4651.2__shadow__0cIEZvHYuHkJ6xyyh9lwX4pj5ZsHrFD_125 mtime 1391001418, size 4194304\n'
        objectsize = outdata[outdata.index('size') + 5: outdata.index('\n')]

        return objectsize.rstrip()

    def getChunkSize(self, poolname, objectid):  # Method OK
        Log.info('___getChunkSize(poolName=' + str(poolname) + ', objectId=' + str(objectid) + ')')
        ioctx = self.cluster.open_ioctx(str(poolname))
        size = ioctx.stat(str(objectid))

        return int(size[0])

# This method returns the lists of osds for a given pgid
# The following command is performed : ceph pg map 16.7  result= osdmap e11978 pg 16.7 (16.7) -> up [9,6] acting [9,6]
    def getUpActing(self, pgid):
        Log.info("___getUpActing(pgid=" + str(pgid) + ")")
        outdata = self.executeCmd('ceph pg map ', [pgid], [])
        pgid = outdata.strip().split(' -> ', 2)[1].split(' ', 4)  # 'up' '[9,6]' 'acting' '[9,6]'
        osds = {"up":pgid[1], "acting":pgid[3]}
        return osds

# This method retrieves the information about the status of an osd: acting, up, primary_acting, primary_up
# The PG id is used as an input argument
    def getOsdMapInfos(self, pgid):
        Log.info("___getOsdMapInfos(pgid=" + str(pgid) + ")")
        cephRestApiUrl = getCephRestApiUrl(request) + 'tell/' + pgid + '/query.json';

        Log.debug("____cephRestApiUrl Request=" + cephRestApiUrl)
        osdmap = []
        data = requests.get(cephRestApiUrl)
        r = data.content
        if data.status_code != 200:
                print 'Error ' + str(data.status_code) + ' on the request getting pools'
                return osdmap
        # print(r)

        if len(r) > 0:
           osdmap = json.loads(r)
        else:
            Log.err('The getOsdMapInfos() method returns empty data')
        osdmap = json.loads(r)
        # osdmap=r.read()
       # Log.debug(osdmap)
        acting = osdmap["output"]["acting"]
        up = osdmap["output"]["up"]
        state = osdmap["output"]["state"]

        acting_primary = osdmap["output"] ["info"]["stats"]["acting_primary"]
        up_primary = osdmap["output"]["info"]["stats"]["up_primary"]

        osdmap_infos = {"acting":acting, "acting_primary":acting_primary, "state":state, "up":up, "up_primary":up_primary}

        return osdmap_infos

# {
#                    id : "osd.1",
#                    status : ['in','up'],
#                    host : "p-sbceph12",
#                    capacity : 1000000000,
 #                   occupation : 0.236
 #               },
# This method returns the information for a given osd id that is passed in argument
# The information of the osd is retrieved thanks to mongoDB inkscopeCtrl/{clusterName}/osd?depth=2 REST URI

    def getOsdDump(self):
        Log.debug("___getOsdDump()")
        # print str(datetime.datetime.now()), "-- Process OSDDump"
        cephRestUrl = request.url_root + self.cluster.get_fsid() + '/osd?depth=2'
        print(cephRestUrl)
        # Set HTTP credentials for url callback (requests.)
        data = requests.get(cephRestUrl)
       #
        osds = []
        if data.status_code != 200:
                print 'Error ' + str(data.status_code) + ' on the request getting osd'
                return osds
        r = data.content

        if r != '[]':
           osds = json.loads(r)
        else:
            Log.err('The osd dump returns empty data')
        return osds

    def getOsdInfos(self, osds, osdid):
        Log.info("___getOsdInfos(osdid=" + str(osdid) + ")")
        i = 0
        osdnodename = ''
        capacity = 0
        used = 0
        total = 1
        hostid = ''
        while i < len(osds):
            if osds[i]["node"]["_id"] == osdid:
                osdnodename = osds[i]["node"]["name"]
                break
            i = i + 1
        Log.debug("_____OSD Node Name= " + str(osdnodename))

        stat = []
        try:
            while i < len(osds):
                if osds[i]["stat"]["osd"]["node"]["$id"] == osdid:
                    state = osds[i]["stat"]
                    if state["in"]:
                        stat.append("in")
                    if state["up"]:
                        stat.append("up")

                    hostid = osds[i]["stat"]["osd"]["host"]["$id"]
                    capacity = osds[i]["host"]["network_interfaces"][0]["capacity"]
                    if osds[i]["partition"]["stat"] != 'null':
                       used = osds[i]["partition"]["stat"]["used"]
                    if osds[i]["partition"]["stat"] != 'null':
                       total = osds[i]["partition"]["stat"]["total"]
                    break
                i = i + 1
        except TypeError, e:
            Log.err(e.__str__())

        # Log.debug("OSD node infos [: ")

        print "|_______________ [up, acting ]=", stat

        Log.debug("|______________Host id=" + str(hostid))
        Log.debug("|______________Capacity =" + str(capacity))
        Log.debug("|______________Used =" + str(used))
        Log.debug("|______________Total =" + str(total))
        Log.debug("               ]")
        occupation = "null"
        if int(used) > 0:
            occupation = round(float(used) / float(total), 3)
        osd = OSD(osdnodename,
              stat, hostid,
              capacity,
              occupation
              )
        print "_______________ osd= ", osd.dump()
        return osd
# This method returns a list of osds for a given PG id.
# This consist of the concatenation of the acting and the up array of the PG.
# We careful with double entry whena dding the osd id, thanks to the list.count(x) method for the comparison
    def getOsdsListForPg(self, pgid):
        Log.info("____getOsdsListForPg(pgid=" + str(pgid) + ")")
        cephRestApiUrl = getCephRestApiUrl(request) + 'pg/map.json?pgid=' + pgid
        data = requests.get(cephRestApiUrl)
        # r = data.json()
        r = data.content
        osdmap = json.loads(r)
        osdslist = []
        # print "acting[",osdmap["output"]["acting"],"]"
        for osd in osdmap["output"]["acting"]:
            # print "osd=",int(osd)
            if osdslist.count(int(osd)) == 0:  # the list does not contains the element yet
                osdslist.append(int(osd))

        # print "up[",osdmap["output"]["up"],"]"
        for osd in osdmap["output"]["up"]:
            # print "osd=",int(osd)
            if osdslist.count(int(osd)) == 0:  # the list does not contains the element yet
                osdslist.append(int(osd))
        # print "OSD LIST Contructed =", osdslist
        return osdslist

    def executeCmd(self, command, args=[], filters=[]):
        print "___Building unix with = " + command, "___args=" + json.dumps(args), "___filters=" + json.dumps(filters)
        cmd = command
        if len(args):
            i = 0
            while i < len(args):
                cmd = cmd + args[i].replace('(','\(').replace(')','\)')
                i = i + 1
        if len(filters):
            i = 0
            while i < len(filters):
                cmd = cmd + ' |grep ' + filters[i].replace('(','\(').replace(')','\)')
                i = i + 1
        p = Popen(cmd, shell=True, stdout=PIPE, stderr=PIPE)
        outdata, errdata = p.communicate()
        if len(errdata):
            raise RuntimeError('unable to execute the command[%s] , Reason= %s' % (cmd, errdata))
        else:
            print "_____Execute Command successful %s", outdata
        return outdata

# This method returns the name of the pool that hold the bucket which name is passed in argument
# AN exception is thrown if an error occurs
#
# { "key": "bucket:cephfun",
#  "ver": { "tag": "_AQT53GiChuJ5ovYxlK3YitJ",
 #     "ver": 1},
 # "mtime": 1410342120,
#  "data": { "bucket": { "name": "cephfun",
#         "pool": ".rgw.buckets",
 #         "data_extra_pool": "",
 #         "index_pool": ".rgw.buckets.index",
 #         "marker": "default.896476.1",
  #        "bucket_id": "default.896476.1"},
  #    "owner": "cephfun",
  #    "creation_time": 1410342120,
  #    "linked": "true",

    def getBucketInfo (self, bucket):
        myargs = []
        stats = request.form.get('stats', None)
        if stats is not None:
            myargs.append(("stats", stats))
        if bucket is not None:
            myargs.append(("bucket", bucket))

        conn = self.getAdminConnection()
        request2 = conn.request(method="GET", key="bucket", args=myargs)
        res = conn.send(request2)
        info = res.read()
        jsondata = json.loads(info)
        print jsondata
        poolname_bucketid = {"poolname":jsondata['pool'], "bucketid": jsondata['id']}
        return poolname_bucketid

# This method returns the base name of the chunks that compose the object. The chunk base name is in the user.rgw.manifest attribute of the object
# An exception is thrown if the object does not exist or there an issue
    def getChunkBaseName(self, poolName, objectid):
        Log.info("____Get the chunks list for the object [" + objectid + "] and the pool[ " + str(poolName) + "]")
        ioctx = self.cluster.open_ioctx(str(poolName))
        xattr = ioctx.get_xattr(objectid, 'user.rgw.manifest')
        shadow = xattr.replace('\x00', '').replace('\x01', '').replace('\x02', '').replace('\x03', '').\
                      replace('\x04', '').replace('\x05', '').replace('\x06', '').replace('\x07', '').replace('\x08', '').replace('\x09', '')\
                      .replace('\x10', '').replace('\x11', '').replace('\x12', '').replace('\x0e', '').replace('\x0b', '').replace('\x0c', '')
                       # '.index\x08\x08!.a8IqjFd0B9KyTAxmOh77aJEAB8lhGUV_\x01\x02\x01 \x08@\x07\x03_\x07cephfun\x0c'
        Log.debug("___Shadow: "+shadow)
        if shadow.count('shadow') > 0:
           shadow_motif = re.search('(?<=_shadow__)(\w(\-)*)+', shadow)
           print "_____ shadow motif= ", shadow_motif
           # chunkname=shadow_motif[shadow_motif.index('_shadow__')+9:,]
           chunkname = shadow_motif.group(0)
           chunkname = chunkname[0:chunkname.index('_')]
        elif shadow.count('!.'):
          # shadow_motif = re.search('(?<=\!\.)\w+', shadow)
          # chunkname=shadow_motif.group(0)
          pos = shadow.index('!.') + 2
          chunkname = shadow[pos:pos + 30]  # The lenght of the shadow base name is 30!
        else :  # The case the object has no chunk because it's not too large
            chunkname = ''
        Log.debug("____Chunkbasename= " + chunkname)
        return chunkname


    def getChunkBaseName1(self,poolName, objId):
        Log.debug("____Get the chunks list for the object [" + str(objId) + "] and the pool[ " + str(poolName) + "]")
        outdata =self.executeCmd('rados --pool ', [poolName ,' getxattr ' , '"'+objId+'"'+' ' , 'user.rgw.manifest'],[])

        shadow = outdata.replace('\x00', '').replace('\x07', '').replace('\x01', '').replace('\x02', '').\
                      replace('\x08','').replace('\x03', '').replace('\x11', '').replace('\x12','')
                       # '.index\x08\x08!.a8IqjFd0B9KyTAxmOh77aJEAB8lhGUV_\x01\x02\x01 \x08@\x07\x03_\x07cephfun\x0c'
        #Log.debug("___Shadow: "+shadow)
        if shadow.count('shadow') > 0:
           shadow_motif = re.search('(?<=_shadow__)(\w(\-)*)+', shadow)
           print "_____ shadow motif= ", shadow_motif
           #chunkname=shadow_motif[shadow_motif.index('_shadow__')+9:,]
           chunkname=shadow_motif.group(0)
           chunkname=chunkname[0:chunkname.index('_')]
        elif shadow.count('!.'):
          #shadow_motif = re.search('(?<=\!\.)\w+', shadow)
          #chunkname=shadow_motif.group(0)
         chunkname = shadow[shadow.index('!.')+3:shadow.index('_ @')]
        else :# The case the object has no chunk because it's not too large
            chunkname=''
        Log.debug("____Chunkbasename= "+chunkname)
        return chunkname
# This method returns the chunks list using the poolname, the bucketId and the chunk baseName as inpout argument
# An exception is thrown if the object does not exist or there an issue

    def getChunks(self, bucketId, poolName, objectid, chunkBaseName) :
         Log.info("____Get the chunks list using  that id is " + str(bucketId) + " the poolName " + str(poolName) + " and the chunk base name " + str(chunkBaseName))
         cmd = 'rados --pool=' + poolName + '   ls|grep ' + bucketId + '|grep shadow|sort|grep ' + chunkBaseName.replace('-','\-')+'"'
         # on protege les caracteres speciaux en debut de shadow
         if objectid == chunkBaseName:  # The object has no chunk because it's smaller than 4Mo
                cmd = 'rados --pool=' + poolName + '   ls|grep ' + bucketId + '|grep ' + '"'+objectid.replace('-','\-')+'"'
         p = Popen(cmd,
                        shell=True,
                        stdout=PIPE,
                        stderr=PIPE)
         outdata, errdata = p.communicate()
         print("chunks= ")
         print(outdata)
         print(errdata)
         if len(errdata) > 0:
            raise RuntimeError('unable to get the chunks list for the pool % the bucketId %s and the chunkBaseName the manifest %s : %s' % (poolName, bucketId, chunkBaseName, errdata))

         return outdata.split('\n')

# This method retrieves the PG ID for a given pool and an object
# The output looks like this : ['osdmap', 'e11978', 'pool', "'.rgw.buckets'", '(16)', 'object', "'default.4726.8_fileMaps/000001fd/9731af0ba5f8997929df14de6df583aff39ff94b'", '->', 'pg', '16.c1107af', '(16.7) -> up ([9,6], p9) acting ([9,6], p9)\n']
    def getPgId(self, poolName, objectId):
        Log.info("____getPgId(poolname=" + poolName + ", object=" + objectId + ")")
        outdata = self.executeCmd('ceph osd map ', [poolName, ' ' + '\''+objectId+'\''], [])

        pgids = [outdata.split(' -> ')[1].split('(')[0].split(' ')[1],
                 outdata.split(' -> ')[1].split('(')[1].split(')')[0]]
        # pgids={'26.2c717bcf','26.7'}
        print "_____pgids=" , pgids

        return pgids

    def getUser(self, uid):
        Log.debug("____get user with uid " + uid)
        return S3User.view(uid, self.getAdminConnection())
