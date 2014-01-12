'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('MyCtrl', ['$scope', '$location', 'DropBoxService', function ($scope, $location, DropBoxService) {
        $scope.goto = function (value) {
            $location.path(value);
            // window.alert($scope.actualWidth + ',' + $scope.actualHeight + ',' + $scope.screenWidth + ',' + $scope.screenHeight);
        };

        $scope.authDropbox = function () {
            DropBoxService.authenticate(function (err, client) {
                if (err) {
                    console.log('err: ' + err);
                    DropBoxService.reset();
                } else {
                    console.log('auth ok');
                    $scope.readNotes();
                    console.log('requested read notes');
                }
            });
        };

        $scope.readNotes = function () {
            // $scope.notes = DropBoxService.readNotes();
            DropBoxService.readNotes().then(function (notes) {
                $scope.notes = notes;
                console.log('read notes done');
            }, function (error) {
                console.log('read notes promise get error: ' + error);
            });
        }
    }])
    .controller('MyCtrl1', [function () {

    }]);