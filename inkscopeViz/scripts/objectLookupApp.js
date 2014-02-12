/**
 * Created by Alain Dechorgnat on 1/18/14.
 */
// angular stuff
// create module for custom directives
var ObjectLookupApp = angular.module('ObjectLookupApp', ['D3Directives'])
    .filter('bytes', function () {
        return function (bytes, precision) {
            if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
            if (typeof precision === 'undefined') precision = 1;
            var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
                number = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
        }
    });

ObjectLookupApp.controller("ObjectLookupCtrl", function ($rootScope, $scope, $http) {
    var mongoURL = '/mongoJuice/';
    var restApiURL = '/ceph-rest-api/';

    $scope.pool = "";

    getObjectInfo();
    setInterval(function () {getObjectInfo()},5*1000);

    function getObjectInfo() {
        $rootScope.date = new Date();

        $http({method: "get", url: mongoURL + "ceph/osd?depth=2"}).

            success(function (data, status) {
                $rootScope.data = data;
                if ($rootScope.selectedOsd+"" == "undefined"){
                    $rootScope.osd = data[0];
                    $rootScope.selectedOsd = data[0].node._id;
                }
                else{
                    for ( var i=0; i<data.length;i++){
                        if (data[i].node._id == $rootScope.selectedOsd)$rootScope.osd = data[i];
                    }
                }
            }).
            error(function (data, status) {
                $rootScope.status = status;
                $rootScope.data = data || "Request failed";
            });

        console.log(restApiURL + "osd/map?pool="+ $scope.pool +"&object="+ $scope.objectId );

        if ($scope.pool+"" =="undefined" || $scope.objectId+"" =="undefined") return;
        $http({method: "get", url: restApiURL + "osd/map.json?pool="+$scope.pool+"&object="+$scope.objectId}).

            success(function (data, status) {
                $scope.data = data.output;
                $scope.acting = JSON.parse($scope.data.acting);
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
        //console.log("osd:"+osd);
        for (var i=0 ;i<$rootScope.data.length;i++){
            if ($rootScope.data[i].node._id+"" == osd+"") {
                //console.log("osd found "+$rootScope.data[i]);
                return $rootScope.data[i];
            }
        }
        //console.log("osd not found");
    }


});