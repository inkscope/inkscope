/**
 * Created by Alain Dechorgnat on 1/18/14.
 */
// angular stuff
// create module for custom directives
var OsdsApp = angular.module('OsdsApp', ['D3Directives'])
    .filter('bytes', funcBytesFilter)
    .filter('duration', funcDurationFilter);


OsdsApp.controller("OsdsCtrl", function ($rootScope, $http, $location ,$window) {

    $rootScope.count = 0;
    $rootScope.nbOsd = 0;
    $rootScope.filtered = false;
    getOsds();
    setInterval(function () {getOsds()},10*1000);

    function getOsds() {
        $rootScope.date = new Date();
        var stateFilter = "";
        var i = $location.absUrl().indexOf("state");
        if ($location.absUrl().indexOf("state") > -1)
            stateFilter = $location.absUrl().substring($location.absUrl().indexOf("state")+5);
        $rootScope.inFilter = (stateFilter!="")? stateFilter.indexOf("in") > -1 : false;;
        $rootScope.outFilter = (stateFilter!="")? stateFilter.indexOf("out") > -1 : false;;
        $rootScope.upFilter = (stateFilter!="")? stateFilter.indexOf("up") > -1 : false;;
        $rootScope.downFilter = (stateFilter!="")? stateFilter.indexOf("down") > -1 : false;;

        $http({method: "get", url: inkscopeCtrlURL + "ceph/osd?depth=2"}).

            success(function (data, status) {
                $rootScope.nbOsd = data.length;
                $rootScope.filtered = $rootScope.inFilter || $rootScope.outFilter || $rootScope.upFilter || $rootScope.downFilter;
                if ($rootScope.filtered){
                    var filteredData = [];
                    for ( var i=0; i<data.length;i++){
                        if ($rootScope.inFilter && !data[i].stat.in) continue;
                        if ($rootScope.outFilter && data[i].stat.in) continue;
                        if ($rootScope.upFilter && !data[i].stat.up) continue;
                        if ($rootScope.downFilter && data[i].stat.up) continue;
                        filteredData.push(data[i]);
                    }
                    data = filteredData;
                }
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
                $rootScope.data = data;
                $rootScope.count = data.length;
                $rootScope.osdControl = data[0].lastControl;

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

    $rootScope.addFilter =function(filter){
        if (filter == "in"){
            $rootScope.outFilter=false;
            $rootScope.inFilter=true;
            $rootScope.applyFilters();
            return;
        }
        if (filter == "out"){
            $rootScope.inFilter=false;
            $rootScope.outFilter=true;
            $rootScope.applyFilters();
            return;
        }
        if (filter == "up"){
            $rootScope.upFilter=true;
            $rootScope.downFilter=false;
            $rootScope.applyFilters();
            return;
        }
        if (filter == "down"){
            $rootScope.upFilter=false;
            $rootScope.downFilter=true;
            $rootScope.applyFilters();
            return;
        }
    }

    $rootScope.removeFilter =function(filter){
        if (filter == "in"){
            $rootScope.inFilter=false;
            $rootScope.applyFilters();
            return;
        }
        if (filter == "out"){
            $rootScope.outFilter=false;
            $rootScope.applyFilters();
            return;
        }
        if (filter == "up"){
            $rootScope.upFilter=false;
            $rootScope.applyFilters();
            return;
        }
        if (filter == "down"){
            $rootScope.downFilter=false;
            $rootScope.applyFilters();
            return;
        }
    }

    $rootScope.applyFilters =function(){
        var filterString="";
        if ($rootScope.upFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "up";
        }
        if ($rootScope.downFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "down";
        }
        if ($rootScope.inFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "in";
        }
        if ($rootScope.outFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "out";
        }
        $window.location.href = "osds.html?state="+filterString;
    }

    $rootScope.home = function(){
        $window.location.href = "index.html";
    }

});