/**
 * Created by arid6405 on 2015/12/02.
 */
angular.module('inkscopeUserApp', ['ngRoute','ngTable', 'ui.bootstrap','dialogs','InkscopeCommons','checklist-model'])
    .filter('bytes', funcBytesFilter)
    .filter('prettifyArray', funcPrettifyArrayFilter)
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/inkscope_users/aboutUsers.html'}).
            when('/detail/:name', {controller: UserCtrl, templateUrl: 'partials/inkscope_users/detailUser.html'}).
            when('/new', {controller: UserCtrl, templateUrl: 'partials/inkscope_users/createUser.html'}).
            when('/modify/:name', {controller: UserCtrl, templateUrl: 'partials/inkscope_users/modifyUser.html'}).
            when('/delete/:name', {controller: UserCtrl, templateUrl: 'partials/inkscope_users/deleteUser.html'}).
            otherwise({redirectTo: '/'})

    });


function refreshUsers($http, $scope) {
    $http({method: "get", url: inkscopeCtrlURL + "inkscope_user"}).
        success(function (data, status) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.users =  data;
            $scope.tableParams.reload();
        }).
        error(function (data, status) {
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
            name: 'asc'     // initial sorting
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

    $scope.showDetail = function (name) {
        $location.path('/detail/'+name);
    }
}

function UserCtrl($rootScope, $scope, $http, $routeParams, $location, $dialogs) {
    $scope.user =  {};
    getInkscopeRoles();

    if ($routeParams.name != null){
        $http({method: "get", url: inkscopeCtrlURL + "inkscope_user/"+$routeParams.name}).
            success(function (data, status) {
                $scope.status = status;
                $scope.date = new Date();
                $scope.user =  data;
            }).
            error(function (data, status, headers) {
                //alert("refresh users failed with status "+status);
                $scope.status = "Can't find user '"+$routeParams.name+"': error http "+status;
                $scope.date = new Date();
                $scope.user =  {};
            });
    }

    $scope.cancel = function (name) {
        if (name != null)
            $location.path('/detail/'+name);
        else
            $location.path('/');
    }

    $scope.userDelete = function () {
        $http({method: "delete", url: inkscopeCtrlURL + "inkscope_user/" + $routeParams.name }).
            success(function (data, status) {
                $scope.status = status;
                $dialogs.notify("User deletion","User <strong>"+ $routeParams.name+"</strong> was deleted !");
                refreshUsers($http, $scope);
                $location.url('/');
            }).
            error(function (data, status) {
                $scope.status = status;
                $dialogs.error("<h3>Cant' delete user <strong>"+ $routeParams.name+"</strong> !</h3> <br>Error "+status+": "+data);
            });
    }

    $scope.userCreate = function (user) {
        $http({method: "post", url: inkscopeCtrlURL+ "inkscope_user/"+user.name, data: JSON.stringify(user), headers: {'Content-Type': 'application/json'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                //$dialogs.notify("User creation","User <strong>"+user.name+"</strong> was created");
                refreshUsers($http, $scope);
                $location.path('/detail/'+$scope.user.name);
            }).
            error(function (data, status) {
                $dialogs.error("<h3>Can't create inkscope user <strong>"+user.name+"</strong> !</h3> <br>error "+status+": "+data);

            });
    };


    $scope.userModify = function (user) {
        $http({method: "put", url: inkscopeCtrlURL+ "inkscope_user/"+user.name, data: JSON.stringify(user), headers: {'Content-Type': 'application/json'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                //$dialogs.notify("User creation","User <strong>"+user.name+"</strong> was created");
                refreshUsers($http, $scope);
                $location.path('/detail/'+$scope.user.name);
            }).
            error(function (data, status) {
                $dialogs.error("<h3>Can't update inkscope user <strong>"+user.name+"</strong> !</h3> <br>error "+status+": "+data);

            });
    };



    function getInkscopeRoles() {
    $http({method: "get", url: inkscopeCtrlURL + "inkscope_user_role"}).
        success(function (data) {
            $scope.date = new Date();
            $scope.inkscopeRoles =  data;
        }).
        error(function (data, status) {
            $scope.status = "Can't list inkscope roles : error "+status +": "+ data;
            $scope.date = new Date();
        });

    }

}