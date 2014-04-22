/**
 * Created by arid6405 on 11/21/13.
 */

angular.module('userApp', ['ngRoute','ngTable','ui.bootstrap','dialogs'])
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/users/aboutUsers.html'}).
            when('/detail/:uid', {controller: DetailCtrl, templateUrl: 'partials/users/detailUser.html'}).
            when('/new', {controller: CreateCtrl, templateUrl: 'partials/users/createUser.html'}).
            when('/modify/:uid', {controller: ModifyCtrl, templateUrl: 'partials/users/modifyUser.html'}).
            when('/delete/:userNum/:userName', {controller: DeleteCtrl, templateUrl: 'partials/users/deleteUser.html'}).
            when('/delete/:uid', {controller: DeleteCtrl, templateUrl: 'partials/users/deleteUser.html'}).
            //when('/snapshot/:poolNum/:poolName', {controller: SnapshotCtrl, templateUrl: 'partials/users/snapshot.html'}).
            otherwise({redirectTo: '/'})

    });

function refreshUsers($http, $rootScope, $templateCache) {
    $http({method: "get", url: inkscopeCtrlURL + "S3/user", cache: $templateCache}).
        success(function (data, status) {
            $rootScope.status = status;
            $rootScope.users =  data;
            $rootScope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            //alert("refresh users failed with status "+status);
            $rootScope.status = status;
            $rootScope.users =  data || "Request failed";
        });
}

function ListCtrl($rootScope, $http, $filter, ngTableParams) {
    $rootScope.tableParams = new ngTableParams({
        page: 1,            // show first page
        count: 20,          // count per page
        sorting: {
            uid: 'asc'     // initial sorting
        }
    }, {
        counts: [], // hide page counts control
        total: 1,  // value less than count hide pagination
        getData: function ($defer, params) {
            // use build-in angular filter
            $rootScope.orderedData = params.sorting() ?
                $filter('orderBy')($rootScope.users, params.orderBy()) :
                data;
            $defer.resolve($rootScope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });
    refreshUsers($http, $rootScope);
}

function DetailCtrl($rootScope,$scope, $http, $routeParams, $route, $dialogs) {
    var uri = inkscopeCtrlURL + "S3/user/"+$routeParams.uid;
    $http({method: "get", url: uri }).
        success(function (data, status) {
            $rootScope.status = status;
           // $rootScope.detailedUser = data;
       /*     for (var key in data){
                if (key != "keys"){
                    $rootScope.detailedUser.push({key:data[key]});
                }
                if (key == "keys"){
                    $rootScope.detailedUser.push({"access_key":data.keys[0].access_key,
                        "secret_key":data.keys[0].secret_key, "user capabilities":data.caps})
                }

            }*/
            $rootScope.detailedUser =
                {
                    "user_id":data.user_id,
                    "display_name":data.display_name,
                    "email":data.email,
                    "suspended":data.suspended,
                    "max_buckets":data.max_buckets,
                    "access_key":data.keys[0].access_key,
                    "secret_key":data.keys[0].secret_key,
                    "user capabilities":data.caps
                }
         /*   }
            else {
                $rootScope.pimpedUser['user capabilities']=data.caps[0].perm;
            }
            $rootScope.detailedUser = $rootScope.pimpedUser;*/

    /*        $scope.hasSnap=false;
            for (var key in $rootScope.detailedPool){
                if ( key == "pool_snaps"){
                    var value = ($rootScope.detailedPool[key])["pool_snap_info"];
                    $rootScope.detailedPool[key] = "nr: "+value["snapid"]+", date: "+value["stamp"]+", name: "+value["name"];
                    $scope.hasSnap=true;
                    $scope.snap_name = value["name"];
                    break;
                }
            }*/

        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $rootScope.users =  data || "Request failed";
            $dialogs.error("<h3>Can't display user with num "+$routeParams.uid+"</h3><br>"+$scope.data);
        });


}

function DeleteCtrl($scope, $http, $templateCache, $routeParams, $location, $dialogs) {
    $scope.uid = $routeParams.uid;
    //$scope.poolName = $routeParams.poolName;
    $scope.uri = inkscopeCtrlURL + "S3/user/" + $scope.uid ;

    $scope.userDelete = function () {
        $scope.status = "en cours ...";

        $http({method: "delete", url: $scope.uri }).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                refreshUsers($http, $scope);
                $location.url('/');
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Cant' delete user <strong>"+$scope.uid+"</strong> !</h3> <br>"+$scope.data);
            });
    }
}

function CreateCtrl($rootScope, $scope, $location, $http, $dialogs) {
    $scope.operation = "creation";
    // functions declaration
    $scope.update = function (user) {
        $scope.master = angular.copy(user);
    };

    $scope.reset = function () {
        $scope.user = angular.copy($scope.master);
    };

    $scope.isUnchanged = function (user) {
        return angular.equals(user, $scope.master);
    };

    $scope.cancel = function () {
        $location.path("/");
    }


    $scope.submit = function () {
        $scope.code = "";
        $scope.response = "";

        $scope.uri = inkscopeCtrlURL+"S3/user";

        $http({method: "post", url: $scope.uri, data: "json="+JSON.stringify($scope.user), headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                $dialogs.notify("User creation","User <strong>"+$scope.user.uid+"</strong> was created");
                refreshUsers($http, $scope);
                $location.path('/');
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;

                $dialogs.error("<h3>Can't create user <strong>"+$scope.user.uid+"</strong> !</h3> <br>"+$scope.data);

            });
    };

    // init

    $scope.code = "";
    $scope.response = "";
    $scope.suspended = false;
    // default values
    $scope.master = {};
    $scope.user = {};
    //$scope.master.key_type = 's3';


    $scope.reset();

}
function ModifyCtrl($rootScope, $scope, $routeParams, $location, $http, $dialogs) {
    $scope.operation = "modification";

    // functions declaration
    $scope.update = function (user) {
        $scope.master = angular.copy(user);
    };

    $scope.reset = function () {
        $scope.user = angular.copy($scope.master);
    };

    $scope.isUnchanged = function (user) {
        return angular.equals(user, $scope.master);
    };

    $scope.cancel = function () {
        $location.path("/detail/"+$scope.user.user_id);
    }

    $scope.submit = function () {
        $scope.code = "";
        $scope.response = "";

        $http({method: "put", url: $scope.uri, data: "json="+JSON.stringify($scope.user), headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                $dialogs.notify("User modification","User <strong>"+$scope.user.uid+"</strong> was modified");
                refreshUsers($http, $scope);
                $location.path('/detail/'+$scope.user.uid);
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;

                $dialogs.error("<h3>Can't modify user <strong>"+$scope.user.uid+"</strong> !</h3> <br>"+$scope.data);

            });
    };

    // init
    $scope.uri = inkscopeCtrlURL + "S3/user/"+$routeParams.uid ;

    $http({method: "get", url: $scope.uri }).
        success(function (data, status) {
            $rootScope.status = status;
            $scope.master =   {
                "user_id":data.user_id,
                "display_name":data.display_name,
                "email":data.email,
                "suspended":data.suspended,
                "max_buckets":data.max_buckets,
                "access_key":data.keys[0].access_key,
                "secret_key":data.keys[0].secret_key,
                "caps":data.caps
            };
            $scope.reset();
        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $rootScope.users =  data || "Request failed";
            $dialogs.error("<h3>Can't display User with num "+$routeParams.uid+"</h3><br>"+$scope.data);
        });
    $scope.code = "";
    $scope.response = "";

}