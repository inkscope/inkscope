/**
 * Created by Alain Dechorgnat on 1/18/14.
 */
// angular stuff
// create module for custom directives
var OsdsApp = angular.module('OsdsApp', ['D3Directives','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .filter('duration', funcDurationFilter);


OsdsApp.controller("OsdsCtrl", function ($rootScope, $scope, $http, $location ,$window) {
    $scope.dispoModes = ["state" , "used space (%)"];
    $scope.dispoMode = "state";

    $scope.count = 0;
    $scope.nbOsd = 0;
    $scope.filtered = false;

    $scope.osd = null;

    // start refresh when fsid is available
    var waitForFsid = function ($rootScope, $http,$scope){
        typeof $rootScope.fsid !== "undefined"? startRefresh($rootScope, $http,$scope) : setTimeout(function () {waitForFsid($rootScope, $http,$scope)}, 1000);
        function startRefresh($rootScope, $http,$scope){
            getOsds();
            setInterval(function () {getOsds()},15*1000);
        }
    }
    waitForFsid($rootScope, $http,$scope);


    function getOsds() {
        $scope.date = new Date();
        var stateFilter = "";
        var i = $location.absUrl().indexOf("state");
        if ($location.absUrl().indexOf("state") > -1)
            stateFilter = $location.absUrl().substring($location.absUrl().indexOf("state")+5);
        $scope.inFilter = (stateFilter!="")? stateFilter.indexOf("in") > -1 : false;;
        $scope.outFilter = (stateFilter!="")? stateFilter.indexOf("out") > -1 : false;;
        $scope.upFilter = (stateFilter!="")? stateFilter.indexOf("up") > -1 : false;;
        $scope.downFilter = (stateFilter!="")? stateFilter.indexOf("down") > -1 : false;;

        $http({method: "get", url: inkscopeCtrlURL + $rootScope.fsid+"/osd?depth=2"}).

            success(function (data, status) {
                $scope.nbOsd = data.length;
                $scope.filtered = $scope.inFilter || $scope.outFilter || $scope.upFilter || $scope.downFilter;
                if ($scope.filtered){
                    var filteredData = [];
                    for ( var i=0; i<data.length;i++){
                        if ($scope.inFilter && !data[i].stat.in) continue;
                        if ($scope.outFilter && data[i].stat.in) continue;
                        if ($scope.upFilter && !data[i].stat.up) continue;
                        if ($scope.downFilter && data[i].stat.up) continue;
                        filteredData.push(data[i]);
                    }
                    data = filteredData;
                }
                for ( var i=0; i<data.length;i++){
                    data[i].id = data[i]._id;
                    if ( data[i].stat == null)
                        data[i].lastControl = "-";
                    else
                        data[i].lastControl = ((+$scope.date)-data[i].stat.timestamp)/1000;
                }

                // search for selected osd, first one if none
                if ($scope.selectedOsd+"" == "undefined"){
                    $scope.osdSelect(data[0]);
                    //$scope.osd = data[0];
                    //$scope.selectedOsd = data[0].id;
                }
                else{
                    for ( var i=0; i<data.length;i++){
                        if (data[i].id == $scope.selectedOsd){
                            //$scope.osd = data[i];
                            $scope.osdSelect(data[i]);
                            break;
                        }
                    }
                }
                $scope.data = data;
                $scope.count = data.length;
                $scope.osdControl = data[0].lastControl;

            }).
            error(function (data, status) {
                $scope.status = status;
                $scope.data = data || "Request failed";
            });
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

    $scope.prettyPrint = function( object){
        return object.toString();
    }

    $scope.prettyPrintKey = function( key){
        return key.replace(new RegExp( "_", "g" )," ")
    }


    $scope.osdSelect = function (osd) {
        $scope.osd = osd;
        $scope.selectedOsd = osd.node._id;

        var requestData = '{"$select" : {"osd.$id":'+$scope.selectedOsd+'},"$template" : {"timestamp":1, "up":1, "in":1}}';
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
                        .transitionDuration(350)  //how fast do you want the lines to transition?
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

    $scope.addFilter =function(filter){
        if (filter == "in"){
            $scope.outFilter=false;
            $scope.inFilter=true;
            $scope.applyFilters();
            return;
        }
        if (filter == "out"){
            $scope.inFilter=false;
            $scope.outFilter=true;
            $scope.applyFilters();
            return;
        }
        if (filter == "up"){
            $scope.upFilter=true;
            $scope.downFilter=false;
            $scope.applyFilters();
            return;
        }
        if (filter == "down"){
            $scope.upFilter=false;
            $scope.downFilter=true;
            $scope.applyFilters();
            return;
        }
    }

    $scope.removeFilter =function(filter){
        if (filter == "in"){
            $scope.inFilter=false;
            $scope.applyFilters();
            return;
        }
        if (filter == "out"){
            $scope.outFilter=false;
            $scope.applyFilters();
            return;
        }
        if (filter == "up"){
            $scope.upFilter=false;
            $scope.applyFilters();
            return;
        }
        if (filter == "down"){
            $scope.downFilter=false;
            $scope.applyFilters();
            return;
        }
    }

    $scope.applyFilters =function(){
        var filterString="";
        if ($scope.upFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "up";
        }
        if ($scope.downFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "down";
        }
        if ($scope.inFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "in";
        }
        if ($scope.outFilter){
            if (filterString!="") filterString+= "+";
            filterString+= "out";
        }
        $window.location.href = "osds.html?state="+filterString;
    }

    $scope.home = function(){
        $window.location.href = "index.html";
    }

});