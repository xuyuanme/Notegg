'use strict';


// Declare app level module which depends on filters, and services
var myApp = angular.module('myApp', [
        'ngRoute',
        'ngTouch',
        'ionic',
        'myApp.filters',
        'myApp.services',
        'myApp.directives',
        'myApp.controllers'
    ]).
    config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
        if (document.URL.indexOf('https://') !== -1 || document.URL.indexOf('http://') !== -1) {
            // if not phonegap, use html5mode
            $locationProvider.html5Mode(true);
        }
        $routeProvider.when('/view1', {templateUrl: 'partials/partial1.html', controller: 'MyCtrl1'});
        $routeProvider.when('/view2', {templateUrl: 'partials/partial2.html', controller: 'MyCtrl1'});
        $routeProvider.when('/uitest', {templateUrl: 'partials/uitest.html', controller: 'MyCtrl1'});
        $routeProvider.when('/', {templateUrl: 'partials/notes.html', controller:'NoteCtrl'});
        $routeProvider.when('/noteEdit', {templateUrl: 'partials/noteEdit.html', controller:'EditNoteCtrl'});

        $routeProvider.otherwise({redirectTo: '/'});
    }]);

myApp.isPhone = document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1;