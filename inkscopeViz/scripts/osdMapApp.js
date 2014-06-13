/**
 * Created by Alain Dechorgnat on 24/02/14.
 */
var osdMapApp = angular.module('osdMapApp', ['dialogs'])
    .filter('duration', funcDurationFilter);

osdMapApp.controller('OsdMapCtrl', function OsdMapCtrl($scope, $http, $location , $window, $dialogs) {
    $scope.osds = [];
    $scope.dispoModes = ["up/down", "in/out" , "free space (%)"];
    $scope.dispoMode = "up/down";
    $scope.osdControl = 0;
    $scope.warningMessage = "";
    if ($location.absUrl().indexOf("dispoMode=space") > -1) $scope.dispoMode = "free space (%)";
    // get OSD info and refresh every 10s
    getOsds();
    setInterval(function () {getOsds()},10*1000);

    // Prepare OSD topology from crushmap

    $http({method: "get", url: cephRestApiURL + "osd/crush/dump.json"}).
        success(function (data, status) {
            $scope.status = status;
            $scope.types = data.output.types;
            $scope.devices = data.output.devices;
            $scope.rawbuckets = data.output.buckets;
            $scope.findRoots(data.output.buckets);
            $scope.base =  $scope.rootTab[0].id;;
            $scope.buckets = $scope.computeBucketsTree(data.output.buckets , $scope.base);
        }).
        error(function (data, status) {
            $scope.status = status;
        });

    $scope.computeBucketsTree = function (rawbuckets , base) {
        var bucketsTab = [];
        var osdTab = [];

        // make array of buckets with bucket id as index
        for (var i = 0; i < rawbuckets.length; i++) {
            bucketsTab[rawbuckets[i].id] = rawbuckets[i];
        }
        // device's name for OSD (id >=0)
        for (var i = 0; i < $scope.devices.length; i++) {
            osdTab[$scope.devices[i].id] = $scope.devices[i].name;
        }
        // init tab with  bucket with id -1 as root
        var buckets = bucketsTab[base];

        //recursively make the tree of buckets for the D3 sunburst viz
        addChildren(buckets);
        //console.error(JSON.stringify(buckets));
        $scope.bucketsTab = bucketsTab;
        return buckets;

        function addChildren(bucket) {
            bucket.dispo = -1.0;
            bucket.children = [];
            for (var j = 0; j < bucket.items.length; j++) {
                var item = bucket.items[j];
                if (item.id < 0) {
                    //item is not an OSD
                    bucket.children.push(bucketsTab[item.id]);
                    addChildren(bucketsTab[item.id]);
                }
                else {
                    //item is an OSD
                    var osd = item;
                    osd.name = osdTab[item.id];
                    //compute dispo if data is available
                    if (typeof $scope.osds[item.id] !== 'undefined') {
                        osd.dispo = $scope.dispo($scope.osds[item.id]);
                    }
                    else
                        osd.dispo = -1.0; //"unknown"
                    bucket.children.push(osd);
                }
            }
        }
    }

    function getOsds() {
        $http({method: "get", url: inkscopeCtrlURL + "ceph/osd?depth=2"})
            .success(function (data, status) {
                $scope.date = new Date();
                $scope.status = status;
                $scope.osds = [];
                $scope.osdOut = 0;
                $scope.osdDown = 0;
                $scope.warningMessage = "";
                for (var i = 0; i < data.length; i++) {
                    data[i].id = data[i].node._id;
                    if (!data[i].stat.in) $scope.osdOut++;
                    if (!data[i].stat.up) $scope.osdDown++;
                    data[i].lastControl = ((+$scope.date) - data[0].stat.timestamp) / 1000;
                    try {
                        data[i].free = data[i].partition.stat.free;
                        data[i].total = data[i].partition.stat.total;
                        data[i].percent = data[i].free/data[i].total;
                    }
                    catch (e) {
                        data[i].free = "N/A";
                        data[i].total = "N/A";
                        data[i].percent = -1;
                    }
                    $scope.osds[data[i].id] = data[i];
                }
                if ($scope.osdDown >0) $scope.warningMessage += " OSD down : "+$scope.osdDown ;
                if ($scope.osdOut >0)  $scope.warningMessage = $scope.warningMessage ==''? " OSD out : "+$scope.osdOut : $scope.warningMessage +" / OSD out : "+$scope.osdOut ;
                $scope.osdControl = data[0].lastControl;
                //console.log(JSON.stringify($scope.osds));
                $scope.refreshStatusDisplay();
            })
            .error(function (data, status) {
                $scope.status = status;
                $scope.data = data || "Request failed";
            });
    }

    $scope.dispo= function(node) {
        if (typeof node === undefined) return -1;
        if ($scope.dispoMode == "up/down") return node.stat.up ? 1.0 : 0.0;
        if ($scope.dispoMode == "in/out") return node.stat.in ? 1.0 : 0.2;
        if ($scope.dispoMode == "free space (%)") return (node.percent== -1 ? "N/A": node.percent);
    }

    $scope.dispoOSD= function(nodeId) {
        if (typeof nodeId === undefined) return {"value":0,"total":0};;
        if ($scope.dispoMode == "up/down") return {"total":1,"value":$scope.osds[nodeId].stat.up ? 1.0 : 0.0};
        if ($scope.dispoMode == "in/out") return {"total":1,"value":$scope.osds[nodeId].stat.in ? 1.0 : 0.2};
        if ($scope.dispoMode == "free space (%)") return {"value":$scope.osds[nodeId].free,"total":$scope.osds[nodeId].total};
    }

    $scope.dispoOtherNode= function(nodeId) {
        if (typeof nodeId === undefined) return -1;
            var node = $scope.bucketsTab[nodeId];
            var value = 0 ;
            var total = 0 ;
            for (var i= 0; i< node.children.length;i++){
                var res =  node.children[i].id<0? $scope.dispoOtherNode(node.children[i].id) : $scope.dispoOSD(node.children[i].id);
                value += res.value;
                total += res.total;
            }
        $scope.bucketsTab[nodeId].value= value;
        $scope.bucketsTab[nodeId].total= total;
        $scope.bucketsTab[nodeId].dispo= value/total;
        return {"value":value,"total":total};
    }

    $scope.findRoots = function (rawbuckets) {
        var bucketsTab = [];
        var osdTab = [];
        // make array of buckets with bucket id as index
        for (var i = 0; i < rawbuckets.length; i++) {
            rawbuckets[i].childrenName =[];
            bucketsTab[rawbuckets[i].id] = rawbuckets[i];
            bucketsTab[rawbuckets[i].id].hasParent = false;
        }
        // device's name for OSD (id >=0)
        for (var i = 0; i < $scope.devices.length; i++) {
            osdTab[$scope.devices[i].id] = $scope.devices[i].name;
        }
        for (var i = 0; i < rawbuckets.length; i++) {
            var bucket = rawbuckets[i];
            for (var j= 0; j <bucket.items.length; j++){
                if (bucket.items[j].id<0) {
                    bucketsTab[bucket.items[j].id].hasParent = true;
                    rawbuckets[i].childrenName.push(bucketsTab[bucket.items[j].id].name);
                } else {
                    rawbuckets[i].childrenName.push(osdTab[bucket.items[j].id]);
                }
            }
            rawbuckets[i].childrenName.sort();
        }
        $scope.rootTab = [];
        for (var i = 0; i < rawbuckets.length; i++) {
            if ( ! bucketsTab[rawbuckets[i].id].hasParent) $scope.rootTab.push(bucketsTab[rawbuckets[i].id]);
        }
    }


    $scope.refreshStatusDisplay = function () {
        if ((typeof $scope.osds !== 'undefined') &&
            (typeof $scope.buckets !== 'undefined')) {
            for (var i = 0; i < $scope.osds.length; i++) {
                //immediate update of osd sectors
                var path = d3.select("#osd" + $scope.osds[i].id);
                path.style("fill", color4ascPercent($scope.dispo($scope.osds[i])));
            }
            $scope.dispoOtherNode($scope.base);
            for (var bucketId in $scope.bucketsTab) {
                //immediate update of sectors
                var path = d3.select("#osd" + $scope.bucketsTab[bucketId].id);
                if (""+path == "undefined"){
                    console.error("no path for bucketId "+bucketId +" : "+$scope.bucketsTab[bucketId].name);
                    continue;
                }
                if (""+$scope.bucketsTab[bucketId].dispo != "undefined")
                    path.style("fill", color4ascPercent($scope.bucketsTab[bucketId].dispo));
                //else
                    //console.error("no dispo for bucketId "+bucketId +" : "+$scope.bucketsTab[bucketId].name);
            }
        }
    }

    $scope.changeBase = function (){
        $scope.buckets = $scope.computeBucketsTree($scope.rawbuckets , $scope.base);
        $scope.dispoOtherNode($scope.base);
        $scope.refreshStatusDisplay();
    }

    $scope.reweightByUtilization = function (){
        var uri = inkscopeCtrlURL + "osds" ;

        $http({method: "PUT", url: uri, data : "action=reweight-by-utilisation", headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $dialogs.notify("Reweight by utilisation", data);
            }).
            error(function (data, status, headers) {
                $scope.status = status;
                $dialogs.error("Reweight by utilisation has failed", data);
            });
    }

    $scope.home = function(){
        $window.location.href = "index.html";
    }

});


osdMapApp.directive('myTopology', function () {

    return {
        restrict: 'EA',
        terminal: true,
        link: function (scope, element, attrs) {


            function description(d) {
                var html = "";
                html += "<h2>" + d.name;
                if (d.id >=0) {//OSD state
                    var osdstate = (scope.osds[d.id].stat.in == true) ? "in / " : "out / ";
                    osdstate += (scope.osds[d.id].stat.up == true) ? "up" : "down";
                    html +=  "<br/>"+osdstate ;

                }
                html += "</h2>"

                html += "id : " + d.id + "<br />"
                html += "weight : " + d.weight + "<br />"
                if (typeof d.hash !== "undefined") {
                    html += "hash : " + d.hash + "<br />"
                }
                if (typeof d.alg !== "undefined") {
                    html += "alg : " + d.alg + "<br />"
                }
                if (typeof d.type_name !== "undefined") {
                    html += "type : " + d.type_name + "<br />"
                }
                if (typeof d.pos !== "undefined") {
                    html += "pos : " + d.pos + "<br />"
                }
                if (d.id >=0){
                    // OSD specific fields
                    html += "free space : " + funcBytes(scope.osds[d.id].free) + "<br />";
                    html += "total space : " + funcBytes(scope.osds[d.id].total) + "<br />";
                    html += "free : " +(scope.osds[d.id].free*100/scope.osds[d.id].total).toFixed(1) + "% <br />";
                }else
                {
                    if (scope.dispoMode == "up/down") html += "OSD up : " + scope.bucketsTab[d.id].value + " of " + scope.bucketsTab[d.id].total + "<br />";
                    if (scope.dispoMode == "in/out") html += "OSD out : " + ((scope.bucketsTab[d.id].total-scope.bucketsTab[d.id].value)/0.8).toFixed(0) + " of " + scope.bucketsTab[d.id].total + "<br />";
                    if (scope.dispoMode == "free space (%)") {
                        html += "free space : " + funcBytes(scope.bucketsTab[d.id].value) + "<br />";
                        html += "total space : " + funcBytes(scope.bucketsTab[d.id].total) + "<br />";
                        html += "free : " +(scope.bucketsTab[d.id].dispo*100).toFixed(1) + "% <br />";
                    }
                }
                return html;
            }

            var w = window, d = document, e = d.documentElement, g = d.getElementsByTagName('body')[0];
            scope.screenSize = {"x": w.innerWidth || e.clientWidth || g.clientWidth, "y": w.innerHeight || e.clientHeight || g.clientHeight};

            var width = scope.screenSize.x - 40,
                height = scope.screenSize.y - 200,
                radius = Math.min(width, height) / 2 - 10;

            var x = d3.scale.linear()
                .range([0, 2 * Math.PI]);


            var color = d3.scale.category20c();

            var svg = d3.select(element[0])
                .append("svg")
                .attr("id","svgGraph")
                .attr("width", width)
                .attr("height", height);

            var sunburst= svg.append("g")
                .attr("id","sunburst")
                .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

            var divTooltip = d3.select("body").select("#tooltip");

            // add legend

            var legendDataInOut =[
                {"value":1,"text":"in"},
                {"value":0.2,"text":"out"}
            ];
            var legendDataUpDown =[
                {"value":1,"text":"up"},
                {"value":0,"text":"down"}
            ];
            var legendDataFreeSpace =[
                {"value":1,"text":"100 %"},
                {"value":0.9,"text":"90 %"},
                {"value":0.8,"text":"80 %"},
                {"value":0.7,"text":"70 %"},
                {"value":0.6,"text":"60 %"},
                {"value":0.5,"text":"50 %"},
                {"value":0.4,"text":"40 %"},
                {"value":0.3,"text":"30 %"},
                {"value":0.2,"text":"20 %"},
                {"value":0.1,"text":"10 %"},
                {"value":0,"text":"0 %"}
            ];

            var divlegend = d3.select("#legend");
            makeLegend();

            function makeLegend(){
                if (scope.dispoMode == "up/down") var legendData = legendDataUpDown;
                if (scope.dispoMode == "in/out") var legendData = legendDataInOut;
                if (scope.dispoMode == "free space (%)") var legendData = legendDataFreeSpace;

                divlegend.selectAll('*').remove();
                var legend = divlegend.append("svg").attr("height",20*legendData.length).append("g");
                legend.selectAll('rect')
                    .data(legendData)
                    .enter()
                    .append("rect")
                    .attr("x", 0)
                    .attr("y", function(d, i){ return i *  20 +10;})
                    .attr("width", 10)
                    .attr("height", 10)
                    .style("fill", function(d) {
                        var color = color4ascPercent(d.value);
                        return color;
                    })

                legend.selectAll('text')
                    .data(legendData)
                    .enter()
                    .append("text")
                    .attr("x", 13)
                    .attr("y", function(d, i){ return i *  20 + 19;})
                    .text(function(d) {
                        return d.text;
                    });
            }

            function makeGraph(topology) {
                // clear the elements inside the directive
                sunburst.selectAll('*').remove();

                var width = scope.screenSize.x - 40,
                    height = scope.screenSize.y - 200,
                    radius = Math.min(width, height) / 2 - 10;

                var y = d3.scale.linear()
                    .range([0, radius]);

                sunburst.attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

                var partition = d3.layout.partition()
                    .value(function (d) {
                        return d.weight;
                    });

                var arc = d3.svg.arc()
                    .startAngle(function (d) {
                        return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
                    })
                    .endAngle(function (d) {
                        return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
                    })
                    .innerRadius(function (d) {
                        return Math.max(0, y(d.y));
                    })
                    .outerRadius(function (d) {
                        return Math.max(0, y(d.y + d.dy));
                    });

                var g = sunburst.selectAll("g")
                    .data(partition.nodes(topology))
                    .enter().append("g")
                    .on("click",click )
                    .on("mousemove",function(){
                        divTooltip
                            .style("left", (d3.event.pageX + 10) + "px")
                            .style("top", (d3.event.pageY-150) + "px")/**/;
                    })
                    .on("mouseover", function (d) {
                        divTooltip.transition()
                            .duration(500)
                            .style("opacity", .9);
                        divTooltip.html(description(d));
                    })
                    .on("mouseout", function (d) {
                        divTooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });

                var path = g.append("path")
                    .attr("d", arc)
                    .attr('id', function (d) {
                        return "osd" + d.id;
                    })
                    .style("fill", function (d) {
                        if ((typeof scope.osds !== "undefined")&&(typeof scope.osds[d.id] !== "undefined")&&(d.id>=0))
                            return color4ascPercent(scope.dispo(scope.osds[d.id]));
                        return color4ascPercent(d["dispo"]);
                    })
                    .style("stroke", "#fff")
                    .style("stroke-width", "1");

                var text = g.append("text")
                    .attr("transform", function (d) {
                        return "rotate(" + computeTextRotation(d) + ")";
                    })
                    .attr("x", function (d) {
                        return y(d.y);
                    })
                    .attr("dx", "6") // margin
                    .attr("dy", ".35em") // vertical-align
                    .style("fill", "#fff")
                    .text(function (d) {
                        return d.name;
                    });

                function click(d) {
                    // fade out all text elements
                    text.transition().attr("opacity", 0);

                    path.transition()
                        .duration(750)
                        .attrTween("d", arcTween(d))
                        .each("end", function (e, i) {
                            // check if the animated element's data e lies within the visible angle span given in d
                            if (e.x >= d.x && e.x < (d.x + d.dx)) {
                                // get a selection of the associated text element
                                var arcText = d3.select(this.parentNode).select("text");
                                // fade in the text element and recalculate positions
                                arcText.transition().duration(750)
                                    .attr("opacity", 1)
                                    .attr("transform", function () {
                                        return "rotate(" + computeTextRotation(e) + ")"
                                    })
                                    .attr("x", function (d) {
                                        return y(d.y);
                                    });
                            }
                        });
                }


                d3.select(self.frameElement).style("height", height + "px");

                // Interpolate the scales!
                function arcTween(d) {
                    var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
                        yd = d3.interpolate(y.domain(), [d.y, 1]),
                        yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
                    return function (d, i) {
                        return i
                            ? function (t) {
                            return arc(d);
                        }
                            : function (t) {
                            x.domain(xd(t));
                            y.domain(yd(t)).range(yr(t));
                            return arc(d);
                        };
                    };
                }

                function computeTextRotation(d) {
                    return (x(d.x + d.dx / 2) - Math.PI / 2) / Math.PI * 180;
                }
             }

            scope.$watch('base', function (base, oldBase) {
                // if 'base' is undefined, exit
                if (typeof base !== 'undefined') {
                    makeGraph(scope.buckets);
                    //makeGraph(topology);
                }
            }, true);

            scope.$watch('screenSize', function (screenSize, oldscreenSize) {
                // if 'topology' is undefined, exit
                if (typeof screenSize !== 'undefined') {
                    makeGraph(scope.buckets);
                }
            }, true);

            scope.$watch('dispoMode', function (dispoMode, olddispoMode) {
                makeLegend();
                scope.refreshStatusDisplay();
            }, true);
        }
    }
})

/*javascript external to angular applies to a scope*/

function resizeGraphDiv() {
    var w = window, d = document, e = d.documentElement, g = d.getElementsByTagName('body')[0];
    x = w.innerWidth || e.clientWidth || g.clientWidth;
    y = w.innerHeight || e.clientHeight || g.clientHeight;

    d3.select("body").select("#put_the_graph_there")
        .attr("width", x - 40 +"px")
        .attr("height",y - 200 +"px");

    d3.select("body").select("#svgGraph")
        .attr("width", x - 40)
        .attr("height",y - 200);

    var domElt = document.getElementById('put_the_graph_there');
    var scope = angular.element(domElt).scope();
    scope.$apply(function() {
        scope.screenSize.x = x;
        scope.screenSize.y = y;
    });

    //console.log("resizeGraphViz called: x="+(x-40)+", y="+(y-200));
}

//calling tellAngular on resize event
window.onresize = resizeGraphDiv;
