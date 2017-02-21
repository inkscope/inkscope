/**
 * Created by Alain Dechorgnat on 2016/09/01.
 */
// angular stuff
// create module for custom directives
var FsApp = angular.module('FsApp', ['ngRoute','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .filter('duration', funcDurationFilter)
    .config(function ($routeProvider) {
        $routeProvider.
        when('/', {controller: FsListCtrl, templateUrl: 'partials/fs/aboutFs.html'}).
        when('/new', {controller: FsCreateCtrl, templateUrl: 'partials/fs/createFs.html'}).
        when('/detail/:fsId', {controller: FsViewCtrl, templateUrl: 'partials/fs/detailFs.html'}).
        otherwise({redirectTo: '/'})});


function FsListCtrl($rootScope, $scope, $http, $location ,$window, $filter, ngTableParams) {
    
    
    $scope.tableParams = new ngTableParams({
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
            $scope.orderedData = params.sorting() ?
                $filter('orderBy')($rootScope.fsList, params.orderBy()) :
                data;
            $defer.resolve($scope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });

    getFs();
    setInterval(function () {getFs()},15*1000);

    refreshPools($http,$scope);
    setInterval(function(){
        refreshPools($http, $scope)
    }, 60*1000);


    function getFs() {
        $scope.date = new Date();

        $http({method: "get", url: cephRestApiURL + "fs/dump.json"})
            .success(function (data, status) {

                $rootScope.fsList = [];
                for  (var i in $scope.mdsmap = data.output.filesystems){
                    var fs = data.output.filesystems[i];
                    fs.name = fs.mdsmap.fs_name;
                    $rootScope.fsList.push(fs);
                }
                $scope.standbys = data.output.standbys;
                $scope.tableParams.reload();
            }).
        error(function (data, status) {
            $scope.status = status;
            $scope.data = data || "Request failed";
        });
    }

    $scope.prettyPrint = function( object){
        return object.toString();
    }

    $scope.prettyPrintKey = function( key){
        return key.replace(new RegExp( "_", "g" )," ")
    }

    $scope.home = function(){
        $window.location.href = "index.html";
    }

    $scope.showDetail = function (fs) {
        var url = '/detail/'+fs.id;
        $location.path(url);
    }

    $scope.getPoolLabels = function(poolList){
        mystring = "";
        for (var i in poolList){
            if (i>0) mystring +=", ";
            mystring += $scope.getPoolLabel(poolList[i]);
        }
        return mystring;
    }
    $scope.getPoolLabel = function(poolid){
        if ((typeof poolid == "object")&&(poolid.length ==0)) return "none";
        if (poolid== -1) return "-1";
        for (var i in $scope.pools)if (poolid == $scope.pools[i].id) return poolid +" (<a href='poolManagement.html#/detail/"+poolid+"'>"+ $scope.pools[i].name+"</a>)";
        return poolid +" (unknown)";
    }

    function refreshPools($http, $scope, $templateCache) {
        $http({method: "get", url: cephRestApiURL + "df.json", cache: $templateCache}).
            success(function (data, status) {
                $scope.status = status;
                $scope.date = new Date();
                $scope.pools =  data.output.pools;
            }).
            error(function (data, status, headers) {
                //alert("refresh pools failed with status "+status);
                $scope.status = status;
                $scope.pools =  [];
            });
    }

};

function FsViewCtrl($rootScope, $scope, $http, $routeParams, $dialogs, ngTableParams , $filter) {
    var fsId = parseInt($routeParams.fsId) ;
    for (var i in $rootScope.fsList){
        if ($rootScope.fsList[i].id == fsId){
            $scope.mdsmap = $rootScope.fsList[i].mdsmap;
            break;
        }
    }

    $scope.isUp = function(mds){
        return mds.state.startsWith("up:");
    }
}

function FsCreateCtrl($rootScope, $scope, $routeParams, $location, $http, $dialogs, $window) {
    // init
    getPoolList($http, $scope);

    $scope.createFs = function () {
        var url = cephRestApiURL + "fs/new?fs_name=" + $scope.fs.name + "&metadata="+$scope.fs.metadatapool.poolname + "&data=" + $scope.fs.datapool.poolname;

        $http({method: "PUT", url: url}).
        success(function (data, status) {


        }).
        error(function (data, status) {
            $scope.status = status;
            $dialogs.error("<h3>Can't create file system <strong>"+$scope.fs.name+"</strong> !</h3> <br>"+data.status);
        });
    };

    $scope.cancel = function(){
        $location.path("/");
    }
}