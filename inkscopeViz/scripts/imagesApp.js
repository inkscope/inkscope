/**
 * Created by arid6405 on 29/04/2014.
 */

angular.module('imageApp', ['ngRoute','ui.bootstrap','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/rbd/aboutImages.html'}).
            when('/new', {controller: CreateCtrl, templateUrl: 'partials/rbd/createImage.html'}).
            when('/detail/:poolName/:imageName', {controller: DetailCtrl, templateUrl: 'partials/rbd/detailImage.html'}).
            when('/resize/:poolName/:imageName/:oldSize', {controller: ResizeCtrl, templateUrl: 'partials/rbd/resizeImage.html'}).
            when('/delete/:poolName/:imageName', {controller: DeleteCtrl, templateUrl: 'partials/rbd/deleteImage.html'}).
            otherwise({redirectTo: '/'})
    });

function refreshImages(url, $http, $scope , $window) {
    $http({method: "get", url: inkscopeCtrlURL + "RBD/images"}).
        success(function (data, status) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.images =  data;
            $scope.tableParams.reload();
            if (url) $window.location.assign(url);
        }).
        error(function (data, status, headers) {
            //alert("refresh buckets failed with status "+status);
            $scope.status = "Can't list images : error http "+status;
            $scope.date = new Date();
            $scope.images =  data || "Request failed";
        });
}

function ListCtrl($rootScope,$scope, $http, $filter, ngTableParams, $window) {
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
                $filter('orderBy')($rootScope.images, params.orderBy()) :
                data;
            $defer.resolve($rootScope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });
    refreshImages(url=null,$http, $rootScope, $window);

    $scope.showDetail = function (image) {
        $window.location.assign('#/detail/'+image.pool+"/"+image.image);
    }
}

function DetailCtrl($rootScope,$scope, $http, $routeParams, $window, $dialogs) {
    var uri = inkscopeCtrlURL + "RBD/images/"+$routeParams.poolName +"/"+$routeParams.imageName ;
    $http({method: "get", url: uri }).
        success(function (data, status) {
            $rootScope.status = status;
            $rootScope.detailedImage =  data;
        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $rootScope.detailedImage =  {};
            $dialogs.error("<h3>Can't display image named "+$routeParams.poolName +"/"+$routeParams.imageName+"</h3><br>"+$scope.data);
        });

    $scope.showDetail = function (image) {
        $window.location.assign('#/detail/'+$routeParams.poolName +"/"+image);
    }
}

function DeleteCtrl($scope, $http, $routeParams, $window, $dialogs) {
    $scope.poolName = $routeParams.poolName ;
    $scope.imageName = $routeParams.imageName ;
    $scope.uri = inkscopeCtrlURL + "RBD/images/"+$routeParams.poolName +"/"+$routeParams.imageName  ;

    $scope.imageDelete = function () {
        $scope.status = "en cours ...";

        $http({method: "delete", url: $scope.uri }).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                refreshImages(url='#/',$http, $scope, $window);
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Cant' delete image named <strong>"+$routeParams.poolName +"/"+$routeParams.imageName+"</strong> !</h3> <br>"+$scope.data);
            });
    }
}

function CreateCtrl($rootScope, $scope, $routeParams, $location, $http, $dialogs, $window) {
    // init
    getPoolList($http, $scope);

    $scope.create = function () {
        var url = inkscopeCtrlURL + "RBD/images/"+$scope.image.pool.poolname+"/"+$scope.image.name;
        data ="size="+$scope.image.size+"&format="+$scope.image.format;

        $http({method: "PUT", url: url, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                refreshImages(url="#/detail/"+$scope.image.pool.poolname+"/"+$scope.image.name,$http, $scope, $window);
            }).
            error(function (data, status) {
                $scope.status = status;
                $dialogs.error("<h3>Can't create image <strong>"+$scope.image.pool.poolname+"/"+$scope.image.name+"</strong> !</h3> <br>"+data);
            });
    };

    $scope.cancel = function(){
        $location.path("/");
    }
}


function ResizeCtrl($rootScope, $scope, $routeParams, $http, $dialogs, $window) {
    // init
    $scope.poolName = $routeParams.poolName ;
    $scope.imageName = $routeParams.imageName ;
    $scope.oldSize = $routeParams.oldSize ;

    $scope.resize = function () {
        var url = inkscopeCtrlURL + "RBD/images/"+$scope.poolName+"/"+$scope.imageName;
        data ="size="+$scope.newSize;

        $http({method: "POST", url: url, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                refreshImages(url = "#/detail/"+$scope.poolName+"/"+$scope.imageName, $http, $scope, $window);
            }).
            error(function (data, status) {
                $scope.status = status;
                $dialogs.error("<h3>Can't resize image <strong>"+$scope.poolName+"/"+$scope.imageName+"</strong> !</h3> <br>"+data);
            });
    };

    $scope.cancel = function(){
        $window.location.assign("#/detail/"+$scope.poolName+"/"+$scope.imageName);
    }
}

