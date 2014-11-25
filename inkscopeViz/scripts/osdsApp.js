/**
 * Created by Alain Dechorgnat on 1/18/14.
 */
// angular stuff
// create module for custom directives
var OsdsApp = angular.module('OsdsApp', ['D3Directives','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .filter('duration', funcDurationFilter);


OsdsApp.controller("OsdsCtrl", function ($scope, $http, $location ,$window) {
    $scope.dispoModes = ["state" , "used space (%)"];
    $scope.dispoMode = "used space (%)";

    $scope.count = 0;
    $scope.nbOsd = 0;
    $scope.filtered = false;
    getOsds();
    setInterval(function () {getOsds()},15*1000);

    function getOsds() {
        $scope.date = new Date();
        var stateFilter = "";
        var i = $location.absUrl().indexOf("state");
        if ($location.absUrl().indexOf("state") > -1)
            stateFilter = $location.absUrl().substring($location.absUrl().indexOf("state")+5);
        $scope.inFilter = (stateFilter!="")? stateFilter.indexOf("in") > -1 : false;;
        $scope.outFilter = (stateFilter!="")? stateFilter.indexOf("out") > -1 : false;;
        $scope.upFilter = (stateFilter!="")? stateFilter.indexOf("up") > -1 : false;;
        $scope.downFilter = (stateFilter!="")? stateFilter.indexOf("down") > -1 : false;;

        $http({method: "get", url: inkscopeCtrlURL + "ceph/osd?depth=2"}).

            success(function (data, status) {
                $scope.nbOsd = data.length;
                $scope.filtered = $scope.inFilter || $scope.outFilter || $scope.upFilter || $scope.downFilter;
                if ($scope.filtered){
                    var filteredData = [];
                    for ( var i=0; i<data.length;i++){
                        if ($scope.inFilter && !data[i].stat.in) continue;
                        if ($scope.outFilter && data[i].stat.in) continue;
                        if ($scope.upFilter && !data[i].stat.up) continue;
                        if ($scope.downFilter && data[i].stat.up) continue;
                        filteredData.push(data[i]);
                    }
                    data = filteredData;
                }
                for ( var i=0; i<data.length;i++){
                    data[i].id = data[i].node._id;
                    data[i].lastControl = ((+$scope.date)-data[0].stat.timestamp)/1000;
                }

                // search for selected osd, first one if none
                if ($scope.selectedOsd+"" == "undefined"){
                    $scope.osd = data[0];
                    $scope.selectedOsd = data[0].id;
                }
                else{
                    for ( var i=0; i<data.length;i++){
                        if (data[i].id == $scope.selectedOsd){
                            $scope.osd = data[i];
                            break;
                        }
                    }
                }
                $scope.data = data;
                $scope.count = data.length;
                $scope.osdControl = data[0].lastControl;

            }).
            error(function (data, status) {
                $scope.status = status;
                $scope.data = data || "Request failed";
            });
    }

    $scope.osdClass = function (osdin,osdup){
        var osdclass = (osdin == true) ? "osd_in " : "osd_out ";
        osdclass += (osdup == true) ? "osd_up" : "osd_down";
        return osdclass;

    }

    $scope.osdState = function (osdin,osdup){
        var osdstate = (osdin == true) ? "in / " : "out / ";
        osdstate += (osdup == true) ? "up" : "down";
        return osdstate;

    }

    $scope.prettyPrint = function( object){
        return object.toString();
    }

    $scope.prettyPrintKey = function( key){
        return key.replace(new RegExp( "_", "g" )," ")
    }


    $scope.osdSelect = function (osd) {
        $scope.osd = osd;
        $scope.selectedOsd = osd.node._id;
    }

    $scope.osdIn = function (osd) {
        $http({method: "put", url: cephRestApiURL + "osd/in?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }

    $scope.osdOut = function (osd) {
        $http({method: "put", url: cephRestApiURL + "osd/out?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }

    $scope.osdDown = function (osd) {
        $http({method: "put", url: cephRestApiURL + "osd/down?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }

    $scope.addFilter =function(filter){
        if (filter == "in"){
            $scope.outFilter=false;
            $scope.inFilter=true;
            $scope.applyFilters();
            return;
        }
        if (filter == "out"){
            $scope.inFilter=false;
            $scope.outFilter=true;
            $scope.applyFilters();
            return;
        }
        if (filter == "up"){
            $scope.upFilter=true;
            $scope.downFilter=false;
            $scope.applyFilters();
            return;
        }
        if (filter == "down"){
            $scope.upFilter=false;
            $scope.downFilter=true;
            $scope.applyFilters();
            return;
        }
    }

    $scope.removeFilter =function(filter){
        if (filter == "in"){
            $scope.inFilter=false;
            $scope.applyFilters();
            return;
        }
        if (filter == "out"){
            $scope.outFilter=false;
            $scope.applyFilters();
            return;
        }
        if (filter == "up"){
            $scope.upFilter=false;
            $scope.applyFilters();
            return;
        }
        if (filter == "down"){
            $scope.downFilter=false;
            $scope.applyFilters();
            return;
        }
    }

    $scope.applyFilters =function(){
        var filterString="";
        if ($scope.upFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "up";
        }
        if ($scope.downFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "down";
        }
        if ($scope.inFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "in";
        }
        if ($scope.outFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "out";
        }
        $window.location.href = "osds.html?state="+filterString;
    }

    $scope.home = function(){
        $window.location.href = "index.html";
    }

});