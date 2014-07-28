/**
 * Created by arid6405 on 11/21/13.
 */

angular.module('poolApp', ['ngRoute','ngTable','D3Directives','ui.bootstrap','dialogs'])
    .filter('bytes', funcBytesFilter)
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/pools/aboutPools.html'}).
            when('/detail/:poolNum', {controller: DetailCtrl, templateUrl: 'partials/pools/detailPool.html'}).
            when('/new', {controller: CreateCtrl, templateUrl: 'partials/pools/createPool.html'}).
            when('/modify/:poolNum', {controller: ModifyCtrl, templateUrl: 'partials/pools/createPool.html'}).
            when('/delete/:poolNum/:poolName', {controller: DeleteCtrl, templateUrl: 'partials/pools/deletePool.html'}).
            when('/delete/:poolNum', {controller: DeleteCtrl, templateUrl: 'partials/pools/deletePool.html'}).
            when('/snapshot/:poolNum/:poolName', {controller: SnapshotCtrl, templateUrl: 'partials/pools/snapshot.html'}).
            otherwise({redirectTo: '/'})

    });

function refreshPools($http, $scope, $templateCache) {
    $http({method: "get", url: cephRestApiURL + "df.json", cache: $templateCache}).
        success(function (data, status) {
            $scope.status = status;
            $scope.pools =  data.output.pools;
            $scope.stats = data.output.stats;
            var totalUsed = data.output.stats.total_used;
            var totalSpace = data.output.stats.total_space;
            $scope.percentUsed = totalUsed / totalSpace;
            $scope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            //alert("refresh pools failed with status "+status);
            $scope.status = status;
            $scope.pools =  data || "Request failed";
            $scope.stats.total_used = "N/A";
            $scope.stats.total_space = "N/A";
        });
}

function ListCtrl($scope,$http, $filter, ngTableParams, $location) {
    $scope.tableParams = new ngTableParams({
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
            $scope.orderedData = params.sorting() ?
                $filter('orderBy')($scope.pools, params.orderBy()) :
                data;
            $defer.resolve($scope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });

    refreshPools($http,$scope);
    setInterval(function(){
        refreshPools($http, $scope)
    }, 10000);
    var data;

    $scope.showDetail = function (poolid) {
        $location.path('/detail/'+poolid);
    }
}

function SnapshotCtrl($scope,$scope, $http, $routeParams, $location, $dialogs) {
    $scope.poolNum = $routeParams.poolNum;
    $scope.poolName = $routeParams.poolName;
    var uri = inkscopeCtrlURL + "pools/"+$scope.poolNum+"/snapshot" ;

    $scope.submit = function () {
        $scope.status = "en cours ...";

        $http({method: "post", url: uri, data: "json={\"snapshot_name\":\""+$scope.snap_name+"\"}", headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $dialogs.notify("Snapshot creation for pool \""+ $scope.poolName+"\"","Snapshot <strong>"+$scope.snap_name+"</strong> was created");
                $location.path('/detail/'+$scope.poolNum);
            }).
            error(function (data, status, headers) {
                $scope.status = status;
                $scope.data =  data || "Request failed";
                $dialogs.error("<h3>Can't create snapshot for pool \""+ $scope.poolName+"\"</h3><br>"+$scope.data);
            });
    }
}

function DetailCtrl($scope,$scope, $http, $routeParams, $route, $dialogs) {
    var uri = inkscopeCtrlURL + "pools/"+$routeParams.poolNum ;
    var v;
    var v2 = '';
    $http({method: "get", url: cephRestApiURL + "tell/osd.0/version.json"}).
        success(function(data,status){
            $scope.status = status;
            v = data.output.version;
            for (var i=13; i<17; i++){
                v2 = v2 + v[i];
            }
            $scope.version = parseFloat(v2);
        }).
        error(function (data, status, headers) {
            $scope.status = status;
            $scope.versionosd =  data || "Request failed";
        }
    );

    $http({method: "get", url: uri }).
        success(function (data, status) {
            $scope.status = status;
            $scope.detailedPool =  data.output;
            $scope.hasSnap=false;

            for (var key in $scope.detailedPool){

                    if ( key == "pool_snaps"){
                        if ($scope.version < 0.80){
                            var value = ($scope.detailedPool[key])["pool_snap_info"];
                        }
                        else{
                            var value = ($scope.detailedPool[key])[$scope.detailedPool[key].length-1];
                        }
                        $scope.detailedPool[key] = "nr: "+value["snapid"]+", date: "+value["stamp"]+", name: "+value["name"];
                        $scope.hasSnap=true;
                        $scope.snap_name = value["name"];
                        break;
                    }
            }

        }).
        error(function (data, status, headers) {
            $scope.status = status;
            $scope.pools =  data || "Request failed";
            $dialogs.error("<h3>Can't display pools with num "+$routeParams.poolNum+"</h3><br>"+$scope.data);
        });


    $scope.removeSnapshot = function () {
        var uri = inkscopeCtrlURL + "pools/"+$scope.detailedPool.pool+"/snapshot/"+$scope.snap_name ;
        $scope.status = "en cours ...";
        $http({method: "delete", url: uri}).
            success(function (data, status) {
                $scope.status = status;
                $dialogs.notify("Snapshot deletion for pool \""+ $scope.detailedPool.pool_name+"\"","Snapshot <strong>"+$scope.snap_name+"</strong> was deleted");
                $route.reload();
            }).
            error(function (data, status, headers) {
                $scope.status = status;
                $scope.data =  data || "Request failed";
                $dialogs.error("<h3>Can't delete snapshot for pool \""+ $scope.detailedPool.pool_name+"\"</h3><br>"+$scope.data);
            });
    }
}

function DeleteCtrl($scope, $http, $templateCache, $routeParams, $location, $dialogs) {
    $scope.poolNum = $routeParams.poolNum;
    $scope.poolName = $routeParams.poolName;
    $scope.uri = inkscopeCtrlURL + "pools/" + $scope.poolNum  ;

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
                $dialogs.error("<h3>Cant' delete pool <strong>"+$scope.poolNum+"</strong> !</h3> <br>"+$scope.data);
            });
    }
}

function CreateCtrl($scope, $scope, $location, $http, $dialogs) {
    $scope.operation = "creation";
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

    $scope.cancel = function () {
        $location.path("/");
    }

    $scope.submit = function () {
        $scope.code = "";
        $scope.response = "";

        $scope.uri = inkscopeCtrlURL+"pools/";

        $http({method: "post", url: $scope.uri, data: "json="+JSON.stringify($scope.pool), headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                $dialogs.notify("Pool creation","Pool <strong>"+$scope.pool.pool_name+"</strong> was created");
                refreshPools($http, $scope);
                $location.path('/');
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;

                $dialogs.error("<h3>Can't create pool <strong>"+$scope.pool.pool_name+"</strong> !</h3> <br>"+$scope.data);

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

    $scope.reset();

}
function ModifyCtrl($scope, $scope, $routeParams, $location, $http, $dialogs) {
    $scope.operation = "modification";

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

    $scope.cancel = function () {
        $location.path("/detail/"+$scope.pool.pool);
    }

    $scope.submit = function () {
        $scope.code = "";
        $scope.response = "";

        $http({method: "put", url: $scope.uri, data: "json="+JSON.stringify($scope.pool), headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                $dialogs.notify("Pool modification","Pool <strong>"+$scope.pool.pool_name+"</strong> was modified");
                refreshPools($http, $scope);
                $location.path('/detail/'+$scope.pool.pool);
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;

                $dialogs.error("<h3>Can't modify pool <strong>"+$scope.pool.pool_name+"</strong> !</h3> <br>"+$scope.data);

            });
    };

    // init
    $scope.uri = inkscopeCtrlURL + "pools/"+$routeParams.poolNum ;

    $http({method: "get", url: $scope.uri }).
        success(function (data, status) {
            $scope.status = status;
            $scope.master =  data.output;
            $scope.reset();
        }).
        error(function (data, status, headers) {
            $scope.status = status;
            $scope.pools =  data || "Request failed";
            $dialogs.error("<h3>Can't display pool with num "+$routeParams.poolNum+"</h3><br>"+$scope.data);
        });
    $scope.code = "";
    $scope.response = "";

}
