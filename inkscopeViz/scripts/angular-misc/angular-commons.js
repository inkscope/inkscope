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

function getMenu(){
    var navList = angular.module('navList', []);

    navList.controller('navCtrl', ['$scope', '$location', function ($scope, $location) {
        $scope.navClass = function (page) {
            var currentRoute = $location.path().substring(1) || 'home';
            return page === currentRoute ? 'active' : '';
        };
    }]);
}


angular.module('InkscopeCommons', ['ngTable','dialogs','ui.bootstrap'])
    .controller('overallStatusCtrl', function ($rootScope, $scope,$http) {
        refreshData();
        setInterval(function () {
            refreshData()
        }, 10 * 1000)
        function refreshData(){
            $http({method: "get", url: cephRestApiURL + "status.json",timeout:4000})
            .success(function (data) {
                $rootScope.fsid = data.output.fsid;
                $scope.overallStatus = {};
                $scope.overallStatus.severity = data.output.health.overall_status;
                $scope.overallStatus.summary="";
                var i = 0;
                while(typeof data.output.health.summary[i] !== "undefined"){
                    if ($scope.overallStatus.summary!="") $scope.overallStatus.summary+=" | ";
                    $scope.overallStatus.summary += data.output.health.summary[i].summary;
                    i++;
                    }
                if ($scope.overallStatus.summary==""){
                    if (data.output.health.detail[0])
                    $scope.overallStatus.summary = data.output.health.detail[0];
                    else
                    //remove HEALTH_ in severity
                    $scope.overallStatus.summary = $scope.overallStatus.severity.substring(7);
                    }
                })
            .error(function (data) {
                $scope.overallStatus = {};
                $scope.overallStatus.severity = "HEALTH_WARN";
                $scope.overallStatus.summary = "Status not available";
                });
        }
});
