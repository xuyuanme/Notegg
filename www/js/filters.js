'use strict';

/* Filters */

angular.module('myApp.filters', []).
    filter('interpolate', ['version', function (version) {
        return function (text) {
            return String(text).replace(/\%VERSION\%/mg, version);
        }
    }])
    .filter('firstline', function () {
        return function (text) {
            var firstline = text.split('\n')[0];
            if (firstline.length > 7) {
                return firstline.substring(0, 7) + "...";
            } else {
                return firstline;
            }
        }
    });
