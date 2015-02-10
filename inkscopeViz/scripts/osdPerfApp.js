// angular stuff
// create module for custom directives
var osdPerfApp = angular.module('OsdPerf', ['ngRoute','ngTable','D3Directives','ui.bootstrap','dialogs','InkscopeCommons']);

osdPerfApp.controller("OsdPerfCtrl", function ($rootScope, $http, $filter, ngTableParams) {
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
                $filter('orderBy')($rootScope.osds, params.orderBy()) :
                data;
            $defer.resolve($rootScope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });


    getOsdPerf();
    setInterval(function () {
        getOsdPerf()
    }, 10000);

    var data;

    function getOsdPerf() {
        $rootScope.date = new Date();

        $http({method: "get", url: cephRestApiURL + "osd/perf.json"}).
            success(function (data, status) {
                $rootScope.status = status;
                $rootScope.osds = data.output.osd_perf_infos;
                $rootScope.tableParams.reload();

            }).
            error(function (data, status) {
                $rootScope.status = status;
                $rootScope.osds = [];
            });
    }

});