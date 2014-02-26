
var colorsGnYlRd = ["#038a00","#05a001","#0ac800","#0ad600","#50d600","#92d600","#d6d600","#e6b000","#ff8c00","#d62800","#C00000"];
/*---------------------0---------10---------20--------30--------40-------50---------60-------70--------80--------90-------100-------*/
function color4ascPercent(percent) {
    if (percent<0) return "#cccccc";
    return colorsGnYlRd[parseInt(10-(percent*10))];
}

function color4descPercent(percent) {
    //return (colorbrewer.RdYlGn[11])[10 - parseInt(percent*10)];
    //return (colorbrewer.GnYlRd[9])[parseInt(percent*8)];
    return colorsGnYlRd[parseInt(percent*10)];
}


function color4states(states){
    if (states.indexOf("stale")>=0) return "yellow";
    if (states.indexOf("clean")>=0) return "limegreen";
    if (states.indexOf("degraded")>=0) return "blue";
    if (states.indexOf("unclean")>=0) return "darkorange";
    if (states.indexOf("unactive")>=0) return "red";
    if (states.indexOf("remapped")>=0) return "darkgreen";
    return "black";
}

function color4statesTab(statesTab){
    var colors = [];
    for (var i = 0; i< statesTab.length;i++){
        states = statesTab[i];
        colors.push(color4states(states));
    }
    return colors;
}