/**
 * Created by arid6405 on 11/21/13.
 */

angular.module('poolApp', ['ngRoute','ngTable'])
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/pools/aboutPools.html'}).
            when('/detail/:poolName', {controller: DetailCtrl, templateUrl: 'partials/pools/detailPool.html'}).
            when('/new', {controller: CreateCtrl, templateUrl: 'partials/pools/createPool.html'}).
            when('/delete/:poolName', {controller: DeleteCtrl, templateUrl: 'partials/pools/deletePool.html'}).
            otherwise({redirectTo: '/'})

    });

function refreshPools($http, $rootScope, $templateCache) {
    var apiURL = '/ceph-rest-api/';
    $http({method: "get", url: apiURL + "osd/dump.json", cache: $templateCache}).
        success(function (data, status) {
            $rootScope.status = status;
            $rootScope.pools =  data.output.pools;
            $rootScope.tableParams.reload();
        }).
        error(function (data, status) {
            $rootScope.status = status;
            $rootScope.pools =  data || "Request failed";
        });
}

function ListCtrl($rootScope,$http, $filter, ngTableParams) {
    $rootScope.tableParams = new ngTableParams({
        page: 1,            // show first page
        count: 20,          // count per page
        sorting: {
            pool: 'asc'     // initial sorting
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
    refreshPools($http,$rootScope);
}

function DetailCtrl($rootScope,$scope, $http, $templateCache, $routeParams, $location) {
    $scope.poolName = $routeParams.poolName;
    $scope.detailedPool = $rootScope.pools[0];
    for (var i = 0; i < $rootScope.pools.length; i++) {
        if ($rootScope.pools[i].pool_name == $scope.poolName){
            $scope.detailedPool = $rootScope.pools[i];
            break;
        }
    }
}

function DeleteCtrl($scope, $http, $templateCache, $routeParams, $location) {
    $scope.poolName = $routeParams.poolName;
    var apiURL = '/ceph-rest-api/';
    $scope.url = apiURL + "osd/pool/delete?pool=" + $scope.poolName + "&pool2=" + $scope.poolName + "&sure=--yes-i-really-really-mean-it";

    $scope.poolDelete = function () {
        $scope.status = "en cours ...";

        $http({method: "put", url: $scope.url, cache: $templateCache}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                refreshPools($http, $templateCache, $scope);
                $location.url('/');
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
            });
    }
}

function CreateCtrl($rootScope, $scope, $location, $http, $templateCache) {
    $scope.master = {};

    $scope.update = function (pool) {
        $scope.master = angular.copy(pool);
    };

    $scope.reset = function () {
        $scope.pool = angular.copy($scope.master);
    };

    $scope.isUnchanged = function (pool) {
        return angular.equals(pool, $scope.master);
    };

    $scope.reset();

    $scope.createPool = function () {
        $scope.code = null;
        $scope.response = null;

        $scope.url = "/ceph-rest-api/osd/pool/create?pool=" + $scope.pool.name + "&pg_num=" + $scope.pool.pg_num + "&pgp_num=" + $scope.pool.pg_num;

        $http({method: "put", url: $scope.url, cache: $templateCache}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                refreshPools($http, $templateCache, $scope);
                $location.path('/');
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
            });
    };
}