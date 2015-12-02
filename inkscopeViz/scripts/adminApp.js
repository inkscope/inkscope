/**
 * Created by arid6405 on 2015/12/02.
 */

angular.module('adminApp', ['ngRoute','ngTable','D3Directives','ui.bootstrap','dialogs','InkscopeCommons'])
    .filter('bytes', funcBytesFilter);
