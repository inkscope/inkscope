/**
 * Created by arid6405 on 29/04/2014.
 */

angular.module('imageApp', ['ngRoute','ui.bootstrap','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/rbd/aboutImages.html'}).
            when('/new', {controller: CreateCtrl, templateUrl: 'partials/rbd/createImage.html'}).
            when('/detail/:imageName', {controller: DetailCtrl, templateUrl: 'partials/rbd/detailImage.html'}).
            when('/delete/:imageName', {controller: DeleteCtrl, templateUrl: 'partials/rbd/deleteImage.html'}).
            otherwise({redirectTo: '/'})
    });

function refreshImages($http, $scope) {
    $http({method: "get", url: inkscopeCtrlURL + "RBD/images"}).
        success(function (data, status) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.images =  data;
            $scope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            //alert("refresh buckets failed with status "+status);
            $scope.status = "Can't list images : error http "+status;
            $scope.date = new Date();
            $scope.images =  data || "Request failed";
        });
}

function ListCtrl($rootScope,$scope, $http, $filter, ngTableParams, $location) {
    $rootScope.tableParams = new ngTableParams({
        page: 1,            // show first page
        count: 20,          // count per page
        sorting: {
            image: 'asc'     // initial sorting
        }
    }, {
        counts: [], // hide page counts control
        total: 1,  // value less than count hide pagination
        getData: function ($defer, params) {
            // use build-in angular filter
            $rootScope.orderedData = params.sorting() ?
                $filter('orderBy')($rootScope.images, params.orderBy()) :
                data;
            $defer.resolve($rootScope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });
    refreshImages($http,$rootScope);

    $scope.showDetail = function (image) {
        $location.path('/detail/'+image);
    }
}

function DetailCtrl($rootScope,$scope, $http, $routeParams, $location, $dialogs) {
    var uri = inkscopeCtrlURL + "RBD/images/"+$routeParams.imageName ;
    $http({method: "get", url: uri }).
        success(function (data, status) {
            $rootScope.status = status;
            $rootScope.detailedImage =  data;
        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $rootScope.detailedImage =  {};
            $dialogs.error("<h3>Can't display image named "+$routeParams.imageName+"</h3><br>"+$scope.data);
        });

    $scope.showDetail = function (image) {
        $location.path('/detail/'+image);
    }
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
                refreshImages($http, $scope);
                $location.url('/');
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Cant' delete bucket named <strong>"+$scope.bucketName+"</strong> !</h3> <br>"+$scope.data);
            });
    }
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
                refreshImages($http, $scope);
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