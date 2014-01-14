/**
 * Created by Alain Dechorgnat on 12/13/13.
 */

var StatusApp = angular.module('StatusApp', ['D3Directives'])
    .filter('bytes', funcBytesFilter);

StatusApp.controller("statusCtrl", function ($scope, $http) {
    var apiURL = '/ceph-rest-api/';

    //refresh data every x seconds
    refreshData();
    setInterval(function () {
        refreshData()
    }, 3*1000);

    function refreshData() {
        //console.log("refreshing data...");
        $scope.date = new Date();
        $http({method: "get", url: apiURL + "status.json"})
            .success(function (data) {
                $scope.pgmap = data.output.pgmap;
                $scope.percentUsed = $scope.pgmap.bytes_used /$scope.pgmap.bytes_total;
                $scope.pgsByState = $scope.pgmap.pgs_by_state;

                $scope.health = {};
                $scope.health.severity = data.output.health.overall_status;
                if (data.output.health.summary[0])
                    $scope.health.summary = data.output.health.summary[0].summary;
                else $scope.health.summary = "OK";

                $scope.mons = data.output.health.health.health_services[0].mons;

                for (var i = 0; i < $scope.mons.length; i++) {
                    var mon = $scope.mons[i];
                    //console.log(mon.name);
                    mon.quorum = "out";
                    for (var j = 0; j < data.output.quorum_names.length; j++) {
                        if (mon.name == data.output.quorum_names[j]) {
                            mon.quorum = "in";
                            break
                        }
                    }
                }
                for (var i = 0; i < $scope.mons.length; i++) {
                    var mon = $scope.mons[i];
                    //console.log(mon.name);
                    mon.addr = "";
                    mon.rank = "";
                    for (var j = 0; j < data.output.monmap.mons.length; j++) {
                        mon2 = data.output.monmap.mons[j];
                        if (mon.name == mon2.name) {
                            mon.addr = mon2.addr;
                            mon.rank = mon2.rank;
                            break
                        }
                    }
                }



                var osdmap = data.output.osdmap.osdmap;
                $scope.osdsUp = osdmap.num_up_osds;
                $scope.osdsIn = parseInt(osdmap.num_in_osds);
                $scope.osdsOut = osdmap.num_osds - osdmap.num_in_osds;
                $scope.osdsDown = $scope.osdsIn - $scope.osdsUp + $scope.osdsOut;

            })
            .error(function (data) {
                $scope.health = {};
                $scope.health.severity = "HEALTH_WARN";
                $scope.health.summary = "Status not available";
            });
    }

    $scope.osdClass = function (type, count) {
        if ((count == 0) || (count+"" == "undefined"))
            return "health_status_HEALTH_UNKNOWN osd";
        else
            return "health_status_HEALTH_" + type + " osd";
    }

});

