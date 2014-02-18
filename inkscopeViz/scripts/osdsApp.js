/**
 * Created by Alain Dechorgnat on 1/18/14.
 */
// angular stuff
// create module for custom directives
var OsdsApp = angular.module('OsdsApp', ['D3Directives'])
    .filter('bytes', funcBytesFilter)
    .filter('duration', funcDurationFilter);

OsdsApp.controller("OsdsCtrl", function ($rootScope, $http) {

    getOsds();
    setInterval(function () {getOsds()},10*1000);

    function getOsds() {
        $rootScope.date = new Date();
        //var stateFilter = $routeParams.state;
        //console.log();
        now = $rootScope.date.getTime();
        $http({method: "get", url: inkscopeCtrlURL + "ceph/osd?depth=2"}).

            success(function (data, status) {
                $rootScope.data = data;
                for ( var i=0; i<data.length;i++){
                    data[i].id = data[i].node._id;
                    data[i].lastControl = ((+$rootScope.date)-data[0].stat.timestamp)/1000;
                }

                // search for selected osd, first one if none
                if ($rootScope.selectedOsd+"" == "undefined"){
                    $rootScope.osd = data[0];
                    $rootScope.selectedOsd = data[0].id;
                }
                else{
                    for ( var i=0; i<data.length;i++){
                        if (data[i].id == $rootScope.selectedOsd){
                            $rootScope.osd = data[i];
                            break;
                        }
                    }
                }
            }).
            error(function (data, status) {
                $rootScope.status = status;
                $rootScope.data = data || "Request failed";
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

    $rootScope.osdIn = function (osd) {
        $http({method: "put", url: cephRestApiURL + "osd/in?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }

    $rootScope.osdOut = function (osd) {
        $http({method: "put", url: cephRestApiURL + "osd/out?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }

    $rootScope.osdDown = function (osd) {
        $http({method: "put", url: cephRestApiURL + "osd/down?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }




});