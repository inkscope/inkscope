/**
 * Created by Alain Dechorgnat on 9/19/14.
 */
var FlagsApp = angular.module('FlagsApp', []);

FlagsApp.controller("flagsCtrl", function ($scope, $http) {
    var apiURL = '/ceph-rest-api/';

    refreshData();

    $scope.flagList = ['pause','noup','nodown','noout', 'noin','nobackfill','norecover','noscrub','nodeep-scrub','notieragent'];

    function refreshData() {
        //
        $scope.date = new Date();
        $http({method: "get", url: apiURL + "osd/dump.json",timeout:4000})
            .success(function (data, status){
                console.log("refreshing flags...");
                $scope.status = "";
                $scope.flags = data.output.flags;
                $scope.setFlagList = $scope.flags.split(',');
                $scope.status = "";
            })
            .error(function (data) {
                $scope.status = "Flags not found";
            });
    }

    $scope.isSet=function(flag){
        if (flag=="pause") flag='pauserd';
        var rep = $.inArray(flag, $scope.setFlagList) > -1
        return rep;
    }

    $scope.setFlag=function(flag){
        $http({method: "put", url: apiURL + "osd/set?key="+flag,timeout:4000})
            .success(function (){
                refreshData();
            })
            .error(function (data) {
                $scope.status = "Flags not found : "+data;
            })
    }

    $scope.unsetFlag=function(flag){
        $http({method: "put", url: apiURL + "osd/unset?key="+flag,timeout:4000})
            .success(function (){
                refreshData();
            })
            .error(function (data) {
                $scope.status = "Flags not found : "+data;
            })
    }
});