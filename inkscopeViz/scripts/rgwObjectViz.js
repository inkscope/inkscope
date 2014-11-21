/**
 * Created by Alain Dechorgnat on 1/3/14.
 */
var RGWobjectVizApp = angular.module('RGWobjectVizApp', ['ui.bootstrap','dialogs'])
    .filter('bytes', funcBytesFilter)
    .filter('duration', funcDurationFilter);

RGWobjectVizApp.controller("RGWobjectVizCtrl", function ($scope, $http, $location, $dialogs) {
    var apiURL = '/ceph-rest-api/';

    var w = window, d = document, e = d.documentElement, g = d.getElementsByTagName('body')[0];
    $scope.screenSize = {"x": w.innerWidth || e.clientWidth || g.clientWidth, "y": w.innerHeight || e.clientHeight || g.clientHeight};

    var i = $location.absUrl().indexOf("?");
    if (i > -1)
        baseurl = $location.absUrl().substring(0,i);
    else
        baseurl = $location.absUrl();

    var svg = d3.select("#chart2")
        .attr("width", $scope.screenSize.x - 40)
        .attr("height", $scope.screenSize.y - 170);

    $http({method: "get", url: inkscopeCtrlURL + "S3/bucket", data:"stats=False" }).
        success(function (data, status) {
            $scope.status = status;
            $scope.buckets =  data;
        }).
        error(function (data, status, headers) {
            //alert("refresh buckets failed with status "+status);
            $scope.status = status;
            $scope.buckets =  data || "Request failed";
        });

    $scope.getObjects = function(bucketName) {
        $scope.selectedObject = null;
        resetChart();

        $http({method: "get", url: inkscopeCtrlURL + "S3/bucket/"+bucketName+"/list" }).
            success(function (data, status) {
                //alert("refresh objects status "+status +"\n"+data);
                $scope.status = status;
                $scope.objects =  data;
            }).
            error(function (data, status, headers) {
                //alert("refresh objects failed with status "+status +"\n"+data);
                $scope.status = status;
                $scope.objects = [];
                $dialogs.error("<h3>Get objects failed with status "+status+" for bucket <strong>"+bucketName+"</strong> !</h3> <br>"+data);
            });
    }
    $scope.setObject = function() {
        resetChart();
    }
        //refresh data every x seconds
    var myTimer;

    $scope.changePeriod = function(){
        console.log("new period : " + $scope.refreshPeriod);
        if ($scope.refreshPeriod<=1) {
            window.clearInterval(myTimer);
            return;
        }
        window.clearInterval(myTimer);
        myTimer = setInterval(function () {
            refreshData()
        }, $scope.refreshPeriod * 1000);
    }

    function resetChart(){
        $scope.network = {};
        $scope.network.nodes = [];
        $scope.network.links = [];
        trace($scope.network, "#chart");
    }

    $scope.showObject = function() {
        $scope.network = {};
        $scope.date = new Date();
        var params = "bucketName="+$scope.bucketName+"&objectId="+$scope.selectedObject.name;
        $http({method: "get", url: inkscopeCtrlURL + "S3/object?"+ params , headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
            .success(function (data, status) {
                var nodes = [];
                for (var i=0; i < data.chunks.length;i++){
                    var node = {};
                    var chunk = data.chunks[i];
                    node.type = "chunk";
                    node.name= chunk.id;
                    node.id= i;
                    node.range = i+1+"/"+data.chunks.length;
                    node.size= chunk.size;
                    node.pgid = chunk.pgid;
                    nodes.push(node);
                }
                var j=i;
                for (var i=0; i < data.osds.length;i++){
                    var node = {};
                    var osd = data.osds[i];
                    node.type = "osd";
                    node.id= j+i;
                    node.num = osd.id.split('.')[1];
                    node.name= osd.id;
                    node.status = osd.status;
                    node.host = osd.host;
                    node.capacity = osd.capacity;
                    node.occupation = osd.occupation;
                    node.nbchunks=0;
                    nodes.push(node);
                }
                $scope.network.nodes = nodes;
                var links = [];
                var pgs = data.pgs;
                for (var i=0; i < data.chunks.length;i++){
                    var chunk = data.chunks[i];
                    var pgid = chunk.pgid;
                    var pg = null;
                    for (var j=0; j<pgs.length;j++){
                        if (pgid == pgs[j].pgid){
                            pg = pgs[j];
                            break;
                        }
                    }
                    if (pg==null) continue;
                    for (var k=0; k<pg.acting.length; k++){
                        var link = {};
                        var numOsd = pg.acting[k];
                        link.source = i; // /!\ même indice que le chunk par construction du tableau de node
                        link.pg = pg.pgid ;
                        link.state = pg.state;
                        link.acting = pg.acting ;
                        link.up = pg.up;
                        link.acting_primary = pg.acting_primary ;
                        link.up_primary = pg.up_primary ;
                        link.value = chunk.size;
                        //target?
                        for (var o=0; o < nodes.length;o++){
                            node = nodes[o];
                            if ((node.type == "osd") && (node.num == numOsd)){
                                node.nbchunks++;
                                link.target= node.id;
                            }
                        }
                        links.push(link);
                    }
                }
                $scope.network.links = links;
                $scope.poolId = data.poolId ;
                $scope.poolName = data.poolName ;
                $scope.object =data.id;
                $scope.objectSize = funcBytes(data.size);
                trace($scope.network, "#chart");

                })
            .error(function (data, status) {
                $scope.status = status;
                $dialogs.error("<h3>Can't load object details for <strong>"+$scope.selectedObject.name+"</strong> !</h3> <br>"+data);
            });
    };

    function trace(network, id , $location) {
        var margin = {top: 0, right: 20, bottom: 10, left: 20},
            width = $scope.screenSize.x - 40 - margin.left - margin.right,
            height = $scope.screenSize.y - 180 - margin.top - margin.bottom;

        var formatNumber = d3.format(",.0f"),
            format = function (d) {
                return formatNumber(d) + " pgs";
            },
            color = d3.scale.category20();

        d3.select("#myViz").remove();

        var svg = d3.select(id).append("svg")
            .attr("id", "myViz")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var sankey = d3.sankey()
            .nodeWidth(40)
            .nodePadding(10)
            .size([width, height]);

        var path = sankey.link();

        sankey
            .nodes(network.nodes)
            .links(network.links)
            .layout(32);

        var link = svg.append("g").selectAll(".link")
            .data(network.links)
            .enter().append("path")
            .attr("class", "link")
//            .style("name", function (d) {
//                return d.pg;
//            })
            .attr("d", path)
            .style("stroke-width", function (d) {
                return Math.max(1, d.dy);
            })
            .style("stroke", function (d) {
                return "#00FF00";
                //return color4states(d.states);
            })
            .sort(function (a, b) {
                return b.id - a.id;
            })
            .attr("id", function(d){return d.pg;})
            .attr("osd", function(d){return d.target.name;})
            .attr("pg", function(d){return d.pg;})
            .on("mouseover",function(d){
                console.log("mouseover ( dy = "+ d.dy+ " ) , ( "+ d.source.x+ " , "+ d.source.y+ " ) , ( "+ d.target.x+ " , "+ d.target.y +" )");
            });

        link.append("title")
            .text(function (d) {
                sourceName = (d.source.type=="chunk")? "chunk "+d.source.name :d.source.name;
                targetName = (d.target.type=="chunk")? "chunk "+d.target.name :d.target.name;
                if (d.source.type=="chunk")
                    return sourceName + " → " + targetName + "\npg " + d.pg + "\n" + d.state;
                else
                    return sourceName + " → " + targetName;
            });

        var node = svg.append("g").selectAll(".node")
            .data(network.nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", function (d) {
                //var x = (d.type=="chunk") ? 20 : d.x;
                return "translate(" + d.x + "," + d.y + ")";
            })

            .on("mouseover",function(d){
                console.log("mouseover "+ d.name+ " , "+ d.id+ " , "+ d.type );
                if (d.type == "chunk") {
                    var chunkName = d.name;
                    svg.selectAll(".link ")
                        .style("stroke",function (d){
                            if ((d.source.name== chunkName) || (d.target.name== chunkName) )return "#F00";
                            else return "#0a0";
                        })
                    return;
                };
                if (d.type == "osd") {
                    var osdName = d.name;
                    svg.selectAll(".link ")
                        .style("stroke",function (d){
                            if (d.target.name == osdName) return "#F00"; else return "#0a0";
                        })
                    return;
                };
            })
            .on("mouseout",function(d){
                    svg.selectAll(".link ").style("stroke","#0a0");
            });

        node.append("rect")
            .attr("height", function (d) {
                if (d.dy < 5)return 5;
                return d.dy;
            })
            .attr("width", sankey.nodeWidth())
            .style("fill", function (d) {
                //if (!d.states) return  d.color = color(d.name.replace(/ .*/, ""));
                /*if (d.states.indexOf("up") < 0) return "red";
                else
                */
                return "green";
                ;
            })
            .style("stroke-width", function (d) {
                return 2;
            })
            .style("stroke", function (d) {
                if (d.in == 1) return "red";
                return d3.rgb(d.color).darker(2);
            })
            .append("title")
            .text(function (d) {
                if (d.type == "osd")
                    return d.name + "\n"
                        +d.nbchunks + " chunk(s)\n"
                        +d.host + "\n"
                        + "capacity: " + funcBytes(d.capacity) + "\n"
                        + "occupation: " + Math.floor(d.occupation* 100) + "%\n"
                        + (d.in == 1 ? "out" : "in");
                else if (d.type == "chunk")
                    return "chunk " + d.name + "\n"
                        + "size: " + funcBytes(d.size) + "\n"
                else
                    return d.name + "\n";
            });

        node.append("text")
            .attr("x", -6)
            .attr("y", function (d) {
                return d.dy / 2;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(function (d) {
                if (d.type == "osd")
                    return d.name + " (" + funcBytes(d.value)+")";
                else if (d.type == "chunk")
                    return "chunk "+d.name + "\n"+ " (" + funcBytes(d.size)+")";
                else
                    return d.name + "\n"+ " (" + funcBytes(d.size)+")";
            })
            .filter(function (d) {
                return d.x < width / 2;
            })
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start");
    }

});