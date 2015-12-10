/**
 * Created by arid6405 on 29/04/2014.
 */

angular.module('bucketApp', ['ngRoute','ui.bootstrap','InkscopeCommons'])
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/buckets/aboutBuckets.html'}).
            when('/new', {controller: CreateCtrl, templateUrl: 'partials/buckets/createBucket.html'}).
            when('/detail/:bucketName', {controller: DetailCtrl, templateUrl: 'partials/buckets/detailBucket.html'}).
            when('/changeOwner/:bucketName/:actualOwner', {controller: ChangeOwnerCtrl, templateUrl: 'partials/buckets/changeOwner.html'}).
            when('/delete/:bucketName', {controller: DeleteCtrl, templateUrl: 'partials/buckets/deleteBucket.html'}).
            otherwise({redirectTo: '/'})
    })
    .filter('bytes', funcBytesFilter)
    .filter('prettifyArray', funcPrettifyArrayFilter);


function refreshBuckets($http, $scope) {
    $http({method: "get", url: inkscopeCtrlURL + "S3/bucket", data:"stats=False"}).
        success(function (data, status) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.buckets =  data;
            $scope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            //alert("refresh buckets failed with status "+status);
            $scope.status = "Can't list buckets : error http "+status;
            $scope.date = new Date();
            $scope.buckets =  data || "Request failed";
        });
}

function ListCtrl($rootScope,$scope, $http, $filter, ngTableParams, $location) {
    $rootScope.tableParams = new ngTableParams({
        page: 1,            // show first page
        count: 20,          // count per page
        sorting: {
            bucket: 'asc'     // initial sorting
        }
    }, {
        counts: [], // hide page counts control
        total: 1,  // value less than count hide pagination
        getData: function ($defer, params) {
            // use build-in angular filter
            $rootScope.orderedData = params.sorting() ?
                $filter('orderBy')($rootScope.buckets, params.orderBy()) :
                data;
            $defer.resolve($rootScope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });
    refreshBuckets($http,$rootScope);

    $scope.showDetail = function (bucket) {
        $location.path('/detail/'+bucket);
    }
}

function DetailCtrl($rootScope,$scope, $http, $routeParams, $route, $dialogs) {
    var uri = inkscopeCtrlURL + "S3/bucket/"+$routeParams.bucketName ;
    $http({method: "get", url: uri }).
        success(function (data, status) {
            $rootScope.status = status;
            $rootScope.detailedBucket =  data;
        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $rootScope.buckets =  data || "Request failed";
            $dialogs.error("<h3>Can't display bucket named "+$routeParams.bucketName+"</h3><br>"+$scope.data);
        });

}

function DeleteCtrl($scope, $http, $routeParams, $location, $dialogs) {
    $scope.bucketName = $routeParams.bucketName;
    $scope.uri = inkscopeCtrlURL + "S3/bucket/" + $scope.bucketName  ;

    $scope.bucketDelete = function () {
        $scope.status = "en cours ...";

        $http({method: "delete", url: $scope.uri }).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                refreshBuckets($http, $scope);
                $location.url('/');
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Cant' delete bucket named <strong>"+$scope.bucketName+"</strong> !</h3> <br>"+$scope.data);
            });
    }
}

function ChangeOwnerCtrl($rootScope, $scope, $routeParams, $location, $http, $dialogs) {
    $scope.bucketName = $routeParams.bucketName;
    $scope.actualOwner = $routeParams.actualOwner;

    $scope.return = function () {
        $location.path("/detail/"+$scope.bucketName);
    }

    $scope.changeOwner = function () {
        $scope.code = "";
        $scope.response = "";
        $scope.uri = inkscopeCtrlURL + "S3/bucket/"+$scope.bucketName+"/link";
        data ="uid="+$scope.actualOwner

        $http({method: "DELETE", url: $scope.uri, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.link();
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Can't modify bucket <strong>"+$scope.bucketName+"</strong> !</h3> <br>"+$scope.data);
            });
    };

    $scope.link = function () {
        $scope.uri = inkscopeCtrlURL + "S3/bucket/"+$scope.bucketName+"/link";
        data ="uid="+$scope.new_owner.uid;

        $http({method: "PUT", url: $scope.uri, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                $dialogs.notify("Bucket modification","Bucket <strong>"+$scope.bucketName+"</strong> was modified");
                refreshBuckets($http, $scope);
                $scope.return();
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Can't modify bucket <strong>"+$scope.bucketName+"</strong> !</h3> <br>"+$scope.data);
            });
    }

    // init
    uri = inkscopeCtrlURL + "S3/user";
    $http({method: "get", url: uri }).
        success(function (data, status) {
            $rootScope.status = status;
            $scope.users =  data;
        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $dialogs.error("<h3>Can't find user list</h3><br>"+$scope.data);
        });
    $scope.code = "";
    $scope.response = "";
}

function CreateCtrl($rootScope, $scope, $routeParams, $location, $http, $dialogs) {

    $scope.cancel = function(){
        $location.path("/");
    }

    $scope.create = function () {
        $scope.code = "";
        $scope.response = "";
        $scope.uri = inkscopeCtrlURL + "S3/bucket";
        data ="bucket="+$scope.bucket.name+"&owner="+$scope.bucket.owner.uid

        $http({method: "PUT", url: $scope.uri, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                refreshBuckets($http, $scope);
                $location.path("/");
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Can't create bucket <strong>"+$scope.bucket.name+"</strong> !</h3> <br>"+$scope.data);
            });
    };

    // init
    uri = inkscopeCtrlURL + "S3/user";
    $http({method: "get", url: uri }).
        success(function (data, status) {
            $rootScope.status = status;
            $scope.users =  data;
        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $dialogs.error("<h3>Can't find user list</h3><br>"+$scope.data);
        });
    $scope.bucket = {};
    $scope.code = "";
    $scope.response = "";
}