/**
 * Created by Alain Dechorgnat on 1/18/14.
 */
// angular stuff
// create module for custom directives
var ObjectLookupApp = angular.module('ObjectLookupApp', ['D3Directives','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .filter('duration',funcDurationFilter);

ObjectLookupApp.controller("ObjectLookupCtrl", function ($rootScope, $scope, $http) {
    $scope.pool = "";

    getPoolsInfo();

    getOsdInfo();
    setInterval(function () {getOsdInfo()},10*1000);

    getObjectInfo();
    setInterval(function () {getObjectInfo()},5*1000);

    function getPoolsInfo() {
        $http({method: "get", url: cephRestApiURL + "df.json"}).
            success(function (data, status) {
                $scope.status = status;
                $scope.date = new Date();
                $scope.pools =  data.output.pools;
            }).
            error(function (data, status, headers) {
                //alert("refresh pools failed with status "+status);
                $scope.status = status;
                $scope.date = new Date();
                $scope.pools =  [];
            });
    }

    function getOsdInfo(){
        $http({method: "get", url: inkscopeCtrlURL + "ceph/osd?depth=2"}).

            success(function (data, status) {
                $rootScope.data = data;
                data[-1]={};
                data[-1].id=-1;
                data[2147483647]={};
                data[2147483647].id=-1;

                for ( var i=0; i<data.length;i++){
                    data[i].id = data[i].node._id;
                    data[i].lastControl = ((+$rootScope.date)-data[0].stat.timestamp)/1000;
                }
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

        console.log(cephRestApiURL + "osd/map?pool="+ $scope.pool +"&object="+ $scope.objectId );
        $http({method: "get", url: cephRestApiURL + "osd/map.json?pool="+$scope.pool+"&object="+$scope.objectId}).

            success(function (data, status) {
                $scope.data = data.output;
                $scope.acting_message ="";
                $scope.up_message = "";
                if ($scope.data.acting.contains("-1") || $scope.data.acting.contains("2147483647"))  $scope.acting_message = " - incomplete pg"
                if ($scope.data.up.contains("-1") || $scope.data.up.contains("2147483647"))  $scope.up_message = " - incomplete pg"
                $scope.data.acting = $scope.data.acting.replace(new RegExp("2147483647", 'g'),"-1");
                $scope.data.up = $scope.data.up.replace(new RegExp("2147483647", 'g'),"-1");
                $scope.acting = JSON.parse($scope.data.acting);
                $scope.data.acting += $scope.acting_message;
                $scope.data.up += $scope.up_message;
            }).
            error(function (data, status) {
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
        var osdin = "out";
        var osdup = "down";
        if (osdid>=0){
            osdin = $rootScope.getOsd(osdid).stat.in;
            osdup = $rootScope.getOsd(osdid).stat.up;
        }
        return $rootScope.osdClass(osdin,osdup);
    }

    $rootScope.osdState = function (osdin,osdup){
        var osdstate = (osdin == true) ? "in / " : "out / ";
        osdstate += (osdup == true) ? "up" : "down";
        return osdstate;

    }

    $rootScope.prettyPrint = function( object){
        return object.toString();
    }

    $rootScope.prettyPrintKey = function( key){
        return key.replace(new RegExp( "_", "g" )," ")
    }


    $rootScope.osdSelect = function (osd) {
        $rootScope.osd = osd;
        $rootScope.selectedOsd = osd.node._id;
    }

    $rootScope.getOsd = function (osd) {
        console.log("osd:"+osd);
        for (var i=0 ;i<$rootScope.data.length;i++){
            if ($rootScope.data[i].node._id+"" == osd+"") {
                //console.log("osd found "+$rootScope.data[i]);
                return $rootScope.data[i];
            }
        }
        console.log("osd not found");
    }


});