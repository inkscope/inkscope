/**
 * Created by arid6405 on 11/21/13.
 */

angular.module('pgStucksApp', ['ngRoute','ngTable','D3Directives','ui.bootstrap','dialogs','InkscopeCommons' ])
    .filter('bytes', funcBytesFilter)
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/pg/aboutPg.html'}).
            when('/detail/:pgid', {controller: ListCtrl, templateUrl: 'partials/pg/detailPg.html'}).
            otherwise({redirectTo: '/'})
    });

function refreshPgs($http, $scope, $templateCache) {
    $http({method: "get", url: cephRestApiURL + "pg/dump_stuck.json", cache: $templateCache}).
        success(function (data, status) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.pgs = data.output;
            $scope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            alert("refresh pgs failed with status "+status);
            $scope.status = status;
            $scope.pgs =  [];
        });
}

function ListCtrl($rootScope, $scope,$http, $filter, ngTableParams, $location) {
    var search = $location.search();
    $scope.search = {};
    if (typeof search.poolId !=="undefined")
        $scope.search.pgid = search.poolId+'.';
    $scope.tableParams = new ngTableParams({
        page: 1,            // show first page
        count: 20,          // count per page
        sorting: {
            pgid: 'asc'     // initial sorting
        }
    }, {
        counts: [], // hide page counts control
        total: 1,  // value less than count hide pagination
        getData: function ($defer, params) {
            // use build-in angular filter
            $scope.orderedData = params.sorting() ?
                $filter('orderBy')($scope.pgs, params.orderBy()) :
                data;
            $defer.resolve($scope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });

    //$rootScope.getOsdInfo();

    refreshPgs($http,$scope);
    setInterval(function(){
        refreshPgs($http, $scope)
    }, 60000);
    var data;


    $scope.showDetail = function (pg) {
        if (typeof pg.acting ==="object"){
            for (var i=0; i<pg.acting.length;i++){
                if (pg.acting[i] == 2147483647) pg.acting[i] = -1;
            }
        }
        // new format in Giant
        if (typeof pg.acting ==="string"){
            pg.acting = pg.acting.replace(new RegExp("2147483647", 'g'),"-1");
            pg.acting = JSON.parse(pg.acting);
        }
        if (typeof pg.up ==="object"){
            for (var i=0; i<pg.up.length;i++){
                if (pg.up[i] == 2147483647) pg.up[i] = -1;
            }
        }
        // new format in Giant
        if (typeof pg.up ==="string"){
            pg.up = pg.up.replace(new RegExp("2147483647", 'g'),"-1");
            pg.up = JSON.parse(pg.up);
        }

        $scope.detailedPg = pg;
        $location.path('/detail/'+pg.pgid);
    }
}

