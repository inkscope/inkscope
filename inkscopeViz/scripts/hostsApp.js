/**
 * Created by arid6405 on 2014/07/28.
 */

angular.module('hostsApp', ['ngRoute','ngTable','D3Directives','ui.bootstrap','dialogs','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/hosts/aboutHosts.html'}).
            when('/detail/:hostId', {controller: DetailCtrl, templateUrl: 'partials/hosts/detailHost.html'}).
            otherwise({redirectTo: '/'})
    });

function refreshHosts($rootScope, $http, $scope, $templateCache) {
    //while (typeof $rootScope.fsid === 'undefined')  ;
    $http({method: "get", url: inkscopeCtrlURL + $rootScope.fsid + "/hosts", cache: $templateCache}).
        success(function (data, status) {
            $scope.date = new Date();
            $scope.status = status;
            $scope.hosts =  data;
            $scope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            //alert("refresh hosts failed with status "+status);
            $scope.status = status;
            $scope.hosts =  data || "Request failed";
        });
}

function ListCtrl($rootScope, $scope,$http, $filter, ngTableParams, $location) {
    $scope.tableParams = new ngTableParams({
        page: 1,            // show first page
        count: 20,          // count per page
        sorting: {
            _id: 'asc'     // initial sorting
        }
    }, {
        counts: [], // hide page counts control
        total: 1,  // value less than count hide pagination
        getData: function ($defer, params) {
            // use build-in angular filter
            $scope.orderedData = params.sorting() ?
                $filter('orderBy')($scope.hosts, params.orderBy()) :
                data;
            $defer.resolve($scope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });

    // start refresh when fsid is available
    var waitForFsid = function ($rootScope, $http,$scope){
        typeof $rootScope.fsid !== "undefined"? startRefreshHost($rootScope, $http,$scope) : setTimeout(function () {waitForFsid($rootScope, $http,$scope)}, 1000);
        function startRefreshHost($rootScope, $http,$scope){
            refreshHosts($rootScope, $http,$scope);
            setInterval(function(){
                refreshHosts($rootScope,$http, $scope)
            }, 10000);
        }
    }
    waitForFsid($rootScope, $http,$scope);

    var data;

    $scope.showDetail = function (hostid) {
        $location.path('/detail/'+hostid);
    }
}

function DetailCtrl($rootScope, $scope, $http, $routeParams, $dialogs) {
    $scope.detailedHost={};
    $scope.detailedHost._id = $routeParams.hostId;
    var data ={"_id" : $routeParams.hostId}
    var uri = inkscopeCtrlURL + $rootScope.fsid+"/hosts?depth=2";
    $http({method: "post", data: data, url: uri }).
        success(function (data, status) {
            $scope.detailedHost =  data[0];
            $scope.status = status;
        }).
        error(function (data, status, headers) {
            $scope.status = status;
            $scope.hosts =  data || "Request failed";
            $dialogs.error("<h3>Can't display hosts with id "+$routeParams.hostId+"</h3><br>"+$scope.data);
        });
}