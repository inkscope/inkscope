/**
 * Created by Alain Dechorgnat on 1/3/14.
 */

var PoolPgOsdApp = angular.module('PoolPgOsdApp', []);

PoolPgOsdApp.controller("poolPgOsdCtrl", function ($scope, $http, $templateCache) {
    var apiURL = '/ceph-rest-api/';

    //refresh data every x seconds
    refreshData();
    //setInterval(function () {
    //  refreshData()
    //}, 30*1000);

    function refreshData() {

        $http({method: "get", url: apiURL + "pg/stat.json"})
            .success(function (data, status) {
                var nodeUid = 0;
                // fetching pg list and relation with osd
                var pg_stats = data.output.pg_stats;

                $http({method: "get", url: apiURL + "osd/dump.json"})
                    .success(function (data, status) {
                        var network = {};
                        network.nodes = [];
                        network.links = [];

                        var network2 = {};
                        network2.nodes = [];
                        network2.links = [];

                        //fetching pool list and osd status
                        var pools = data.output.pools;
                        var poolTab = [];
                        for (var i = 0; i < pools.length; i++) {
                            var pool = pools[i];
                            poolTab[pool.pool] = {};
                            poolTab[pool.pool].name = pool.pool_name;
                            poolTab[pool.pool].index = nodeUid;
                            network.nodes[nodeUid] = {};
                            network.nodes[nodeUid].name = pool.pool_name;
                            network.nodes[nodeUid].type = "pool";
                            network2.nodes[nodeUid] = {};
                            network2.nodes[nodeUid].name = pool.pool_name;
                            network2.nodes[nodeUid].type = "pool";
                            nodeUid++;
                        }
                        var osds = data.output.osds;
                        var osdTab = [];
                        for (var i = 0; i < osds.length; i++) {
                            var osd = osds[i];
                            osdTab[osd.osd] = {};
                            osdTab[osd.osd].osd = osd;
                            osdTab[osd.osd].index = nodeUid;
                            network.nodes[nodeUid] = {};
                            network.nodes[nodeUid].name = "osd." + osd.osd;
                            network.nodes[nodeUid].states = osd.state;
                            network.nodes[nodeUid].type = "osd";
                            network2.nodes[nodeUid] = {};
                            network2.nodes[nodeUid].name = "osd." + osd.osd;
                            network2.nodes[nodeUid].states = osd.state;
                            network2.nodes[nodeUid].type = "osd";
                            nodeUid++;
                        }

                        for (var i = 0; i < pg_stats.length; i++) {
                            var pg = pg_stats[i];
                            var currentNodeUid = nodeUid;
                            nodeUid++;
                            network.nodes[currentNodeUid] = {};
                            network.nodes[currentNodeUid].name = "pg " + pg.pgid;
                            network.nodes[currentNodeUid].states = pg.state.split('+');
                            network.nodes[currentNodeUid].type = "pg";
                            var elem = pg.pgid.split('.');
                            var poolId = elem[0];

                            // link from pool to pg
                            var link = {};
                            link.source = poolTab[poolId].index;
                            link.target = currentNodeUid;
                            link.value = 1.0;
                            network.links.push(link);

                            // links from pg to acting osds
                            for (var j=0; j< pg.acting.length; j++){
                                var osd  = pg.acting[j];
                                var link = {};
                                link.source = currentNodeUid;
                                link.target = osdTab[osd].index;
                                link.value = 1.0;
                                network.links.push(link);
                                // direct link from pool to osd
                                var link = {};
                                link.source = poolTab[poolId].index;
                                link.target = osdTab[osd].index;
                                link.value = 1.0;
                                link.states = pg.state.split('+');
                                link.pg = pg.pgid;
                                network2.links.push(link);
                            }

                        }
                        //trace(network,"#chart1");
                        trace(network2,"#chart2");

                    });
            });
    };

    function trace(network , id) {
        var margin = {top: 1, right: 1, bottom: 6, left: 1},
            width = 1800 - margin.left - margin.right,
            height = 950 - margin.top - margin.bottom;

        var formatNumber = d3.format(",.0f"),
            format = function (d) {
                return formatNumber(d) + " pgs";
            },
            color = d3.scale.category20();

        var svg = d3.select(id).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var sankey = d3.sankey()
            .nodeWidth(15)
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
            .attr("d", path)
            .style("stroke-width", function (d) {
                return Math.max(1, d.dy);
            })
            .style("stroke", function (d) { return color4states(d.states);})
            .sort(function (a, b) {
                return b.dy - a.dy;
            });

        link.append("title")
            .text(function (d) {
                return d.source.name + " → " + d.target.name + "\npg " + d.pg + "\n" + d.states;
            });

        var node = svg.append("g").selectAll(".node")
            .data(network.nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .call(d3.behavior.drag()
                .origin(function (d) {
                    return d;
                })
                .on("dragstart", function () {
                    this.parentNode.appendChild(this);
                })
                .on("drag", dragmove));

        node.append("rect")
            .attr("height", function (d) {
                if (d.dy<5)return 5;
                return d.dy;
            })
            .attr("width", sankey.nodeWidth())
            .style("fill", function (d) {
                if (!d.states) return  d.color = color(d.name.replace(/ .*/, ""));
                if (d.states.indexOf("up")<0) return "red";
                else return "green";
                ;
            })
            .style("stroke", function (d) {
                return d3.rgb(d.color).darker(2);
            })
            .append("title")
            .text(function (d) {
                if (d.type == "osd")
                return d.name + "\n" + format(d.value);
                else
                return d.name + "\n" + d.value +" osds";
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
                    return d.name + "\n" + format(d.value);
                else
                    return d.name + "\n" + d.value +" osds";
            })
            .filter(function (d) {
                return d.x < width / 2;
            })
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start");

        function dragmove(d) {
            d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
            sankey.relayout();
            link.attr("d", path);
        }


    }


});

