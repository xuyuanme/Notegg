'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('MyCtrl', ['$scope', '$location', 'DropBoxService', '$scope', function ($scope, $location, DropBoxService) {

        $scope.showSigninButton = false;
        $scope.showWaitingBar = true;

        $scope.goto = function (value) {
            $location.path(value);
            // window.alert($scope.actualWidth + ',' + $scope.actualHeight + ',' + $scope.screenWidth + ',' + $scope.screenHeight);
        };

        $scope.authDropbox = function (interactive) {
            if (interactive === null || interactive === undefined) {
                interactive = true;
            }
            DropBoxService.authenticate({interactive: interactive}, function (err, client) {
                $scope.log('auth with interactive: ' + interactive);
                if (err) {
                    $scope.log('auth err: ' + err);
                    $scope.resetDropboxClient();
                } else {
                    if (client.isAuthenticated()) {
                        $scope.log('auth ok');
                        $scope.showSigninButton = false;
                        $scope.readNotes();
                        $scope.log('requested read notes');
                    } else {
                        $scope.log('client not authenticated');
                        $scope.resetDropboxClient();
                    }
                }
            });
        };

        $scope.readNotes = function () {
            $scope.showWaitingBar = true;
            // $scope.notes = DropBoxService.readNotes();
            DropBoxService.readNotes().then(function (notes) {
                $scope.notes = notes;
                $scope.showWaitingBar = false;
                $scope.log('read notes done');
            }, function (err) {
                $scope.log('read notes promise get error: ' + err);
                $scope.resetDropboxClient();
            });
        };

        $scope.resetDropboxClient = function () {
            $scope.log('reset dropbox client');
            DropBoxService.reset();
            $scope.showSigninButton = true;
            $scope.showWaitingBar = false;
        };

        $scope.log = function (log) {
            console.log(log);
            $scope.logs = log;
        };

        $scope.authDropbox(false);
    }])

    .controller('MyCtrl1', [function () {

    }]);