/**
 * Created by Alain Dechorgnat on 2016/03/24.
 */
// angular stuff
// create module for custom directives

var toSecond = function (d) {
    return d.toFixed(2) + " s";
};

var toMillisecond = function (d) {
    return d.toFixed(2) + " ms";
};

function formatBase1024KMGTP(y) {
    var abs_y = Math.abs(y);
    if (abs_y >= 1125899906842624) {
        return (y / 1125899906842624).toFixed(2) + "P"
    }
    else if (abs_y >= 1099511627776) {
        return (y / 1099511627776).toFixed(2) + "T"
    }
    else if (abs_y >= 1073741824) {
        return (y / 1073741824).toFixed(2) + "G"
    }
    else if (abs_y >= 1048576) {
        return (y / 1048576).toFixed(2) + "M"
    }
    else if (abs_y >= 1024) {
        return (y / 1024).toFixed(2) + "K"
    }
    else if (abs_y < 1 && y > 0) {
        return y.toFixed(2)
    }
    else if (abs_y === 0) {
        return ''
    }
    else {
        return y
    }
}


var InfluxDBApp = angular.module('MonitoringApp', ['ngRoute','InkscopeCommons'])
    .filter('bytes', funcBytesFilter)
    .filter('duration', funcDurationFilter)
    .config(function ($routeProvider) {
        $routeProvider
            .when('/', {controller: 'MonitoringCtrl', templateUrl: ''})
            .when('/pool', {controller: 'MonitoringCtrl', templateUrl: 'partials/charts/poolCharts.html'})
            .when('/pool/:poolNum/:poolName', {controller: 'MonitoringCtrl', templateUrl: 'partials/charts/poolCharts.html'})
            .when('/pool/:poolNum/:poolName/:delay', {controller: 'MonitoringCtrl', templateUrl: 'partials/charts/poolCharts.html'})
            .when('/osd', {controller: 'MonitoringCtrl', templateUrl: 'partials/charts/osdCharts.html'})
            .when('/osd/:osdId', {controller: 'MonitoringCtrl', templateUrl: 'partials/charts/osdCharts.html'})
            .when('/osd/:osdId/:delay', {controller: 'MonitoringCtrl', templateUrl: 'partials/charts/osdCharts.html'});
    });

InfluxDBApp.controller("MonitoringCtrl", function ($rootScope, $scope, $http, $location , $window, $routeParams) {

    $scope.reinitCharts = function(){

        function checkConf() {
            if (typeof $rootScope.conf === 'undefined') {
                window.setTimeout(checkConf, 100);
                /* this checks the conf availability every 100 milliseconds*/
            } else {
                for (var i in $scope.charts){
                    initChart($scope.charts[i]);
                }
            }
        }
        checkConf();
    };

    $scope.criterias = [
        {label:'hour', duration:'1h', interval:'2m'},
        {label:'2 hours', duration:'2h', interval:'3m'},
        {label:'6 hours', duration:'6h', interval:'5m'},
        {label:'12 hours', duration:'12h', interval:'10m'},
        {label:'day', duration:'1d', interval:'10m'},
        {label:'2 days', duration:'2d', interval:'20m'},
        {label:'week', duration:'1w', interval:'30m'},
        {label:'2 weeks', duration:'2w', interval:'1h'},
        {label:'month', duration:'30d', interval:'1h'},
    ];

    function getInterval(delay){
        for (var i in $scope.criterias){
            if ($scope.criterias[i].duration==delay) return $scope.criterias[i].interval;
        }
        return '2m';
    }


    var delay = $routeParams.delay;
    if (typeof delay==='undefined') delay='1h';

    $scope.currentCriteria = {label:'hour', duration:delay, interval:getInterval(delay)};

    var GRAPH_WIDTH = 600;
    var GRAPH_HEIGHT = 150;
    var DIV_NAME = '#container';

    $scope.status = [];
    $scope.refreshPeriod = 0;
    $scope.current_refreshPeriod = $scope.refreshPeriod;
    $scope.timer = null;
    
    $scope.poolNum = $routeParams.poolNum;
    $scope.poolName = $routeParams.poolName;
    $scope.osdId = $routeParams.osdId;

    getPoolList($http, $scope);
    getOsdsInfo();

    console.log("pool name: "+$scope.poolName)

    $scope.changeRefreshPeriod = function (refreshPeriod) {
        if (refreshPeriod == $scope.current_refreshPeriod) return;
        if ($scope.current_refreshPeriod!=0){
            //stop timer
            clearInterval($scope.timer);
        }
        if (refreshPeriod!=0){
            //start timer
            $scope.timer = setInterval(function () {
                $scope.reinitCharts();
            }, refreshPeriod * 1000);
        }
        $scope.current_refreshPeriod = refreshPeriod;
        console.log("refresh period set to "+$scope.current_refreshPeriod);
    };

    $scope.reloadWithCriteria= function(criteria){
        $scope.currentCriteria = criteria;
        $scope.reinitCharts();
    };

    //$scope.reinitCharts();

    function getRequestUrl(chartParameters) {
        $scope.timeFilter = "time > now() - "+$scope.currentCriteria.duration;
        if (typeof chartParameters.fill ==='undefined') chartParameters.fill = 'none';

        var select = "SELECT mean(\"value\") FROM \"ceph-"+$rootScope.conf.cluster+"_value\" WHERE \"instance\" = '"+chartParameters.instance+"' AND "
            +$scope.timeFilter+" GROUP BY time("+$scope.currentCriteria.interval+"), \"type_instance\" fill("+chartParameters.fill+")";
        var parameters = "?db=collectd";
        console.log(select); 
        parameters += "&q=" + encodeURIComponent(select);

        return $rootScope.conf.influxdb_endpoint + "/query" + parameters;

    }

    function initChart (chartParameters){
        $scope.status[chartParameters.instance] = 'loading...';
        $http({
            method: "get",
            url: getRequestUrl(chartParameters)
        })
            .success(function (data, status) {
                $scope.date = new Date();
                if (typeof data.results[0].series ==='undefined'){
                    $scope.status[chartParameters.instance] = 'no data for '+chartParameters.instance;
                    return;
                }
                $scope.status[chartParameters.instance] = 'available';

                var legendClass = 'legend';
                if (typeof chartParameters.legend!=='undefined')
                    legendClass = legendClass+' legend-'+chartParameters.legend;

                var chartName = DIV_NAME+"_"+chartParameters.instance;
                if (typeof chartParameters.suffix !=='undefined')
                    chartName=chartName+chartParameters.suffix;
                //escape all . in chart name
                chartName = chartName.replace(new RegExp('\\.', 'g'), '\\.');

                $(chartName).empty();
                $(chartName).html("<div class='chart_container'>" +
                    "<div class='chart_title'>"+chartParameters.title+"</div>" +
                    "<div class='y_axis'/>" +
                    "<div class='chart'/>" +
                    "<div class='"+legendClass+"'/></div>");
                drawGraph(
                    $(chartName),
                    transformData(data.results[0].series, chartParameters),
                    chartParameters
                );
            })
            .error(function (data, status) {
                $scope.date = new Date();
                $scope.status[chartParameters.instance] = 'failed to load data: '+data;
            });
    }

    function transformData(series, chartParameters) {
        var palette = {};
        var coeff=1.0;
        if (typeof chartParameters.coeff!=='undefined')
            coeff = chartParameters.coeff;

        var newSeries = [];

        var min = Number.MAX_VALUE;
        var max = Number.MIN_VALUE;

        for (var k in series) {
            var serie = series[k];
            if (typeof chartParameters.filter !=='undefined'){
                if (chartParameters.filter.indexOf(serie.tags.type_instance)<0)
                    continue;
            }
            for (var i in serie.columns) {
                if (serie.columns[i] == 'time') continue;
                var newSerie = {
                    name: serie.tags.type_instance,
                    data: []
                };
                for (var j in serie.values) {
                    var y = serie.values[j][i]*coeff;
                    var value = {x: new Date(serie.values[j][0]).getTime() / 1000.0, y: y};
                    min = Math.min(min, y);
                    max = Math.max(max, y);
                    newSerie.data.push(value);
                }
                newSeries.push(newSerie);
            }
        }
        console.log(min + "/" + max);
        if (newSeries.length >8)
            palette = new Rickshaw.Color.Palette({ scheme: 'munin'});
        else
            palette = new Rickshaw.Color.Palette({ scheme: 'colorwheel'});
        for (var k in newSeries) {
            newSeries[k].scale = d3.scale.linear().domain([min, max]).nice();
            newSeries[k].color = palette.scheme[k];
        }
        return newSeries;
    }

    function drawGraph($element, series, chartParameters) {

        var Hover = Rickshaw.Class.create(Rickshaw.Graph.HoverDetail, {

            render: function (args) {

                legend.innerHTML = "";

                var time = document.createElement('time');
                time.className = 'chart_label';
                time.innerHTML = args.formattedXValue;
                legend.appendChild(time);

                args.detail.sort(function (a, b) {
                    return a.order - b.order
                }).forEach(function (d) {

                    var line = document.createElement('div');
                    line.className = 'line';

                    var swatch = document.createElement('div');
                    swatch.className = 'swatch';
                    swatch.style.backgroundColor = d.series.color;

                    var label = document.createElement('div');
                    label.className = 'chart_label';
                    if (chartParameters.unit == "seconds")
                        label.innerHTML = d.name + ": " + d.formattedYValue + " s";
                    else if (chartParameters.unit == "milliseconds")
                        label.innerHTML = d.name + ": " + d.formattedYValue + " ms";
                    else if (chartParameters.unit == "byte")
                        label.innerHTML = d.name + ": " + funcBytes(parseFloat(d.formattedYValue), 'bytes');
                    else if (chartParameters.unit == "byte/s")
                        label.innerHTML = d.name + ": " + funcBytes(parseFloat(d.formattedYValue), 'bytes')+'/s';
                    else if (chartParameters.unit == "op/s")
                        label.innerHTML = d.name + ": " + d.formattedYValue+' op/s';
                    else
                        label.innerHTML = d.name + ": " + d.formattedYValue;

                    line.appendChild(swatch);
                    line.appendChild(label);

                    legend.appendChild(line);

                    var dot = document.createElement('div');
                    dot.className = 'dot';
                    dot.style.top = graph.y(d.value.y0 + d.value.y) + 'px';
                    dot.style.borderColor = d.series.color;

                    this.element.appendChild(dot);

                    dot.className = 'dot active';

                    this.show();

                }, this);
            }
        });

        var graph = new Rickshaw.Graph({
            element: $element.find('.chart').get(0),
            //width: GRAPH_WIDTH,
            height: GRAPH_HEIGHT,
            series: series,
            renderer: "line",
            interpolation: "monotone"
        });

        var xAxis = new Rickshaw.Graph.Axis.Time({
            graph: graph
        });

        var yAxis_left_element = $element.find('.y_axis').get(0)
        var yAxis_left = new Rickshaw.Graph.Axis.Y.Scaled({
            graph: graph,
            orientation: 'left',
            element: yAxis_left_element,
            scale : series[0].scale,
            tickFormat: function(d){
                if (typeof chartParameters.unit!=='undefined'){
                    if (chartParameters.unit=='byte')
                        return formatBase1024KMGTP(Math.floor(d));
                    if (chartParameters.unit=='byte/s')
                        return formatBase1024KMGTP(Math.floor(d))+'/s';
                    if (chartParameters.unit=='seconds')
                        return toSecond(d);
                    if (chartParameters.unit=='milliseconds')
                        return toMillisecond(d);
                    if (chartParameters.unit=='op/s')
                        return d +' op/s';
                }
                return d;
            }
        });

        new Hover({graph: graph});

        var legend = $element.find('.legend').get(0);

        graph.render();

    }
    
    // specific functions

    $scope.getPoolStat= function(pool){
        $window.location.href ="monitorPool.html#/pool/"+pool.poolnum+"/"+pool.poolname+'/'+$scope.currentCriteria.duration;
    }

    $scope.getOsdStat= function(osdId){
        $window.location.href ="monitorOSD.html#/osd/"+osdId+'/'+$scope.currentCriteria.duration;
    }

    function getOsdsInfo() {
        $http({method: "get", url: cephRestApiURL + "osd/ls.json"}).
        success(function (data, status) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.osds =  data.output;
        }).
        error(function (data, status, headers) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.osds =  [];
        });
    }
});