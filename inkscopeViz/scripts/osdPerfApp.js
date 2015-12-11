// angular stuff
// create module for custom directives
var osdPerfApp = angular.module('OsdPerf', ['ngRoute','ngTable','D3Directives','ui.bootstrap','dialogs','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .filter('duration', funcDurationFilter);

function OsdPerfCtrl($rootScope, $scope, $routeParams, $http, $filter, ngTableParams, $window) {

    $rootScope.tableParams = new ngTableParams({
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
            $rootScope.orderedData = params.sorting() ?
                $filter('orderBy')($rootScope.osds, params.orderBy()) :
                data;
            $defer.resolve($rootScope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });

    getOsdPerf();
    setInterval(function () { getOsdPerf(); }, 10000);

    function getOsdPerf() {
        $rootScope.date = new Date();

        $http({method: "get", url: cephRestApiURL + "osd/perf.json"}).
            success(function (data, status) {
                $rootScope.status = status;
                $rootScope.osds = data.output.osd_perf_infos;
                $rootScope.tableParams.reload();

            }).
            error(function (data, status) {
                $rootScope.status = status;
                $rootScope.osds = [];
            });
    }

    function getOsdInfo(osdId) {
        var requestData = '{"_id":'+osdId+'}';
        $http({method: "post", url: inkscopeCtrlURL + $rootScope.fsid+"/osd?depth=2", data:requestData})
            .success(function (data, status) {
                $scope.osd = data[0];
                $scope.osd .id = $scope.osd ._id;
                if ( $scope.osd .stat == null) {
                    $scope.osd .lastControl = "-";
                    $scope.osd .reweight = "N/A";
                }
                else {
                    $scope.osd .lastControl = ((+new Date()) - $scope.osd .stat.timestamp) / 1000;
                    $scope.osd .reweight = $scope.osd .stat.weight;
                }
                var requestData = '{"$select" : {"osd.$id":'+osdId+'},"$template" : {"timestamp":1, "up":1, "in":1}}';
                $http({method: "post", url:  inkscopeCtrlURL + $rootScope.fsid+"/osdstat", data: requestData}).
                    success(function(data,status){
                        addStatGraph(data);
                    }).
                    error(function (data, status, headers) {
                        $scope.stats=[];
                    }
                );

                function addStatGraph(data){
                    //Line chart data should be sent as an array of series objects.
                    var osd_up = [],osd_in = [];
                    var last_up = -1;
                    var last_in = -1;
                    var lastElement={};
                    data.sort( function( a, b ) { return a.timestamp - b.timestamp });
                    data.forEach(function(e,i,tab){
                        if ((last_up!= e.up)||(last_in!= e.in)) {
                            //console.log(e.timestamp+" "+ e.up+" "+ e.in);
                            if (last_up!=-1){
                                osd_up.push({x: e.timestamp-1, y: last_up?3:2});
                                osd_in.push({x: e.timestamp-1, y: last_in?1:0});
                            }
                            osd_up.push({x: e.timestamp, y: e.up?3:2});
                            osd_in.push({x: e.timestamp, y: e.in?1:0});
                            last_up = e.up;
                            last_in = e.in;
                        }
                        lastElement = e;
                    });
                    osd_up.push({x: lastElement.timestamp, y: lastElement.up?3:2});
                    osd_in.push({x: lastElement.timestamp, y: lastElement.in?1:0});
                    data =  [
                        {
                            values: osd_up,      //values - represents the array of {x,y} data points
                            key: 'up/down ', //key  - the name of the series.
                            color: '#3030ff'  //color - optional: choose your own line color.
                        },
                        {
                            values: osd_in,
                            key: 'in/out',
                            color: '#ff7f0e'
                        }
                    ];

                    nv.addGraph(function() {
                        var chart = nv.models.lineChart()
                                .margin({left: 35,right:40})  //Adjust chart margins to give the x-axis some breathing room.
                                .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
                                //.transitionDuration(350)  //how fast do you want the lines to transition?
                                .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
                                .showYAxis(true)        //Show the y-axis
                                .showXAxis(true)        //Show the x-axis
                                .forceY([0,3])
                            ;

                        chart.xAxis     //Chart x-axis settings
                            .tickFormat(function(d) { return d3.time.format('%X')(new Date(d)) });

                        chart.xScale(d3.time.scale()); //fixes misalignment of timescale with line graph

                        chart.yAxis     //Chart y-axis settings
                            .axisLabel('state')
                            .tickFormat(function(d) {
                                    if (d==0) return "out";
                                    if (d==1) return "in";
                                    if (d==2) return "down";
                                    if (d==3) return "up";
                                });

                        d3.select('#osdStatGraph svg')    //Select the <svg> element you want to render the chart in.
                            .datum(data)         //Populate the <svg> element with chart data...
                            .call(chart);          //Finally, render the chart!

                        //Update the chart when window resizes.
                        nv.utils.windowResize(function() { chart.update() });
                        return chart;
                    });

                }
            })
            .error(function (data, status) {
                $scope.status = status;
                $scope.data = data || "Request failed";
            });
    }

    $scope.showOsd=function(osdId){
        if (typeof $scope.getOsdInfoTimer !=='undefined') clearInterval($scope.getOsdInfoTimer);
        getOsdInfo(osdId);
        $scope.getOsdInfoTimer = setInterval(function () { getOsdInfo(osdId); }, 10000);
    }

    $scope.osdClass = function (osd){
        if ( osd == null) return "osd_unknown";
        if ( osd.stat == null) return "osd_unknown";
        var osdin = osd.stat.in;
        var osdup = osd.stat.up;
        var osdclass = (osdin == true) ? "osd_in " : "osd_out ";
        osdclass += (osdup == true) ? "osd_up" : "osd_down";
        //console.log(osdclass);
        return osdclass;
    }

    $scope.osdState = function (osd){
        if ( osd == null) return "unknown state";
        if ( osd.stat == null) return "unknown state";
        var osdin = osd.stat.in;
        var osdup = osd.stat.up;
        var osdstate = (osdin == true) ? "in / " : "out / ";
        osdstate += (osdup == true) ? "up" : "down";
        return osdstate;
    }
    $scope.osdIn = function (osd) {
        $http({method: "put", url: cephRestApiURL + "osd/in?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }

    $scope.osdOut = function (osd) {
        $http({method: "put", url: cephRestApiURL + "osd/out?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }

    $scope.osdDown = function (osd) {
        $http({method: "put", url: cephRestApiURL + "osd/down?ids="+osd}).

            success(function (data, status) {

            }).
            error(function (data, status) {

            });
    }


    $scope.osdReweight = function (osd) {
        $http({method: "put", url: cephRestApiURL + "osd/reweight?id="+osd +"&weight="+$scope.reweight}).
            success(function (data, status) {
                alert(data.status);
            }).
            error(function (data, status) {

            });
    }

}