/**
 * Created by Alain Dechorgnat on 1/14/14.
 */
var inkscopeCtrlURL = '/inkscopeCtrl/';
var cephRestApiURL = '/ceph-rest-api/';


function funcBytes (bytes, precision) {
    if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
    if (typeof precision === 'undefined') precision = 1;
    var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];
    var number = 0;
    if (bytes>0) number = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
}

function funcBytesFilter () {
    return funcBytes;
}

function funcDurationFilter(){
    return function (duration){
        var sign= (duration >=0 ? "":"- ");
        duration = Math.abs(Math.floor(duration));
        var minutes = Math.floor(duration / 60);
        var str =duration-(60*minutes)+"s"
        if (minutes == 0) return sign+str;
        var hours = Math.floor(minutes/ 60);
        var str =minutes-(60*hours)+"m "+str;
        if (hours==0) return sign+str;
        var days = Math.floor(hours/ 24);
        var str =hours-(24*days)+"h "+str;
        if (days==0) return sign+str;
        return sign+days+"d "+str;
    }
}