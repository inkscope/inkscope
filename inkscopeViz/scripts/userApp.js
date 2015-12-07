/**
 * Created by arid6405 on 11/21/13.
 */

angular.module('userApp', ['ngRoute','ngSanitize','InkscopeCommons'])
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/users/aboutUsers.html'}).
            when('/detail/:uid', {controller: DetailCtrl, templateUrl: 'partials/users/detailUser.html'}).
            when('/new', {controller: CreateCtrl, templateUrl: 'partials/users/createUser.html'}).
            when('/modify/:uid', {controller: ModifyCtrl, templateUrl: 'partials/users/modifyUser.html'}).
            when('/delete/:userNum/:userName', {controller: DeleteCtrl, templateUrl: 'partials/users/deleteUser.html'}).
            when('/delete/:uid', {controller: DeleteCtrl, templateUrl: 'partials/users/deleteUser.html'}).
            when('/createKey/:uid', {controller: CreateKeyCtrl, templateUrl: 'partials/users/createKey.html'}).
            when('/createSwiftKey/:uid/:subuser', {controller: CreateSwiftKeyCtrl, templateUrl: 'partials/users/createSwiftKey.html'}).
            when('/createSubuser/:uid', {controller: CreateSubuserCtrl, templateUrl: 'partials/users/createSubuser.html'}).
            when('/capabilities/:uid', {controller: CapabilitiesCtrl, templateUrl: 'partials/users/capabilities.html'}).
            otherwise({redirectTo: '/'})

    });

function refreshUsers($http, $scope, $templateCache) {
    $http({method: "get", url: inkscopeCtrlURL + "S3/user", cache: $templateCache}).
        success(function (data, status) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.users =  data;
            $scope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            //alert("refresh users failed with status "+status);
            $scope.status = "Can't list users : error http "+status;
            $scope.date = new Date();
            $scope.users =  data || "Request failed";
        });
}

function ListCtrl($rootScope, $scope, $http, $filter, ngTableParams, $location) {
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

    $scope.showDetail = function (uid) {
        $location.path('/detail/'+uid);
    }
}

function DetailCtrl($rootScope,$scope, $http, $routeParams, $route, $dialogs) {
    var uri = inkscopeCtrlURL + "S3/user/"+$routeParams.uid;
    $http({method: "get", url: uri }).
        success(function (data, status) {
            $rootScope.detailedUser = data;
            if ($rootScope.detailedUser.suspended == 0)
                $rootScope.detailedUser.suspended = 'False';
            else
                $rootScope.detailedUser.suspended = 'True';

            $rootScope.status = status;
        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $rootScope.users =  data || "Request failed";
            $dialogs.error("<h3>Can't display user with num "+$routeParams.uid+"</h3><br>"+$scope.data);
        });

    $scope.removeKey = function(key){
        $scope.uri = inkscopeCtrlURL+"S3/user/"+encodeURIComponent($rootScope.detailedUser.user_id)+"/key/"+encodeURIComponent(key);

        dlg = $dialogs.confirm('Please Confirm','Do you really want to delete key <strong>'+key+'</strong> for user <strong>'+$rootScope.detailedUser.user_id+'</strong> ?');
        dlg.result.then(function(btn){
            $http({method: "delete", url: $scope.uri }).
                success(function (data, status) {
                    $scope.status = status;
                    $scope.data = data;
                    $dialogs.notify("Key deletion","key <strong>"+key +"</strong>  for user <strong>"+$rootScope.detailedUser.user_id+"</strong> has been deleted");
                    refreshUsers($http, $scope);
                    $route.reload();
                }).
                error(function (data, status) {
                    $scope.data = data || "Request failed";
                    $scope.status = status;
                    $dialogs.error("<h3>Cant' delete key for user <strong>"+$rootScope.detailedUser.user_id+"</strong> !</h3> <br>"+$scope.data);
                });
        },function(btn){
            //nope
        });
    }

    $scope.removeSwiftKey = function(subuser, key){
        $scope.uri = inkscopeCtrlURL+"S3/user/"+$rootScope.detailedUser.user_id+"/subuser/"+encodeURIComponent(subuser)+"/key";

        dlg = $dialogs.confirm('Please Confirm','Do you really want to delete key <strong>'+key+'</strong> for user <strong>'+$rootScope.detailedUser.user_id+'</strong> ?');
        dlg.result.then(function(btn){
            $http({method: "delete", url: $scope.uri }).
                success(function (data, status) {
                    $scope.status = status;
                    $scope.data = data;
                    $dialogs.notify("Key deletion","key for subuser <strong>"+subuser+"</strong> has been deleted");
                    refreshUsers($http, $scope);
                    $route.reload();
                }).
                error(function (data, status) {
                    $scope.data = data || "Request failed";
                    $scope.status = status;
                    $dialogs.error("<h3>Cant' delete key for subuser <strong>"+subuser+"</strong> !</h3> <br>"+$scope.data);
                });
        },function(btn){
            //nope
        });
    }

    $scope.removeSubuser = function(subuser){
        $scope.uri = inkscopeCtrlURL+"S3/user/"+$rootScope.detailedUser.user_id+"/subuser/"+encodeURIComponent(subuser);

        dlg = $dialogs.confirm('Please Confirm','Do you really want to delete subuser '+subuser+' for user '+$rootScope.detailedUser.user_id+'?');
        dlg.result.then(function(btn){
            $http({method: "delete", url: $scope.uri }).
                success(function (data, status) {
                    $scope.status = status;
                    $scope.data = data;
                    $dialogs.notify("subuser deletion","subuser <strong>"+subuser +"</strong>  for user <strong>"+$rootScope.detailedUser.user_id+"</strong> has been deleted");
                    refreshUsers($http, $scope);
                    $route.reload();
                }).
                error(function (data, status) {
                    $scope.data = data || "Request failed";
                    $scope.status = status;
                    $dialogs.error("<h3>Cant' delete subuser for user <strong>"+$rootScope.detailedUser.user_id+"</strong> !</h3> <br>"+$scope.data);
                });
        },function(btn){
            //nope
        });
    }


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
                $dialogs.notify("User deletion","User <strong>"+$scope.uid+"</strong> was deleted !");
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

function CreateCtrl($rootScope, $scope, $location, $http, $dialogs, $route) {
    $scope.operation = "creation";
    $scope.permissionValues = ["full", "read", "write", "readwrite"];

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
                //$dialogs.notify("User creation","User <strong>"+$scope.user.uid+"</strong> was created");
                refreshUsers($http, $scope);
                //$route.reload();
                $location.path('/detail/'+$scope.user.uid);
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
    $scope.master.generate_key = 'True';
    $scope.master.subuser_access = 'full';


    $scope.reset();

}

function CreateSubuserCtrl($rootScope, $scope, $location, $http, $dialogs, $route, $routeParams) {

    // functions declaration
    $scope.update = function (user) {
        $scope.master = angular.copy(user);
    };

    $scope.reset = function () {
        $scope.subuser = angular.copy($scope.master);
    };

    $scope.isUnchanged = function (user) {
        return angular.equals(user, $scope.master);
    };

    $scope.cancel = function () {
        $location.path("/detail/"+$scope.subuser.uid);
    }


    $scope.submit = function () {
        $scope.code = "";
        $scope.response = "";

        $scope.uri = inkscopeCtrlURL+"S3/user/"+$scope.subuser.uid+"/subuser";

        $http({method: "put", url: $scope.uri, data: "json="+JSON.stringify($scope.subuser), headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                //$dialogs.notify("User creation","User <strong>"+$scope.user.uid+"</strong> was created");
                refreshUsers($http, $scope);
                $location.path('/detail/'+$scope.subuser.uid);
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Can't create user <strong>"+$scope.subuser.uid+"</strong> !</h3> <br>"+$scope.data);

            });
    };

    // init

    // default values
    $scope.permissionValues = ["read", "write", "readwrite", "full"];

    $scope.subuser={};
    $scope.master = {};
    $scope.master.uid = $routeParams.uid;
    $scope.master.access = "read";
    $scope.reset(); //copy master to subuser

    $scope.code = "";
    $scope.response = "";

}

function CreateKeyCtrl($rootScope, $scope, $location, $http, $dialogs, $route, $routeParams) {

    // functions declaration
    $scope.isValid = function () {
        return ( $scope.key.generate_key == 'False') && ( !$scope.key.access_key || !$scope.key.secret_key)
    };

    $scope.update = function (user) {
        $scope.master = angular.copy(user);
    };

    $scope.reset = function () {
        $scope.key = angular.copy($scope.master);
    };

    $scope.isUnchanged = function (user) {
        return angular.equals(user, $scope.master);
    };

    $scope.cancel = function () {
        $location.path("/detail/"+$scope.uid);
    }


    $scope.submit = function () {
        $scope.code = "";
        $scope.response = "";

        $scope.uri = inkscopeCtrlURL+"S3/user/"+$scope.uid;

        var data = "";
        if ($scope.key.generate_key == 'True') {
            data = 'json={"generate_key":"True"}';
        }
        else {
            data = 'json={"access_key":"'+$scope.key.access_key+'", "secret_key":"'+$scope.key.secret_key+'"}';
        }

        $http({method: "put", url: $scope.uri, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                refreshUsers($http, $scope);
                $location.path('/detail/'+$scope.uid);
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Can't create key for user <strong>"+$scope.uid+"</strong> !</h3> <br>"+$scope.data);

            });
    };

    // default values
    $scope.key={};
    $scope.master = {};
    $scope.uid = $routeParams.uid;
    $scope.reset(); //copy master to key

    $scope.code = "";
    $scope.response = "";

}

function CreateSwiftKeyCtrl($rootScope, $scope, $location, $http, $dialogs, $route, $routeParams) {
    // functions declaration
    $scope.isValid = function () {
        return ( $scope.key.generate_key == 'False') && ( !$scope.key.access_key || !$scope.key.secret_key)
    };

    $scope.update = function (user) {
        $scope.master = angular.copy(user);
    };

    $scope.reset = function () {
        $scope.key = angular.copy($scope.master);
    };

    $scope.isUnchanged = function (user) {
        return angular.equals(user, $scope.master);
    };

    $scope.cancel = function () {
        $location.path("/detail/"+$scope.master.uid);
    }


    $scope.submit = function () {
        $scope.code = "";
        $scope.response = "";
        $scope.uri = inkscopeCtrlURL+"S3/user/"+$scope.master.uid+"/subuser/"+$scope.master.subuser+"/key";

        var data = "";
        if ($scope.key.generate_key == 'True') {
            data = 'generate_key=True&secret_key=';
        }
        else {
            data = 'generate_key=False&secret_key='+$scope.key.secret_key;
        }

        $http({method: "put", url: $scope.uri, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                refreshUsers($http, $scope);
                $location.path('/detail/'+$scope.master.uid);
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Can't create key for user <strong>"+$scope.master.uid+"</strong> !</h3> <br>"+$scope.data);

            });
    };

    // default values
    $scope.key={};
    $scope.master={};
    $scope.master.uid = $routeParams.uid;
    $scope.master.subuser = $routeParams.subuser;
    $scope.master.generate_key='True';

    $scope.reset();
}

function ModifyCtrl($rootScope, $scope, $routeParams, $location, $http, $dialogs) {
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
                $dialogs.notify("User modification","User <strong>"+$scope.user.user_id+"</strong> was modified");
                refreshUsers($http, $scope);
                $location.path('/detail/'+$scope.user.user_id);
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;

                $dialogs.error("<h3>Can't modify user <strong>"+$scope.user.user_id+"</strong> !</h3> <br>"+$scope.data);

            });
    };

    // init
    $scope.uri = inkscopeCtrlURL + "S3/user/"+$routeParams.uid ;

    $http({method: "get", url: $scope.uri }).
        success(function (data, status) {
            if (data.suspended == 0)
                data.suspended = 'False';
            else
                data.suspended = 'True';

            $rootScope.status = status;
            $scope.master =   {
                "user_id":data.user_id,
                "display_name":data.display_name,
                "email":data.email,
                "suspended":data.suspended,
                "max_buckets":data.max_buckets,
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

function CapabilitiesCtrl($rootScope,$scope, $http, $routeParams, $route, $dialogs, $location) {
    var uri = inkscopeCtrlURL + "S3/user/"+$routeParams.uid;
    $scope.user_id = $routeParams.uid;

    $scope.capabilities = ["bilog", "buckets", "datalog", "mdlog" , "metadata", "opstate", "usage", "users"];

    $scope.permissionValues = ["read", "write", "*"];

    $http({method: "get", url: uri }).
        success(function (data, status) {
            $rootScope.detailedUser = data;
            $rootScope.status = status;

            $scope.existingCapabilities = [];
            for (var i = 0; i < data.caps.length; i++){
                $scope.existingCapabilities.push(data.caps[i].type);
            }
            $scope.availableCapabilities = [];
            for (var i = 0; i < $scope.capabilities.length; i++){
                var cap = $scope.capabilities[i];
                if ($scope.existingCapabilities.indexOf(cap) == -1){
                    $scope.availableCapabilities.push(cap);
                }
            }

        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $rootScope.users =  data || "Request failed";
            $dialogs.error("<h3>Can't display user with num "+$routeParams.uid+"</h3><br>"+$scope.data);
        });

    $scope.close = function () {
        $location.path("/detail/"+$scope.user_id);
    }

    $scope.addCapability = function () {
        $scope.adding = true;
        $scope.newCap.type = "";
        $scope.newCap.perm = "";
    }

    $scope.cancelCapability = function () {
        $scope.adding = false;
    }

    $scope.saveCapability = function (type, perm) {
        if ( (typeof type=="undefined")||(typeof perm=="undefined")) return;
        $scope.uri = inkscopeCtrlURL + "S3/user/"+$routeParams.uid+"/caps" ;
        $http({method: "post", url: $scope.uri , data: "type="+type+"&perm="+perm, headers: {'Content-Type': 'application/x-www-form-urlencoded'} }).
            success(function (data, status) {
                $rootScope.status = status;
                $route.reload();
            }).
            error(function (data, status, headers) {
                $rootScope.status = status;
                $dialogs.error("<h3>Can't save capability</h3>"+data);
            });
    }

    $scope.deleteCapability = function (type, perm) {
        if ( (type=="")||(perm=="")) return;
        $scope.uri = inkscopeCtrlURL + "S3/user/"+$routeParams.uid+"/caps" ;
        $http({method: "delete", url: $scope.uri , data: "type="+type+"&perm="+perm, headers: {'Content-Type': 'application/x-www-form-urlencoded'} }).
            success(function (data, status) {
                $rootScope.status = status;
                $route.reload();
            }).
            error(function (data, status, headers) {
                $rootScope.status = status;
                $dialogs.error("<h3>Can't delete capability</h3>"+data);
            });
    }

}