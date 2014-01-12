'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('MyCtrl', ['$scope', '$location', 'DropBoxService', 'LogService', function ($scope, $location, DropBoxService, LogService) {

        $scope.goto = function (value) {
            $location.path(value);
            // window.alert($scope.actualWidth + ',' + $scope.actualHeight + ',' + $scope.screenWidth + ',' + $scope.screenHeight);
        };

        $scope.authDropbox = function () {
            DropBoxService.authenticate(function (err, client) {
                if (err) {
                    LogService.log('err: ' + err);
                    DropBoxService.reset();
                } else {
                    LogService.log('auth ok');
                    $scope.readNotes();
                    LogService.log('requested read notes');
                }
            });
        };

        $scope.readNotes = function () {
            // $scope.notes = DropBoxService.readNotes();
            DropBoxService.readNotes().then(function (notes) {
                $scope.notes = notes;
                LogService.log('read notes done');
            }, function (err) {
                LogService.log('read notes promise get error: ' + err);
                $scope.authDropbox();
            });
        };

        $scope.authDropbox();
    }])
    .controller('MyCtrl1', [function () {

    }]);