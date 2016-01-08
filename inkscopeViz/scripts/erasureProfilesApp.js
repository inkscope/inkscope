/**
 * Created by Alain Dechorgnat on 2014/10/23.
 */

angular.module('erasureProfilesApp', ['ngRoute','D3Directives','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/erasureProfiles/aboutErasureProfiles.html'}).
            when('/detail/:erasureProfileName', {controller: DetailCtrl, templateUrl: 'partials/erasureProfiles/detailErasureProfile.html'}).
            when('/new', {controller: CreateCtrl, templateUrl: 'partials/erasureProfiles/createErasureProfile.html'}).
            when('/delete/:erasureProfileName', {controller: DeleteCtrl, templateUrl: 'partials/erasureProfiles/deleteErasureProfile.html'}).
            otherwise({redirectTo: '/'})

    });

function refreshErasureProfiles($http, $scope) {
    $http({method: "get", url: cephRestApiURL + "osd/erasure-code-profile/ls.json"}).
        success(function (data, status) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.erasureProfiles =  [];
            for (i in data.output){
                $scope.erasureProfiles.push({'id':data.output[i]});
            }
            $scope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            //alert("refresh erasureProfiles failed with status "+status);
            $scope.status = status;
            $scope.erasureProfiles =  [];
        });
}

function ListCtrl($scope,$http, $filter, ngTableParams, $location) {
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
                $filter('orderBy')($scope.erasureProfiles, params.orderBy()) :
                data;
            $defer.resolve($scope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });

    refreshErasureProfiles($http,$scope);
    setInterval(function(){
        refreshErasureProfiles($http, $scope)
    }, 10000);
    var data;


    $scope.showDetail = function (erasureProfileId) {
        $location.path('/detail/'+erasureProfileId);
    }
}

function DetailCtrl($scope, $http, $routeParams, $dialogs, ngTableParams , $filter) {
    i = 0;
    erasureProfileParameters = {
        name:{cat:"General",transform:"",rank:i++},
        plugin:{cat:"General",transform:"",rank:i++},
        technique:{cat:"General",transform:"",rank:i++},
        k:{cat:"General",transform:"",rank:i++},
        m:{cat:"General",transform:"",rank:i++},
        l:{cat:"General",transform:"",rank:i++},
        "ruleset-failure-domain":{cat:"General",transform:"",rank:i++},
        "ruleset-root":{cat:"General",transform:"",rank:i++},
        directory:{cat:"General",transform:"",rank:i++},
        packetsize:{cat:"Jerasure plugin",transform:"",rank:i++},
        "ruleset-locality":{cat:"LRC plugin",transform:"",rank:i++}
    };

    var uri = cephRestApiURL + "osd/erasure-code-profile/get.json?name="+$routeParams.erasureProfileName ;
    $http({method: "get", url: uri }).
        success(function (data, status) {
            $scope.status = status;
            $scope.detailedErasureProfile = data.output;
            $scope.detailedErasureProfile.name = $routeParams.erasureProfileName;


            $scope.detailedErasureProfileParams=new Array();
            for (var key in $scope.detailedErasureProfile){
                var param ={};
                keyParams = erasureProfileParameters[key];
                if (typeof keyParams !== "undefined"){
                    transformFunctionName = keyParams.transform;
                    param.cat = keyParams.cat;
                    param.rank = keyParams.rank;
                }
                else {
                    transformFunctionName = $scope[""];
                    param.cat = "Uncategorized";
                    param.rank = 9999;
                }
                if (transformFunctionName =="")
                    param.value = ""+$scope.detailedErasureProfile[key];
                else {
                    transformFunction = $scope[transformFunctionName];
                    if (typeof transformFunction === "function"){
                        //console.log(key+" : "+transformFunctionName+" : "+JSON.stringify($scope.detailedErasureProfile[key]));
                        param.value = transformFunction($scope.detailedErasureProfile[key]);
                    }
                    else
                        param.value = ""+$scope.detailedErasureProfile[key];
                }
                param.key=key.replace('_',' ', 'gi');

                $scope.detailedErasureProfileParams.push(param);

            }
            $scope.firstGroup=true;
            $scope.checkGroup = function(group){
                if ($scope.firstGroup) $scope.firstGroup = false;
                else group.$hideRows=true;
            }
            $scope.erasureProfileParams = new ngTableParams({
                page: 1,            // show first page
                count: 999,          // count per page
                sorting: {
                    rank: 'asc'     // initial sorting
                }
            }, {
                groupBy: 'cat',
                counts: [], // hide page counts control
                total: -1,  // value less than count hide pagination
                getData: function ($defer, params) {
                    // use build-in angular filter
                    $scope.orderedData = params.sorting() ?
                        $filter('orderBy')($scope.detailedErasureProfileParams, params.orderBy()) :
                        data;
                    $defer.resolve($scope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
            });

        }).
        error(function (data, status, headers) {
            $scope.status = status;
            $scope.erasureProfiles =  data || "Request failed";
            $dialogs.error("<h3>Can't display erasure profile named "+$routeParams.erasureProfileNum+"</h3><br>"+$scope.data);
        });
}

function DeleteCtrl($scope, $http,  $routeParams, $location, $dialogs) {
    $scope.erasureProfileName = $routeParams.erasureProfileName;
    $scope.uri = uri = cephRestApiURL + "osd/erasure-code-profile/rm?name="+$routeParams.erasureProfileName ;

    $scope.erasureProfileDelete = function () {
        $scope.status = "en cours ...";

        $http({method: "put", url: $scope.uri }).
            success(function (data, status) {
                $scope.status = status;
                refreshErasureProfiles($http, $scope);
                $location.url('/');
            }).
            error(function (data, status) {
                $scope.status = status;
                $dialogs.error("<h3>Cant' delete erasure profile named <strong>"+$scope.erasureProfileName+"</strong> !</h3> <br>"+$scope.data);
            });
    }
}

function CreateCtrl($scope, $location, $http, $dialogs) {
    $scope.operation = "creation";

    // functions declaration
    $scope.update = function (erasureProfile) {
        $scope.master = angular.copy(erasureProfile);
    };

    $scope.reset = function () {
        $scope.erasureProfile = angular.copy($scope.master);
    };

    $scope.isUnchanged = function (erasureProfile) {
        return angular.equals(erasureProfile, $scope.master);
    };

    $scope.cancel = function () {
        $location.path("/");
    }

    $scope.submit = function () {
        $scope.uri = cephRestApiURL+"osd/erasure-code-profile/set?";
        $scope.uri += "name="+$scope.erasureProfile.name;
        $scope.uri += "&profile=" + "plugin="+$scope.erasureProfile.plugin;
        $scope.uri += "&profile=" + "k="+$scope.erasureProfile.k;
        $scope.uri += "&profile=" + "m="+$scope.erasureProfile.m;
        if ($scope.erasureProfile.plugin == "lrc") $scope.uri += "&profile=" + "l="+$scope.erasureProfile.l;
        if ($scope.master.directory != $scope.erasureProfile.directory) $scope.uri += "&profile=" + "directory="+$scope.erasureProfile.directory;
        if ($scope.master.packetsize != $scope.erasureProfile.packetsize) $scope.uri += "&profile=" + "packetsize="+$scope.erasureProfile.packetsize;
        if ($scope.master.ruleset_failure_domain != $scope.erasureProfile.ruleset_failure_domain) $scope.uri += "&profile=" + "ruleset-failure-domain="+$scope.erasureProfile.ruleset_failure_domain;
        if ($scope.master.ruleset_root != $scope.erasureProfile.ruleset_root) $scope.uri += "&profile=" + "ruleset-root="+$scope.erasureProfile.ruleset_root;
        if ($scope.erasureProfile.technique != "") $scope.uri += "&profile=" + "technique="+$scope.erasureProfile.technique;

        $http({method: "put", url: $scope.uri, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                $dialogs.notify("Erasure code profile creation","Erasure code profile <strong>"+$scope.erasureProfile.name+"</strong> was created");
                refreshErasureProfiles($http, $scope);
                $location.path('/');
            }).
            error(function (data, status) {
                $scope.status = status;
                $dialogs.error("<h3>Can't create erasure code profile <strong>"+$scope.erasureProfile.name+"</strong> !</h3> <br>"+data.status);
            });
    };

    // init default values
    $scope.master = {};
    $scope.master.plugin = 'jerasure';
    $scope.master.directory='/usr/lib/ceph/erasure-code';
    $scope.master.ruleset_root='default';
    $scope.master.ruleset_failure_domain='host';
    $scope.master.packetsize = 2048;
    $scope.master.technique = "";

    $scope.erasureProfile = {};

    $scope.plugins = ['jerasure','isa','lrc'];
    $scope.techniques = ["reed_sol_van","reed_sol_r6_op","cauchy_orig","cauchy_good","liberation","blaum_roth","liber8tion"];

    $scope.setPlugin = function(plugin) {
        if (plugin =="jerasure") $scope.techniques = ["reed_sol_van","reed_sol_r6_op","cauchy_orig","cauchy_good","liberation","blaum_roth","liber8tion"];
        else if (plugin =="isa") $scope.techniques = ["reed_sol_van","cauchy"];
        else $scope.techniques = [];
    }

    $scope.reset();
}