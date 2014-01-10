'use strict';


// Declare app level module which depends on filters, and services
var myApp = angular.module('myApp', [
        'ngRoute',
        'ngTouch',
        'myApp.filters',
        'myApp.services',
        'myApp.directives',
        'myApp.controllers'
    ]).
    config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/view1', {templateUrl: 'partials/partial1.html', controller: 'MyCtrl1'});
        $routeProvider.when('/view2', {templateUrl: 'partials/partial2.html', controller: 'MyCtrl1'});

        $routeProvider.otherwise({redirectTo: '/view1'});
    }]);

myApp.isPhone = document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1;