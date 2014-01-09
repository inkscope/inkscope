// angular stuff
// create module for custom directives
var poolUsageApp = angular.module('PoolUsage', ['D3Directives'])
    .filter('bytes', function () {
        return function (bytes, precision) {
            if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
            if (typeof precision === 'undefined') precision = 1;
            var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
                number = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
        }
    });

poolUsageApp.controller("PoolUsageCtrl", function ($rootScope, $http, $templateCache) {
    var apiURL = '/ceph-rest-api/';
    getPoolUsage();
    setTimeout(function () {getPoolUsage()}, 10000);

    function getPoolUsage(){
        $http({method: "get", url: apiURL + "df.json"}).
            success(function (data, status) {
                $rootScope.status = status;
                $rootScope.data = data;
                $rootScope.pools = data.output.pools;
                $rootScope.stats = data.output.stats;
                var totalUsed = data.output.stats.total_used;
                var totalSpace = data.output.stats.total_space;
                $rootScope.percentUsed = totalUsed / totalSpace;
            }).
            error(function (data, status) {
                $rootScope.status = status;
                $rootScope.pools = data || "Request failed";
                $rootScope.stats.total_used = "N/A";
                $rootScope.stats.total_space = "N/A";
            });
    }
});