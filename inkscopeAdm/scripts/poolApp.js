/**
 * Created by arid6405 on 11/21/13.
 */

angular.module('poolApp', ['ngRoute','ngTable'])
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/pools/aboutPools.html'}).
            when('/detail/:poolNum', {controller: DetailCtrl, templateUrl: 'partials/pools/detailPool.html'}).
            when('/new', {controller: CreateCtrl, templateUrl: 'partials/pools/createPool.html'}).
            when('/delete/:poolNum', {controller: DeleteCtrl, templateUrl: 'partials/pools/deletePool.html'}).
            otherwise({redirectTo: '/'})

    });

function refreshPools($http, $rootScope, $templateCache) {
    $http({method: "get", url: inkscopeCtrlURL + "pools/", cache: $templateCache}).
        success(function (data, status) {
            $rootScope.status = status;
            $rootScope.pools =  data.output;
            $rootScope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            //alert("refresh pools failed with status "+status);
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

function DetailCtrl($rootScope,$scope, $routeParams) {

    $http({method: "get", url: inkscopeCtrlURL + "pools/"+$routeParams.poolNum }).
        success(function (data, status) {
            $rootScope.status = status;
            $rootScope.detailedPool =  data.output;
        }).
        error(function (data, status, headers) {
            alert("pools with num "+$routeParams.poolNum+" not found");
            $rootScope.status = status;
            $rootScope.pools =  data || "Request failed";
        });
}

function DeleteCtrl($scope, $http, $templateCache, $routeParams, $location) {
    $scope.poolName = $routeParams.poolName;
    $scope.uri = inkscopeCtrlURL + "pools/" + $scope.poolName;

    $scope.poolDelete = function () {
        $scope.status = "en cours ...";

        $http({method: "delete", url: $scope.uri, cache: $templateCache}).
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

        $scope.uri = inkscopeCtrlURL+"pools/" + $scope.pool.name;
        $scope.poolData = {
            'pg_num': $scope.pg_num ,
            'size' : 2
        };

        $http({method: "post", url: $scope.uri, data: $scope.poolData, cache: $templateCache}).
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