/**
 * Created by Alain Dechorgnat on 1/18/14.
 */
// angular stuff
// create module for custom directives
var OsdsApp = angular.module('OsdsApp', ['D3Directives'])
    .filter('bytes', function () {
        return function (bytes, precision) {
            if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
            if (typeof precision === 'undefined') precision = 1;
            var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
                number = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
        }
    });

OsdsApp.controller("OsdsCtrl", function ($rootScope, $http) {
    var mongoURL = '/mongoJuice/';
    var restApiURL = '/ceph-rest-api/';

    getOsds();
    setInterval(function () {getOsds()},5*1000);

    function getOsds() {
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
        $http({method: "put", url: restApiURL + "osd/in?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }

    $rootScope.osdOut = function (osd) {
        $http({method: "put", url: restApiURL + "osd/out?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }

    $rootScope.osdDown = function (osd) {
        $http({method: "put", url: restApiURL + "osd/down?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }




});