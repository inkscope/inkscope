/**
 * Created by Alain Dechorgnat on 2014/02/19.
 */
// angular stuff
// create module for custom directives
var ProbesApp = angular.module('ProbesApp', [])
    .filter('duration', funcDurationFilter);

ProbesApp.controller("ProbesCtrl", function ($scope, $http) {
    getCephProbes();
    setInterval(function () {getCephProbes()},10*1000);
    getSysProbes();
    setInterval(function () {getSysProbes()},10*1000);

    function getCephProbes() {
        $scope.date = new Date();

        $http({method: "get", url: inkscopeCtrlURL + "ceph/cephprobe"}).

            success(function (data,status,headers,config ) {
                $scope.cephprobes = data;
                for ( var i=0; i< $scope.cephprobes.length;i++){
                    $scope.cephprobes[i].lastHB = (headers().timestamp-$scope.cephprobes[i].timestamp)/1000;
                    $scope.cephprobes[i].class = $scope.probeClass($scope.cephprobes[i].lastHB);
                }

            }).
            error(function (data, status) {
                $scope.status = status;
                $scope.data = data || "Request failed";
            });
    }

    function getSysProbes() {
        $scope.date = new Date();
        now = $scope.date.getTime();
        $http({method: "get", url: inkscopeCtrlURL + "ceph/sysprobe"}).

            success(function (data, status,headers) {
                $scope.sysprobes = data;
                for ( var i=0; i< $scope.sysprobes.length;i++){
                    $scope.sysprobes[i].lastHB = (headers().timestamp-$scope.sysprobes[i].timestamp)/1000;
                    $scope.sysprobes[i].class = $scope.probeClass($scope.sysprobes[i].lastHB);
                }

            }).
            error(function (data, status) {
                $scope.status = status;
                $scope.data = data || "Request failed";
            });
    }

    $scope.probeClass = function (lastHB){
        if (lastHB<10) return "probe probe_OK";
        if (lastHB<60) return "probe probe_WARN";
        return "probe probe_ERROR";

    }


});