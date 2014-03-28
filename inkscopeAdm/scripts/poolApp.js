/**
 * Created by arid6405 on 11/21/13.
 */

angular.module('poolApp', ['ngRoute','ngTable','ui.bootstrap','dialogs'])
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

function DetailCtrl($rootScope,$scope, $http, $routeParams) {
    var uri = inkscopeCtrlURL + "pools/"+$routeParams.poolNum ;
    $http({method: "get", url: uri }).
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
    $scope.poolNum = $routeParams.poolNum;
    $scope.uri = inkscopeCtrlURL + "pools/" + $scope.poolNum;

    $scope.poolDelete = function () {
        $scope.status = "en cours ...";

        $http({method: "delete", url: $scope.uri }).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                refreshPools($http, $scope);
                $location.url('/');
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
            });
    }
}

function CreateCtrl($rootScope, $scope, $location, $http, $dialogs) {

    // functions declaration
    $scope.update = function (pool) {
        $scope.master = angular.copy(pool);
    };

    $scope.reset = function () {
        $scope.pool = angular.copy($scope.master);
    };

    $scope.isUnchanged = function (pool) {
        return angular.equals(pool, $scope.master);
    };

    $scope.createPool = function () {
        $scope.code = "";
        $scope.response = "";

        $scope.uri = inkscopeCtrlURL+"pools/";

        $http({method: "post", url: $scope.uri, data: "json="+JSON.stringify($scope.pool), headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                $dialogs.notify("Pool creation","Pool <strong>"+$scope.pool.name+"</strong> was created");
                refreshPools($http, $scope);
                $location.path('/');
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;

                $dialogs.error("<h3>Cant' create pool <strong>"+$scope.pool.name+"</strong> !</h3> <br>"+$scope.data);

            });
    };

    // init
    $scope.code = "";
    $scope.response = "";

    // default values
    $scope.master = {};
    $scope.pool = {};
    $scope.master.crash_replay_interval = 0;
    $scope.master.quota_max_bytes = 0;
    $scope.master.quota_max_objects = 0;
    /*
    $scope.pool.crash_replay_interval = 0;
    $scope.pool.quota_max_bytes = 0;
    $scope.pool.quota_max_objects = 0;
    */
    $scope.reset();

}