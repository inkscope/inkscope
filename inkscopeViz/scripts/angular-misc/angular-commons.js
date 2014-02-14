/**
 * Created by Alain Dechorgnat on 1/14/14.
 */
var inkscopeCtrlURL = '/inkscopeCtrl/';
var cephRestApiURL = '/ceph-rest-api/';


function funcBytesFilter () {
    return function (bytes, precision) {
        if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
        if (typeof precision === 'undefined') precision = 1;
        var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];
        var number = 0;
        if (bytes>0) number = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
    }
}