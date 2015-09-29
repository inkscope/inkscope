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
            when('/snapshot/create/:poolName/:imageName', {controller: CreateSnapshotCtrl, templateUrl: 'partials/rbd/createImageSnapshot.html'}).
            when('/snapshot/clone/:poolName/:imageName/:snapName',  {controller: DetailCtrl, templateUrl: 'partials/rbd/cloneImageSnapshot.html'}).
            when('/snapshot/detail/:poolName/:imageName/:snapName', {controller: DetailCtrl, templateUrl: 'partials/rbd/detailImageSnapshot.html'}).
            when('/snapshot/delete/:poolName/:imageName/:snapName', {controller: DetailCtrl, templateUrl: 'partials/rbd/deleteImageSnapshot.html'}).
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
        $window.location.assign('#/detail/'+image.pool+"/"+image.image.image);
    }

    $scope.showSnapshotDetail = function (image, snapName) {
        if (typeof snapName ==='undefined')
            $scope.showDetail(image);
        else
            $window.location.assign('#/snapshot/detail/'+image.pool+"/"+image.image.image+'/'+snapName);
    }
}

function DetailCtrl($rootScope,$scope, $http, $routeParams, $window, $dialogs) {
    getPoolList($http, $scope);
    $scope.poolName = $routeParams.poolName ;
    $scope.imageName = $routeParams.imageName ;
    $scope.snapName = $routeParams.snapName ;

    var uri = inkscopeCtrlURL + "RBD/images/"+$scope.poolName +"/"+$scope.imageName ;
    if (typeof $scope.snapName !== 'undefined')
        uri = inkscopeCtrlURL + "RBD/snapshots/"+$scope.poolName +"/"+$scope.imageName  +"/"+$scope.snapName ;

    refreshInfos()

    function refreshInfos() {
        $http({method: "get", url: uri }).
            success(function (data, status) {
                $rootScope.detailedImage = $rootScope.detailedSnap =  data;
            }).
            error(function (data, status, headers) {
                $rootScope.detailedImage  = $rootScope.detailedSnap = {};
                if (typeof $scope.snapName !== 'undefined')
                    $dialogs.error("<h3>Can't display snapshot named "+$scope.poolName +"/"+$scope.imageName+"@"+$scope.snapName+"</h3><br>"+data);
                else
                    $dialogs.error("<h3>Can't display image named "+$scope.poolName +"/"+$scope.imageName+"</h3><br>"+data);
            });
    }

    $scope.showImageDetail = function (image) {
        $window.location.assign('#/detail/'+$routeParams.poolName +"/"+image);
    }

    $scope.showSnapshotDetail = function (snapshot) {
        $window.location.assign('#/snapshot/detail/'+$scope.poolName +"/"+$scope.imageName +"/"+snapshot.name);
    }

    $scope.showPoolDetail = function (poolName) {
        var poolNum = getPoolNum(poolName,$scope);
        if (poolNum!='') $window.location.assign('/inkscopeViz/poolManagement.html#/detail/'+poolNum);
    }

    $scope.showDeleteSnapshot = function () {
        if ($scope.detailedSnap.protected=='true') return;
        $window.location.assign('#/snapshot/delete/'+$scope.poolName +"/"+$scope.imageName +"/"+$scope.snapName );
    }

    $scope.deleteSnapshot = function () {
        if ($scope.detailedSnap.protected=='true') return;
        $scope.uri = inkscopeCtrlURL + "RBD/snapshots/"+$scope.poolName +"/"+$scope.imageName  +"/"+$scope.snapName  ;
        $http({method: "delete", url: $scope.uri }).
            success(function (data, status) {
                $window.location.assign("#/detail/"+$scope.poolName+"/"+$scope.imageName);
            }).
            error(function (data, status) {
                $dialogs.error("<h3>Can't delete snapshot named <strong>"+$routeParams.poolName +"/"+$routeParams.imageName +"@" + $scope.snapName+"</strong> !</h3> <br>"+data);
            });

    }

    $scope.protectSnapshot = function () {
        if ($scope.detailedSnap.format==1) return;
        if ($scope.detailedSnap.protected=='true') return;
        $scope.uri = inkscopeCtrlURL + "RBD/snapshots/"+$scope.poolName +"/"+$scope.imageName  +"/"+$scope.snapName +"/protect" ;
        $http({method: "post", url: $scope.uri }).
            success(function (data, status) {
                $dialogs.notify("Snapshot named "+$routeParams.poolName +"/"+$routeParams.imageName +"@" + $scope.snapName, "is now protected");
                refreshInfos();
            }).
            error(function (data, status) {
                $dialogs.error("<h3>Can't protect snapshot named <strong>"+$routeParams.poolName +"/"+$routeParams.imageName +"@" + $scope.snapName+"</strong> !</h3> <br>"+data);
            });
    }

    $scope.unprotectSnapshot = function () {
        if ($scope.detailedSnap.format==1) return;
        if ($scope.detailedSnap.protected =='false') return;
        $scope.uri = inkscopeCtrlURL + "RBD/snapshots/"+$scope.poolName +"/"+$scope.imageName  +"/"+$scope.snapName +"/unprotect" ;
        $http({method: "post", url: $scope.uri }).
            success(function (data, status) {
                $dialogs.notify("Snapshot named "+$routeParams.poolName +"/"+$routeParams.imageName +"@" + $scope.snapName, "is now unprotected");
                refreshInfos();
            }).
            error(function (data, status) {
                $dialogs.error("<h3>Can't unprotect snapshot named <strong>"+$routeParams.poolName +"/"+$routeParams.imageName +"@" + $scope.snapName+"</strong> !</h3> <br>"+data);
            });
    }

    $scope.cloneImageSnapshot = function () {
        $scope.uri = inkscopeCtrlURL + "RBD/snapshots/"+$scope.poolName +"/"+$scope.imageName  +"/"+$scope.snapName +"/clone" ;
        var data = {'pool': $scope.clone.pool.poolname, 'image': $scope.clone.image};
        $http({method: "post", url: $scope.uri ,data: data, headers:{'Content-Type':'application/json'} }).
            success(function (data, status) {
                $dialogs.notify("Snapshot named "+$routeParams.poolName +"/"+$routeParams.imageName +"@" + $scope.snapName, "is cloned");
                refreshInfos();
                $window.location.assign("#/snapshot/detail/"+$scope.poolName +"/"+$scope.imageName  +"/"+$scope.snapName);
            }).
            error(function (data, status) {
                $dialogs.error("<h3>Can't clone snapshot named <strong>"+$routeParams.poolName +"/"+$routeParams.imageName +"@" + $scope.snapName+"</strong> !</h3> <br>"+data);
            });
    };

    $scope.cancel = function(){
        $location.path("/");
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
                $dialogs.error("<h3>Cant' delete image named <strong>"+$routeParams.poolName +"/"+$routeParams.imageName+"</strong> !</h3> <br>"+data);
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


function CreateSnapshotCtrl($rootScope, $scope, $routeParams, $location, $http, $dialogs, $window) {
    $scope.poolName = $routeParams.poolName ;
    $scope.imageName = $routeParams.imageName ;
    $scope.snapName = (new Date()).toISOString().slice(0,19).replace(/-/g,"").replace(/T/g,"").replace(/:/g,"");
    $scope.createSnapshot = function () {
        var url = inkscopeCtrlURL + "RBD/snapshots/"+$scope.poolName+"/"+$scope.imageName+"/"+$scope.snapName;

        $http({method: "PUT", url: url}).
            success(function (data, status) {
                refreshImages(url="#/detail/"+$scope.poolName+"/"+$scope.imageName,$http, $scope, $window);
            }).
            error(function (data, status) {
                $scope.status = status;
                $dialogs.error("<h3>Can't create snapshot for image <strong>"+$scope.poolName+"/"+$scope.imageName+"</strong> !</h3> <br>"+data);
            });
    };

    $scope.cancel = function(){
        $window.location.assign(url="#/detail/"+$scope.image.pool.poolname+"/"+$scope.image.name);
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

