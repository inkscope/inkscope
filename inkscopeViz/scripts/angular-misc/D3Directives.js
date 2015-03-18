/**
 * Created by Alain Dechorgnat on 12/20/13.
 */

angular.module('D3Directives', [])
    .directive('adGauge', function () {

        return {
            restrict: 'EA',
            terminal: true,
            scope: {
                value: '=',
                colormode: '=',
                width: "=",
                animated: "=",
                type: "="
            },
            link: function (scope, element, attrs) {
                //console.log("my gauge enter");
                var type = attrs.type;
                if (!type || ((type != "plain") && (type != "donut")))
                    type = "donut";

                var animated = (attrs.animated != "false");

                var width = attrs.width,
                    height = width / 2,
                    outerRadius = (width / 2) - 5 ,
                    innerRadius = outerRadius * 0.6,
                    fontSize = parseInt(width / 8);

                if (type == "plain") innerRadius = 0;


                var svg = d3.select(element[0])
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", "translate(" + width / 2 + "," + height + ")");


                //misc
                function percent_to_angle(percent) {
                    return (-(Math.PI / 2.0) + (Math.PI * percent));
                }

                var colorFunc;
                //console.log(attrs.colormode);
                if (attrs.colormode == 'asc') {
                    colorFunc = color4ascPercent;
                }
                else {
                    colorFunc = color4descPercent;
                }

                function arcTween(b) {
                    var i = d3.interpolate({value: b.previous}, b);
                    return function (t) {
                        return arc(i(t));
                    };
                }

                // clear the elements inside of the directive
                svg.selectAll('*').remove();

                var fields = [
                    {valid: true, value: 1, color: "#cccccc", name: "fond"},
                    {valid: true, value: 0, color: "#00FF00", name: "na"}
                ];

                fields[0].previous = fields[0].value = 1;

                var arc = d3.svg.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(outerRadius)
                    .startAngle(-Math.PI / 2)
                    .endAngle(function (d) {
                        return d.value * Math.PI - Math.PI / 2;
                    });


                scope.$watch('value', function (percentValue, oldPercentValue) {

                    //console.log("percentValue : " + percentValue);

                    if ("" + percentValue == "undefined") return;

                    fields[1].previous = fields[1].value;
                    fields[1].value = percentValue;

                    if ((percentValue >= 0.0) && (percentValue <= 1.0)) {
                        fields[1].valid = true;
                    }
                    else {
                        fields[1].valid = false;
                        fields[1].value = 0;
                    }

                    var path = svg.selectAll("path")
                        .data(fields)
                        .attr("fill", function (d) {
                            if (d.name == "fond")return d.color; else return colorFunc(d.value);
                        });
                    path.enter().append("svg:path");
                    var duration = 1500;
                    if (!animated){
                        duration = 0;
                    }
                    path.transition()
                            .ease("linear")
                            .duration(duration)
                            .attrTween("d", arcTween)
                            .style("fill", function (d) {
                                if (d.name == "fond")return d.color; else return colorFunc(d.value);
                            });

                    svg.selectAll("text").remove();
                    var gaugeText = svg.selectAll("text")
                        .data([fields[1]])
                        .enter()
                        .append("text")
                        .text(function (d) {
                            return (d.value * 100).toFixed(1) + " %";
                        })
                        .style("text-anchor", "middle")
                        .style("font-size", fontSize + "px")
                        .style("font-family", "arial");
                    if (animated){
                        gaugeText.transition()
                        .duration(1500)
                        .tween("text", function (d) {
                            var i = d3.interpolate(d.previous, d.value);
                            return function (t) {
                                if (d.valid) this.textContent = (i(t) * 100).toFixed(1) + " %";
                                else this.textContent = "invalid";
                            };
                        });
                    }

                });


            }
        }

    })
    .directive('adPie', function () {
        return {
            restrict: 'EA',
            terminal: true,
            scope: {
                value: '=',
                width: "=",
                labelfield: "=",
                valuefield: "=",
                id: "=",
                url:"="
            },
            link: function (scope, element, attrs) {
                console.log("enter directive  adPie : " + attrs.id);

                var width = parseInt(attrs.width),
                    height = width;

                var svg = d3.select("#" + attrs.id)
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height);

                scope.$watch('value', function (newValue, oldValue) {

                    // if 'newValue' is undefined, exit
                    if ("" + newValue == "undefined") return;

                    //var color = [ "limegreen", "darkorange", "red", "blue", "yellow", "pink", "chocolate", "yellowgreen"];
                    var statestab =[];
                    for (var i =0; i< newValue.length; i++){
                        statestab.push(newValue[i].state_name)
                    }
                    var color = color4statesTab(statestab);

                    nv.addGraph(function () {

                        var chart = nv.models.pieChart()
                                .x(function (d) {
                                    return d[attrs.labelfield]
                                })
                                .y(function (d) {
                                    return d[attrs.valuefield]
                                })
                                .color(color)
                                .width(width)
                                .height(height)
                                .showLabels(true)
                                .labelType("percent")
                                .tooltipContent(function (key, y, e, graph) {
                                    return '<h3>' + key + '</h3>' + '<p>' + e.point[attrs.valuefield] + '</p>'
                                });

                        d3.select("#" + attrs.id + " svg")
                            .datum(newValue)
                            .transition().duration(1200)
                            .call(chart);

                        nv.utils.windowResize(chart.update);


                        return chart;
                    });
                    // link to view pg with state
                    var path = d3.selectAll("#" + attrs.id + " path")
                        .on('click',function(d){document.location="poolspgsosds.html?bystate="+d.data.state_name;});
                });
            }

        }
    });
;

