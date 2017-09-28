/**
 * Created by arid6405 on 29/04/2014.
 */

angular.module('bucketApp', ['ngRoute','ui.bootstrap','InkscopeCommons'])
    .config(function ($routeProvider) {
        $routeProvider.
            when('/', {controller: ListCtrl, templateUrl: 'partials/buckets/aboutBuckets.html'}). //Show the buckets
            when('/new', {controller: CreateCtrl, templateUrl: 'partials/buckets/createBucket.html'}). //Create a bucket
            when('/detail/:bucketName', {controller: DetailCtrl, templateUrl: 'partials/buckets/detailBucket.html'}). //Show bucket details
	    when('/detail/:bucketName/acl', {controller: DetailCtrl, templateUrl:'partials/buckets/detailBucketACL.html'}). //Show ACL
	    when('/modifyaccess/:bucketName/:user', {controller: ManageACLCtrl, templateUrl: 'partials/buckets/modifyBucketACL.html'}). //Modify access to a bucket
	    when('/revokeaccess/:bucketName/:user', {controller: ManageACLCtrl, templateUrl: 'partials/buckets/revokeBucketACL.html'}). //Revoke access to a bucket
	    when('/deleteACL/:bucketName', {controller: ManageACLCtrl, templateUrl:'partials/buckets/deleteACL.html'}). //Delete ACL
	    when('/changeOwner/:bucketName/:actualOwner', {controller: ChangeOwnerCtrl, templateUrl: 'partials/buckets/changeOwner.html'}). //Change owner
            when('/delete/:bucketName', {controller: DeleteCtrl, templateUrl: 'partials/buckets/deleteBucket.html'}). //Delete a bucket
            otherwise({redirectTo: '/'})
    })
    .filter('bytes', funcBytesFilter)
    .filter('prettifyArray', funcPrettifyArrayFilter);


function refreshBuckets($http, $scope) {
    $http({method: "get", url: inkscopeCtrlURL + "S3/bucket", data:"stats=False"}).
        success(function (data, status) {
            $scope.status = status;
            $scope.date = new Date();
            $scope.buckets =  data;
            $scope.tableParams.reload();
        }).
        error(function (data, status, headers) {
            //alert("refresh buckets failed with status "+status);
            $scope.status = "Can't list buckets : error http "+status;
            $scope.date = new Date();
            $scope.buckets =  data || "Request failed";
        });
}

function ListCtrl($rootScope,$scope, $http, $filter, ngTableParams, $location) {
    $scope.pagename = function() {
	return window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
    }; //gets the last part of url

    $rootScope.tableParams = new ngTableParams({
        page: 1,            // show first page
        count: 20,          // count per page
        sorting: {
            bucket: 'asc'     // initial sorting
        }
    }, {
        counts: [], // hide page counts control
        total: 1,  // value less than count hide pagination
        getData: function ($defer, params) {
            // use build-in angular filter
            $rootScope.orderedData = params.sorting() ?
                $filter('orderBy')($rootScope.buckets, params.orderBy()) :
                data;
            $defer.resolve($rootScope.orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });
    refreshBuckets($http,$rootScope);

    $scope.showDetail = function (bucket) {
        $location.path('/detail/'+bucket);
    }
}

function DetailCtrl($rootScope,$scope, $http, $routeParams, $route, $dialogs) {
    end_of_url = window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
    if (end_of_url == "acl") { //if detailing acl is needed
	uri_acl = inkscopeCtrlURL + "S3/bucket/"+$routeParams.bucketName+"/acl";
	$http({method: "GET", url: uri_acl }).
	    success(function (data, status) {
		$scope.acl = data;
	    }).
	    error(function (data, status, headers) {
		$rootScope.status = status;
		$rootScope.acl =  data || "Request failed";
		$dialogs.error("<h3>Can't display bucket acl ("+$routeParams.bucketName+")</h3><br>"+$scope.data);
	    });
    }

    var uri = inkscopeCtrlURL + "S3/bucket/"+$routeParams.bucketName ;
    $http({method: "get", url: uri }).
	success(function (data, status) {
	    $rootScope.status = status;
	    $rootScope.detailedBucket =  data;
	    if (typeof $rootScope.detailedBucket.mtime === "string") {
		stringToParse = $rootScope.detailedBucket.mtime.replace(/-/g,"/");
		var dateString    = stringToParse.match(/\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}/);
		var dt            = new Date(dateString);
		$rootScope.detailedBucket.mtime = dt.getTime()/1000;
	    }
	}).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $rootScope.buckets =  data || "Request failed";
            $dialogs.error("<h3>Can't display bucket named "+$routeParams.bucketName+"</h3><br>"+$scope.data);
        });

    // init
    uri = inkscopeCtrlURL + "S3/user";
    $http({method: "get", url: uri }).
	success(function (data, status) {
	    $rootScope.status = status;
	    $scope.users =  data;
	}).
	error(function (data, status, headers) {
	    $rootScope.status = status;
	    $dialogs.error("<h3>Can't find user list</h3><br>"+$scope.data);
	});
    $scope.code = "";
    $scope.response = "";
}

function DeleteCtrl($scope, $http, $routeParams, $location, $dialogs) {
    $scope.bucketName = $routeParams.bucketName;
    $scope.uri = inkscopeCtrlURL + "S3/bucket/" + $scope.bucketName  ;

    $scope.bucketDelete = function () {
        $scope.status = "en cours ...";

        $http({method: "delete", url: $scope.uri }).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                refreshBuckets($http, $scope);
                $location.url('/');
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Cant' delete bucket named <strong>"+$scope.bucketName+"</strong> !</h3> <br>"+$scope.data);
            });
    }
}

function ChangeOwnerCtrl($rootScope, $scope, $routeParams, $location, $http, $dialogs) {
    $scope.bucketName = $routeParams.bucketName;
    $scope.actualOwner = $routeParams.actualOwner;

    $scope.return = function () {
        $location.path("/detail/"+$scope.bucketName);
    }

    $scope.changeOwner = function () {
        $scope.code = "";
        $scope.response = "";
        $scope.uri = inkscopeCtrlURL + "S3/bucket/"+$scope.bucketName+"/link";
        data ="uid="+$scope.actualOwner

        $http({method: "DELETE", url: $scope.uri, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.link();
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Can't modify bucket <strong>"+$scope.bucketName+"</strong> !</h3> <br>"+$scope.data);
            });
    };

    $scope.link = function () {
        $scope.uri = inkscopeCtrlURL + "S3/bucket/"+$scope.bucketName+"/link";
        data ="uid="+$scope.new_owner.uid;

        $http({method: "PUT", url: $scope.uri, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
            success(function (data, status) {
                $scope.status = status;
                $scope.data = data;
                $dialogs.notify("Bucket modification","Bucket <strong>"+$scope.bucketName+"</strong> was modified");
                refreshBuckets($http, $scope);
                $scope.return();
            }).
            error(function (data, status) {
                $scope.data = data || "Request failed";
                $scope.status = status;
                $dialogs.error("<h3>Can't modify bucket <strong>"+$scope.bucketName+"</strong> !</h3> <br>"+$scope.data);
            });
    }

    // init
    uri = inkscopeCtrlURL + "S3/user";
    $http({method: "get", url: uri }).
        success(function (data, status) {
            $rootScope.status = status;
            $scope.users =  data;
        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $dialogs.error("<h3>Can't find user list</h3><br>"+$scope.data);
        });
    $scope.code = "";
    $scope.response = "";
}

function CreateCtrl($rootScope, $scope, $routeParams, $location, $http, $dialogs) {
    $scope.pagename = function() {
	return window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
    }; //gets the last part of url

    $scope.cancel = function(){
        $location.path("/");
    }

    $scope.create = function () {
        $scope.code = "";
        $scope.response = "";
        $scope.uri = inkscopeCtrlURL + "S3/bucket";
	if(angular.isUndefined($scope.bucket.acl)) {
	//private is the default value that needs to be empty : setting data manually
	    data ="bucket="+$scope.bucket.name+"&owner="+$scope.bucket.owner.uid+"&acl=private";
	} else {
	    data ="bucket="+$scope.bucket.name+"&owner="+$scope.bucket.owner.uid+"&acl="+$scope.bucket.acl;
	}
	$http({method: "PUT", url: $scope.uri, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
	    success(function (data, status) {
		refreshBuckets($http, $scope);
		$location.path("/");
	    }).
	    error(function (data, status) {
		$scope.data = data || "Request failed";
		$scope.status = status;
		$dialogs.error("<h3>Can't create bucket <strong>"+$scope.bucket.name+"</strong> !</h3> <br>"+$scope.data);
	    });
    };

    // init
    uri = inkscopeCtrlURL + "S3/user";
    $http({method: "get", url: uri }).
        success(function (data, status) {
            $rootScope.status = status;
            $scope.users =  data;
        }).
        error(function (data, status, headers) {
            $rootScope.status = status;
            $dialogs.error("<h3>Can't find user list</h3><br>"+$scope.data);
        });
    $scope.bucket = {};
    $scope.code = "";
    $scope.response = "";
}

function ManageACLCtrl($rootScope, $scope, $routeParams, $location, $window, $http, $dialogs){
    $scope.pagename = function() {
	var pathArray = window.location.hash.split('/');
	return pathArray[1];
    }; //gets the first part of url right after #/

    $scope.group_of_users = function() {
	result =  window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
	if (result == "AuthenticatedUsers"){
	    return "auth";
	} else {
	    return "users";
	}
    }; //gets the last part of url

    $scope.are_AllUsers = function() {
	result = window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
	if(result == "AllUsers"){
	    return true;
	} else {
	    return false;
	}
    };

    $scope.return = function(){
	$location.path("/detail/"+$scope.bucketName+"/acl");
    }

    $scope.bucketName = $routeParams.bucketName;
    $scope.user = $routeParams.user;

    $scope.modifyAccess= function(){
	$scope.code = "";
	$scope.response = "";
	$scope.uri = inkscopeCtrlURL + "S3/bucket/" + $scope.bucketName + "/" + $scope.user + "/acl";

	group = $scope.group_of_users();
	if(group == "users"){
	    if($scope.are_AllUsers()){
		data = "access=READ&email=all";
	    } else {
		data = "access="+$scope.bucket.newAccess+"&email="+$scope.emailUser;
	    }
	} else { //if (group == "auth"){
	    data = "access=READ&email=auth";
	}

	$http({method: "PUT", url: $scope.uri, data: data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
	    success(function(data, status){
		refreshBuckets($http, $scope);
//		$dialogs.notify("Access list modification","You have granted a new access to <strong>"+$scope.bucketName+"</strong>.");
		$window.location.reload();
	    }).
	    error(function(data, status){
		$scope.data = data || "Request failed"
		$scope.status = status;
		if (data == "error1") {
		    $dialogs.error("<h3>Can't modify access :<br>This access has already been set !</h3>");
		} else if (data == "error2") {
		    $dialogs.error("<h3>Can't modify access :<br>The other group of users already has access to this bucket. Please revoke its access first.</h3>");
		    $location.path("/detail/"+$scope.bucketName+"/acl");
		} else { //if "error3"
		    $dialogs.error("<h3>Can't modify access :<br>You have granted FULL_CONTROL to this user. Please revoke this first if you want to grant a restricted access.</h3>");
		    $location.path("/detail/"+$scope.bucketName+"/acl");
		}
	    });
    }

    $scope.revokeAccess = function(){
	$scope.code = "";
	$scope.response = "";
	$scope.uri = inkscopeCtrlURL+"S3/bucket/"+$scope.bucketName+"/"+$scope.user+"/noacl";

	$http({method: "PUT", url: $scope.uri, headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
	    success(function(data, status){
		refreshBuckets($http, $scope);
		$dialogs.notify("Access list modification","You have revoked access to <strong>"+$scope.bucketName+"</strong>.");
		$location.path("/detail/"+$scope.bucketName+"/acl");
	    }).
	    error(function(data, status){
		$scope.data = data || "Request failed"
		$scope.status = status;
		$dialogs.error("<h3>Can't revoke access !</h3><br>"+$scope.data);
	    });
    }

    // init
    user = $routeParams.user;
    if(angular.isDefined(user)){
	if((user != "AuthenticatedUsers")&&(user != "AllUsers")){
	    uri = inkscopeCtrlURL + "S3/user/" + $routeParams.user;
	    $http({method: "get", url: uri }).
		success(function (data, status) {
		    $rootScope.status = status;
		    $scope.emailUser =  data.email;
		}).
		error(function (data, status, headers) {
		    $rootScope.status = status;
		    $dialogs.error("<h3>Can't find user's email</h3><br>"+$scope.data);
		});
	}
    }

    uri = inkscopeCtrlURL + "S3/bucket/" + $scope.bucketName + "/" +$routeParams.user + "/acl";
    $http({method: "get", url: uri }).
	success(function (data, status) {
	    $rootScope.status = status;
	    $scope.userAccess =  data;
	}).
	error(function (data, status, headers) {
	    $rootScope.status = status;
	    $dialogs.error("<h3>Can't find user's acl</h3><br>"+$scope.data);
	});

    // $scope initializations
    $scope.bucket = {};
    $scope.code = "";
    $scope.response = "";
}
