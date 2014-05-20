
var colorsGnYlRd = ["#038a00","#05a001","#0ac800","#0ad600","#50d600","#92d600","#d6d600","#e6b000","#ff8c00","#d62800","#C00000"];
/*---------------------0---------10---------20--------30--------40-------50---------60-------70--------80--------90-------100-------*/
function color4ascPercent(percent) {
    if (percent<0) return "#cccccc";
    var index = parseInt(10-(percent*10));
    if (index == 10) return colorsGnYlRd[10];
    var delta = (10-(percent*10))-index;
    var cdown = colorsGnYlRd[index];
    var cup = colorsGnYlRd[index+1];
    var Rdown= parseInt(cdown.substr(1,2),16);
    var Rup  = parseInt(cup.substr(1,2),16);
    var Gdown= parseInt(cdown.substr(3,2),16);
    var Gup  = parseInt(cup.substr(3,2),16);
    var Bdown= parseInt(cdown.substr(5,2),16);
    var Bup  = parseInt(cup.substr(5,2),16);
    var R = parseInt(Rdown + delta*(Rup-Rdown));
    var G = parseInt(Gdown + delta*(Gup-Gdown));
    var B = parseInt(Bdown + delta*(Bup-Bdown));
    var C =  "#"+ R.toString(16)+ G.toString(16)+ B.toString(16);
    C="rgb("+R+","+G+","+B+")";
    //console.log("C="+C);
    return C;
}

function color4descPercent(percent) {
    if (percent<0) return "#cccccc";
    var index = parseInt(percent*10);
    if (index == 10) return colorsGnYlRd[10];
    var delta = (percent*10) - index;
    var cdown = colorsGnYlRd[index];
    var cup = colorsGnYlRd[index+1];
    var Rdown= parseInt(cdown.substr(1,2),16);
    var Rup  = parseInt(cup.substr(1,2),16);
    var Gdown= parseInt(cdown.substr(3,2),16);
    var Gup  = parseInt(cup.substr(3,2),16);
    var Bdown= parseInt(cdown.substr(5,2),16);
    var Bup  = parseInt(cup.substr(5,2),16);
    var R = parseInt(Rdown + delta*(Rup-Rdown));
    var G = parseInt(Gdown + delta*(Gup-Gdown));
    var B = parseInt(Bdown + delta*(Bup-Bdown));
    var C =  "#"+ R.toString(16)+ G.toString(16)+ B.toString(16);
    C="rgb("+R+","+G+","+B+")";
    //console.log("C="+C);
    return C;
    //return colorsGnYlRd[parseInt(percent*10)];
}


function color4states(states){
    if (states.indexOf("unactive")>=0) return "red";
    if (states.indexOf("backfill_toofull")>=0) return "red";
    if (states.indexOf("degraded")>=0) return "darkorange";
    if (states.indexOf("unclean")>=0) return "darkorange";
    if (states.indexOf("stale")>=0) return "yellow";
    if (states.indexOf("remapped")>=0) return "darkgreen";
    if (states.indexOf("scrubbing")>=0) return "blue";
    if (states.indexOf("clean")>=0) return "limegreen";
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