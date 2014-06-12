/**
 * Created by arid6405 on 12/1/13.
 */
var showCrushMapApp = angular.module('showCrushMapApp', ['components']);


showCrushMapApp.controller('CrushMapCtrl', function CrushMapCtrl($rootScope, $scope, $http, $templateCache) {

    var w = window, d = document, e = d.documentElement, g = d.getElementsByTagName('body')[0];
    $scope.screenSize ={"x" : w.innerWidth || e.clientWidth || g.clientWidth , "y" : w.innerHeight || e.clientHeight || g.clientHeight};

    var svg = d3.select("body").select("#put_the_graph_there")
        .attr("width", $scope.screenSize.x -40)
        .attr("height", $scope.screenSize.y -200);

    var apiURL = '/ceph-rest-api/';
    $http({method: "get", url: apiURL + "osd/crush/dump.json", cache: $templateCache}).
        success(function (data, status) {
            $rootScope.raw = JSON.stringify(data.output,null,"   ");
            $rootScope.status = status;
            $rootScope.rules = data.output.rules;
            $rootScope.types = data.output.types;
            $rootScope.devices = data.output.devices;
            $rootScope.tunables = data.output.tunables;
            $rootScope.rawbuckets = data.output.buckets;

            $scope.findRoots(data.output.buckets);

            $scope.base = $scope.rootTab[0].id;
            $rootScope.buckets = $scope.computeBucketsTree(data.output.buckets , $scope.base);
        }).
        error(function (data, status) {
            $rootScope.status = status;
        });

    $scope.getType = function (id) {
        for (var i = 0; i < $rootScope.types.length; i++) {
            if ($rootScope.types[i].type_id == id) return $rootScope.types[i].name;
        }
        return "N/A";
    }

    $scope.showStep = function (step) {
        return prettyPrint(step);
    }


    $scope.findRoots = function (rawbuckets) {
        var bucketsTab = [];
        var osdTab = [];

        for (var i = 0; i < rawbuckets.length; i++) {
            rawbuckets[i].childrenName =[];
            bucketsTab[rawbuckets[i].id] = rawbuckets[i];
            bucketsTab[rawbuckets[i].id].hasParent = false;

        }
        for (var i = 0; i < $rootScope.devices.length; i++) {
            osdTab[$rootScope.devices[i].id] = $rootScope.devices[i].name;
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

    $scope.computeBucketsTree = function (rawbuckets , base) {
        var bucketsTab = [];
        var osdTab = [];

        for (var i = 0; i < rawbuckets.length; i++) {
            bucketsTab[rawbuckets[i].id] = rawbuckets[i];
        }
        for (var i = 0; i < $rootScope.devices.length; i++) {
            osdTab[$rootScope.devices[i].id] = $rootScope.devices[i].name;
        }
        function addChildren(bucket) {
            bucket.dispo = -1.0;
            bucket.children = [];
            for (var j = 0; j < bucket.items.length; j++) {
                var item = bucket.items[j];
                if (item.id < 0) {
                    bucket.children.push(bucketsTab[item.id]);
                    addChildren(bucketsTab[item.id]);
                }
                else {
                    var osd = item;
                    osd.name = osdTab[item.id];
                    osd.dispo = -1.0;
                    bucket.children.push(osd);
                }
            }
        }

        var buckets = bucketsTab[base];
        addChildren(buckets);


        return buckets;
    }

});


showCrushMapApp.directive('myTopology', function () {

    return {
        restrict: 'E',
        terminal: true,
        scope: {
            values: '='
        },
        link: function (scope, element, attrs) {


            function description(d){
                var html="";
                html+="<h2>"+ d.name+"</h2>"
                html+="id : "+ d.id+"<br />"
                html+="weight : "+ d.weight+"<br />"
                if(typeof d.hash !== "undefined"){html+="hash : "+ d.hash+"<br />"}
                if(typeof d.alg !== "undefined"){html+="alg : "+ d.alg+"<br />"}
                if(typeof d.type_name !== "undefined"){html+="type : "+ d.type_name+"<br />"}
                if(typeof d.pos !== "undefined"){html+="pos : "+ d.pos+"<br />"}
                return html;
            }

            var w = window, d = document, e = d.documentElement, g = d.getElementsByTagName('body')[0];
            scope.screenSize ={"x" : w.innerWidth || e.clientWidth || g.clientWidth , "y" : w.innerHeight || e.clientHeight || g.clientHeight};

            var width  = scope.screenSize.x -40,
                height = scope.screenSize.y -200,
                radius = Math.min(width, height) / 2 - 10;

            var x = d3.scale.linear()
                .range([0, 2 * Math.PI]);

            var y = d3.scale.linear()
                .range([0, radius]);

            var color = d3.scale.category20c();

            var svg = d3.select(element[0])
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

            var divTooltip =  d3.select("body").select("#tooltip");

            scope.$watch('values', function (root, oldRoot) {

                // clear the elements inside of the directive
                svg.selectAll('*').remove();
                // if 'percentUsed' is undefined, exit
                if (!root) {
                    return;
                }

                var partition = d3.layout.partition()
                    .value(function(d) { return d.weight; });

                var arc = d3.svg.arc()
                    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
                    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
                    .innerRadius(function(d) { return Math.max(0, y(d.y)); })
                    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

                var g = svg.selectAll("g")
                    .data(partition.nodes(root))
                    .enter().append("g")
                    .on("click", click)
                    .on("mouseover", function (d) {
                        divTooltip.transition()
                            .duration(1000)
                            .style("opacity", .9);
                        divTooltip.html(description(d))
                            .style("left", (d3.event.pageX) + "px")
                            .style("top", (d3.event.pageY - 28) + "px")/**/;
                    })
                    .on("mouseout", function (d) {
                        divTooltip.transition()
                            .duration(1000)
                            .style("opacity", 0);
                    });

                var path = g.append("path")
                    .attr("d", arc)
                    .attr("id",function(d){return "path"+ d.name;})
                    //.style("fill", function(d) { return color((d.children ? d : d.parent).name); })
                    .style("fill", function (d) {
                        return color4ascPercent(d.dispo);
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
                    .style("fill", "#000")
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

            });


        }
    }
})