// angular stuff
// create module for custom directives
var poolUsageApp = angular.module('PoolUsage', ['D3Directives', 'ngTable'])
    .filter('bytes', funcBytesFilter);

poolUsageApp.controller("PoolUsageCtrl", function ($rootScope, $http, $templateCache, $filter, ngTableParams) {
    var apiURL = '/ceph-rest-api/';

    $rootScope.tableParams = new ngTableParams({
        page: 1,            // show first page
        count: 20,          // count per page
        sorting: {
            id: 'asc'     // initial sorting
        }
    }, {
        counts: [], // hide page counts control
        total: 1,  // value less than count hide pagination
        getData: function ($defer, params) {
            // use build-in angular filter
            $rootScope.orderedData = params.sorting() ?
                $filter('orderBy')($rootScope.pools, params.orderBy()) :
                data;
            $defer.resolve($rootScope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });


    getPoolUsage();
    setInterval(function () {
        getPoolUsage()
    }, 10000);

    var data;

    function getPoolUsage() {
        $http({method: "get", url: apiURL + "df.json"}).
            success(function (data, status) {
                $rootScope.status = status;
                $rootScope.data = data;
                $rootScope.pools = data.output.pools;
                $rootScope.stats = data.output.stats;
                var totalUsed = data.output.stats.total_used;
                var totalSpace = data.output.stats.total_space;
                $rootScope.percentUsed = totalUsed / totalSpace;
                $rootScope.tableParams.reload();

            }).
            error(function (data, status) {
                $rootScope.status = status;
                $rootScope.pools = data || "Request failed";
                $rootScope.stats.total_used = "N/A";
                $rootScope.stats.total_space = "N/A";
            });
    }

});