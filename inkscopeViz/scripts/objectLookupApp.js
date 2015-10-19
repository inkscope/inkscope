/**
 * Created by Alain Dechorgnat on 1/18/14.
 */
// angular stuff
// create module for custom directives
var ObjectLookupApp = angular.module('ObjectLookupApp', ['D3Directives','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .filter('duration',funcDurationFilter);

ObjectLookupApp.controller("ObjectLookupCtrl", function ($rootScope, $scope, $http) {
    $scope.pool = {};

    // start refresh when fsid is available
    var waitForFsid = function ($rootScope, $http,$scope){
        typeof $rootScope.fsid !== "undefined"? startRefresh($rootScope, $http,$scope) : setTimeout(function () {waitForFsid($rootScope, $http,$scope)}, 1000);
        function startRefresh($rootScope, $http,$scope){
            getOsdInfo();
            setInterval(function () {getOsdInfo()},10*1000);
        }
    }
    waitForFsid($rootScope, $http,$scope);


    getPoolList($http,$rootScope);

    getObjectInfo();
    getCrushMap();

    setInterval(function () {getObjectInfo()},5*1000);

    function getCrushMap(){
        $http({method: "get", url: cephRestApiURL + "osd/crush/dump.json"}).
            success(function (data, status) {
                $rootScope.rules = data.output.rules;
                $rootScope.rawbuckets = data.output.buckets;
            }).
            error(function (data, status) {
                $rootScope.status = status;
            });
    }


    function getOsdInfo(){
        $scope.date = new Date();
        $http({method: "get", url: inkscopeCtrlURL + $rootScope.fsid+"/osd?depth=2"}).

            success(function (data, status) {
                $rootScope.data = data;
                for ( var i=0; i<data.length;i++){
                    data[i].id = data[i]._id;
                    if ( data[i].stat == null)
                        data[i].lastControl = "-";
                    else
                        data[i].lastControl = ((+$scope.date)-data[i].stat.timestamp)/1000;
                }
                data[-1]={};
                data[-1].id=-1;
                data[-1].stat=null;
                data[2147483647]={};
                data[2147483647].id=-1;
                data[2147483647].stat=null;

                $scope.$apply();
            }).
            error(function (data, status) {
                $rootScope.status = status;
                $rootScope.data = data || "Request failed";
            });
    }


    function getObjectInfo() {
        $rootScope.date = new Date();
        if ($scope.pool+"" =="undefined" || $scope.objectId+"" =="undefined") return;

        console.log(cephRestApiURL + "osd/map?pool="+ $scope.pool.poolname +"&object="+ $scope.objectId );
        $http({method: "get", url: cephRestApiURL + "osd/map.json?pool="+$scope.pool.poolname+"&object="+$scope.objectId})

            .success(function (data, status) {
                $scope.data = data.output;

                // new format in Giant
                if (typeof $scope.data.acting ==="string"){
                    $scope.data.acting = $scope.data.acting.replace(new RegExp("2147483647", 'g'),"-1");
                    $scope.data.acting = JSON.parse($scope.data.acting);
                }
                $scope.acting = $scope.data.acting;

                // new format in Giant
                if (typeof $scope.data.up ==="string"){
                    $scope.data.up = $scope.data.up.replace(new RegExp("2147483647", 'g'),"-1");
                    $scope.data.up = JSON.parse($scope.data.up);
                }

                $scope.acting_message ="";
                $scope.up_message = "";

                if ($scope.data.acting.indexOf(-1)>0 || $scope.data.acting.indexOf(2147483647)>0)  $scope.acting_message = " - incomplete pg"
                if ($scope.data.up.indexOf(-1)>0 || $scope.data.up.indexOf(2147483647)>0)  $scope.up_message = " - incomplete pg"


                $scope.acting = $scope.data.acting;
                $scope.data.acting += $scope.acting_message;
                $scope.data.up += $scope.up_message;

             })

            .error(function (data, status) {
                $rootScope.status = status;
                $scope.data = {"pgid":"not found","acting":"","up":""};
            });

    }

    $rootScope.osdClass = function (osdin,osdup){
        var osdclass = (osdin == true) ? "osd_in " : "osd_out ";
        osdclass += (osdup == true) ? "osd_up" : "osd_down";
        return osdclass;

    }

    $rootScope.osdClassForId = function (osdid){
        if ((osdid>=0) &&($rootScope.getOsd(osdid).stat != null)){
            osdin = $rootScope.getOsd(osdid).stat.in;
            osdup = $rootScope.getOsd(osdid).stat.up;
            return $rootScope.osdClass(osdin,osdup);
        }
        else {
            if (($rootScope.getOsd(osdid)==null) ||($rootScope.getOsd(osdid).stat == null))
                console.log("stat null for osd:"+osdid);
            return ' osd_unknown ';
        }
    }

    $rootScope.osdState = function (osdid){
        if ((osdid>=0) &&($rootScope.getOsd(osdid).stat != null)){
            osdin = $rootScope.getOsd(osdid).stat.in;
            osdup = $rootScope.getOsd(osdid).stat.up;
            var osdstate = (osdin == true) ? "in / " : "out / ";
            osdstate += (osdup == true) ? "up" : "down";
            return osdstate;
        }
        else {
            return 'unknown state';
        }


    }

    $scope.prettifyStep = function(step){
        if (step.op == "take")
            return "take "+ $scope.getBucketForId(step.item).name;
        if (step.op == "emit")
            return "emit";
        var txtStep = step.op.replace("_"," ") +" "+ step.num;
        if (typeof step.type !== "undefined")
            txtStep +=" type "+ step.type;
        return txtStep;

    };

    $scope.getBucketForId= function(id){
        for (var i = 0; i < $scope.rawbuckets.length; i++) {
            if ( $scope.rawbuckets[i].id == id) return $scope.rawbuckets[i];
        }
    }

    $rootScope.prettyPrint = function( object){
        return object.toString();
    }

    $rootScope.prettyPrintKey = function( key){
        return key.replace(new RegExp( "_", "g" )," ")
    }


    $rootScope.osdSelect = function (osd) {
        $rootScope.osd = osd;
        $rootScope.selectedOsd = osd.id;
    }

    $rootScope.getOsd = function (osd) {
        //console.log("search for osd:"+osd);
        if (osd+"" =="-1") return null;
        for (var i=0 ;i<$rootScope.data.length;i++){
            if ($rootScope.data[i].id+"" == osd+"") {
                //console.log("osd found "+JSON.stringify($rootScope.data[i]));
                return $rootScope.data[i];
            }
        }
        //console.log("osd "+osd+" not found");
        return null;
    }

    $rootScope.getPoolType = function (id) {
        if (id+""=="1") return "replicated";
        if (id+""=="2") return "raid-4";
        if (id+""=="3") return "erasure";
        return "N/A";
    };

    $rootScope.getPoolInfo = function(pool){
        $http({method: "get", url: inkscopeCtrlURL + "pools/"+pool.poolnum}).
            success(function (data, status) {
                $scope.selectedPool = data.output;
                // search for rule
                var ruleset = $scope.selectedPool.crush_ruleset;
                for (var i in $scope.rules){
                    var rule = $scope.rules[i];
                    if (rule.ruleset == ruleset){
                        $scope.selectedRule = rule;
                        break;
                    }
                }
            }).
            error(function (data, status) {
                $scope.selectedPool = {};
                $rootScope.status = status;
            });
    }



});