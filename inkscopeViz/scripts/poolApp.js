/**
 * Created by arid6405 on 11/21/13.
 */

angular.module('poolApp', ['ngRoute','ngTable','D3Directives','ui.bootstrap','dialogs','InkscopeCommons' ])
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
            $scope.date = new Date();
            $scope.pools =  data.output.pools;
            $scope.stats = data.output.stats;
            var totalUsed = data.output.stats.total_used;
            var totalSpace = data.output.stats.total_space;


            if ( typeof data.output.stats.total_used_bytes === "undefined")
                $scope.totalUsed = data.output.stats.total_used * 1024;
            else
                $scope.totalUsed = data.output.stats.total_used_bytes;

            if ( typeof data.output.stats.total_bytes === "undefined")
                $scope.totalSpace = data.output.stats.total_space * 1024;
            else
                $scope.totalSpace = data.output.stats.total_bytes;

            $scope.percentUsed = $scope.totalUsed / $scope.totalSpace;
            $scope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            //alert("refresh pools failed with status "+status);
            $scope.status = status;
            $scope.pools =  data || "Request failed";
            $scope.totalUsed = "N/A";
            $scope.totalSpace = "N/A";
            $scope.stats.total_used = "N/A";
            $scope.stats.total_space = "N/A";
        });
}

function getRules($http, $scope, $templateCache) {
    $http({method: "get", url: cephRestApiURL + "osd/crush/dump.json", cache: $templateCache}).
        success(function (data, status) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.rules = data.output.rules;
            $scope.rulestab = {"replicated" :[], "erasure":[]};
            for (var i = 0; i < $scope.rules.length; i++) {
                var rule = $scope.rules[i];
                if (rule.type==1) $scope.rulestab["replicated"].push(rule);
                else if (rule.type==3) $scope.rulestab["erasure"].push(rule);
            }

        }).
        error(function (data, status, headers) {
            //alert("refresh pools failed with status "+status);
            $scope.status = status;
            $scope.pools =  data || "Request failed";
        });
}

function getErasureProfiles($http, $scope) {
    $http({method: "get", url: cephRestApiURL + "osd/erasure-code-profile/ls.json"}).
        success(function (data, status) {
            $scope.status = status;
            $scope.erasureProfiles =  data.output;
        }).
        error(function (data, status, headers) {
            //alert("refresh erasureProfiles failed with status "+status);
            $scope.status = status;
            $scope.erasureProfiles =  ['default'];
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

    getRules($http,$scope)
    getErasureProfiles($http,$scope)

    $scope.showDetail = function (poolid) {
        $location.path('/detail/'+poolid);
    }
}

function SnapshotCtrl($scope, $http, $routeParams, $location, $dialogs) {
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

function DetailCtrl($scope, $http, $routeParams, $route, $dialogs, ngTableParams , $filter) {
    i = 0;
    poolParameters = {
            pool:{cat:"General",transform:"",rank:i++},
            pool_name:{cat:"General",transform:"",rank:i++},
            auid:{cat:"General",transform:"",rank:i++},
            type:{cat:"General",transform:"getPoolTypeLabel",rank:i++},
            size:{cat:"General",transform:"",rank:i++},
            min_size:{cat:"General",transform:"",rank:i++},
            crush_ruleset:{cat:"General",transform:"getRulesetNameLabel",rank:i++},
            pg_num:{cat:"General",transform:"",rank:i++},
            pg_placement_num:{cat:"General",transform:"",rank:i++},
            quota_max_bytes:{cat:"General",transform:"getBytesLabel",rank:i++},
            quota_max_objects:{cat:"General",transform:"",rank:i++},
            flags_names:{cat:"General",transform:"",rank:i++},
            tiers:{cat:"Cache tiering",transform:"getPoolLabel",rank:i++},
            tier_of:{cat:"Cache tiering",transform:"getPoolLabel",rank:i++},
            read_tier:{cat:"Cache tiering",transform:"getPoolLabel",rank:i++},
            write_tier:{cat:"Cache tiering",transform:"getPoolLabel",rank:i++},
            cache_mode:{cat:"Cache tiering",transform:"",rank:i++},
            cache_target_dirty_ratio_micro:{cat:"Cache tiering",transform:"getPercentFromMicroLabel",rank:i++},
            cache_target_full_ratio_micro:{cat:"Cache tiering",transform:"getPercentFromMicroLabel",rank:i++},
            cache_min_flush_age:{cat:"Cache tiering",transform:"getSecondLabel",rank:i++},
            cache_min_evict_age:{cat:"Cache tiering",transform:"getSecondLabel",rank:i++},
            target_max_age:{cat:"Cache tiering",transform:"getSecondLabel",rank:i++},
            target_max_objects:{cat:"Cache tiering",transform:"",rank:i++},
            target_max_bytes:{cat:"Cache tiering",transform:"getBytesLabel",rank:i++},
            hit_set_count:{cat:"Cache tiering",transform:"",rank:i++},
            hit_set_period:{cat:"Cache tiering",transform:"getSecondLabel",rank:i++},
            hit_set_params:{cat:"Cache tiering",transform:"getPrettyfiedJSONLabel",rank:i++},
            erasure_code_profile:{cat:"Erasure coded pool",transform:"getECProfile",rank:i++},
            snap_epoch:{cat:"Snapshot",transform:"",rank:i++},
            snap_mode:{cat:"Snapshot",transform:"",rank:i++},
            snap_seq:{cat:"Snapshot",transform:"",rank:i++},
            pool_snaps:{cat:"Snapshot",transform:"getSnapshotLabel",rank:i++},
            removed_snaps:{cat:"Snapshot",transform:"",rank:i++}
    };

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

            $scope.detailedPoolParams=new Array();
            for (var key in $scope.detailedPool){
                var param ={};
                keyParams = poolParameters[key];
                if (typeof keyParams !== "undefined"){
                    transformFunctionName = keyParams.transform;
                    param.cat = keyParams.cat;
                    param.rank = keyParams.rank;
                }
                else {
                    transformFunctionName = "";
                    param.cat = "Uncategorized";
                    param.rank = 9999;
                }
                if (transformFunctionName =="")
                    param.value = ""+$scope.detailedPool[key];
                else {
                    transformFunction = $scope[transformFunctionName];
                    if (typeof transformFunction === "function"){
                        //console.log(key+" : "+transformFunctionName+" : "+JSON.stringify($scope.detailedPool[key]));
                        param.value = transformFunction($scope.detailedPool[key]);
                    }
                    else
                        param.value = ""+$scope.detailedPool[key];
                }
                param.key=key.replace('_',' ', 'gi');

                $scope.detailedPoolParams.push(param);

            }
            $scope.firstGroup=true;
            $scope.checkGroup = function(group){
                if ($scope.firstGroup) $scope.firstGroup = false;
                else group.$hideRows=true;
            }
            $scope.poolParams = new ngTableParams({
                page: 1,            // show first page
                count: -1,          // count per page
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
                        $filter('orderBy')($scope.detailedPoolParams, params.orderBy()) :
                        data;
                    $defer.resolve($scope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
            });

        }).
        error(function (data, status, headers) {
            $scope.status = status;
            $scope.pools =  data || "Request failed";
            $dialogs.error("<h3>Can't display pools with num "+$routeParams.poolNum+"</h3><br>"+$scope.data);
        });

    /* transform function for parameters */
    $scope.getRulesetNameLabel=function(rulesetid){
        if ( typeof $scope.rules === "undefined") return rulesetid;
        for (var i in $scope.rules){
            if ($scope.rules[i].ruleset == rulesetid) return rulesetid+" ("+$scope.rules[i].rule_name+")";
        }
        return rulesetid+" (unknown)";
    }
    $scope.getPoolLabel = function(poolid){
        if ((typeof poolid == "object")&&(poolid.length ==0)) return "none";
        if (poolid== -1) return "-1";
        for (var i in $scope.pools)if (poolid == $scope.pools[i].id) return poolid +" (<a href='#/detail/"+poolid+"'>"+ $scope.pools[i].name+"</a>)";
        return poolid +" (unknown)";
        }
    $scope.getPoolTypeLabel = function(type){typeLabels = ["","replicated","raid-4","erasure"];return type+ " ("+typeLabels[type]+")";}
    $scope.getECProfile = function(profile){ return "<a href='erasureProfiles.html#/detail/"+profile+"'>"+profile+"</a>"}
    $scope.getPercentFromMicroLabel = function(value){return  (value / 10000).toFixed(0) + " %";}
    $scope.getSecondLabel=function(value){return value+" s";}
    $scope.getBytesLabel=function(value){if (value==0) return "0"; else return funcBytes(value,"bytes");}
    $scope.getPrettyfiedJSONLabel=function(obj){
        //console.log("getPrettyfiedJSONLabel : "+JSON.stringify(obj));
        var label = "";
        for  (var key in obj){
            //console.log (key);
            label+= key+ ' : '+obj[key]+"<br>";
        }
        return label;
    }

    $scope.getSnapshotLabel=function(obj){
        console.log("getSnapshotLabel : "+JSON.stringify(obj));

        if (obj.length == 0 ) return "none";
        $scope.hasSnap=true;
        var label="";
        for (var i=0; i< obj.length;i++){
            var value = obj[i];
            $scope.snap_name = value["name"];
            if (label!="") label +="<br>";
            label+="nr: "+value["snapid"]+", date: "+value["stamp"]+", name: "+value["name"];}
        return label;
    }

     /**/

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
    $scope.master.erasure_code_profile = "";
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
            if ($scope.master.type==1)$scope.master.type="replicated";
            else
                if ($scope.master.type==3)$scope.master.type="erasure";
                else $scope.master.type="unknown";
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
