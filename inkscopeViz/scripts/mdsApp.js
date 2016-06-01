/**
 * Created by Alain Dechorgnat on 2015/02/04.
 */
// angular stuff
// create module for custom directives
var MdsApp = angular.module('MdsApp', ['InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .filter('duration', funcDurationFilter);


MdsApp.controller("MdsCtrl", function ($rootScope, $scope, $http, $location ,$window) {

    getMds();
    setInterval(function () {getMds()},15*1000);

    refreshPools($http,$scope);
    setInterval(function(){
        refreshPools($http, $scope)
    }, 60*1000);


    function getMds() {
        $scope.date = new Date();

        $http({method: "get", url: cephRestApiURL + "mds/stat.json"})
            .success(function (data, status) {
                if (typeof data.output.mdsmap !== "undefined")
                    $scope.mdsmap = data.output.mdsmap;
                else
                    $scope.mdsmap = data.output.fsmap;
                $scope.count = data.length;
                if (typeof $scope.mdsmap.fs_name === "undefined") $scope.mdsmap.fs_name = "N/A";
            }).
        error(function (data, status) {
            $scope.status = status;
            $scope.data = data || "Request failed";
        });
    }

    $scope.prettyPrint = function( object){
        return object.toString();
    }

    $scope.prettyPrintKey = function( key){
        return key.replace(new RegExp( "_", "g" )," ")
    }

    $scope.home = function(){
        $window.location.href = "index.html";
    }

    $scope.getPoolLabels = function(poolList){
        mystring = "";
        for (var i in poolList){
            if (i>0) mystring +=", ";
            mystring += $scope.getPoolLabel(poolList[i]);
        }
        return mystring;
    }
    $scope.getPoolLabel = function(poolid){
        if ((typeof poolid == "object")&&(poolid.length ==0)) return "none";
        if (poolid== -1) return "-1";
        for (var i in $scope.pools)if (poolid == $scope.pools[i].id) return poolid +" (<a href='poolManagement.html#/detail/"+poolid+"'>"+ $scope.pools[i].name+"</a>)";
        return poolid +" (unknown)";
    }

    function refreshPools($http, $scope, $templateCache) {
        $http({method: "get", url: cephRestApiURL + "df.json", cache: $templateCache}).
            success(function (data, status) {
                $scope.status = status;
                $scope.date = new Date();
                $scope.pools =  data.output.pools;
            }).
            error(function (data, status, headers) {
                //alert("refresh pools failed with status "+status);
                $scope.status = status;
                $scope.pools =  [];
            });
    }

});