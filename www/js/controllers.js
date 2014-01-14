'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('MyCtrl', ['$scope', '$location', 'DropBoxService', 'Loading', function ($scope, $location, DropBoxService, Loading) {

        $scope.goto = function (value) {
            $location.path(value);
            // window.alert($scope.actualWidth + ',' + $scope.actualHeight + ',' + $scope.screenWidth + ',' + $scope.screenHeight);
        };

        // Trigger the loading indicator
        $scope.show = function () {

            // Show the loading overlay and text
            $scope.loading = Loading.show({

                // The text to display in the loading indicator
                content: 'Loading',

                // The animation to use
                animation: 'fade-in',

                // Will a dark overlay or backdrop cover the entire view
                showBackdrop: true,

                // The maximum width of the loading indicator
                // Text will be wrapped if longer than maxWidth
                maxWidth: 200,

                // The delay in showing the indicator
                showDelay: 500
            });
        };

        // Hide the loading indicator
        $scope.hide = function () {
            $scope.loading.hide();
        };

        $scope.authDropbox = function (interactive) {
            $scope.showSigninButton = false;
            $scope.showWaitingBar = true;
            $scope.show();

            if (interactive === null || interactive === undefined) {
                interactive = true;
            }
            DropBoxService.authenticate({interactive: interactive}, function (err, client) {
                $scope.log('auth with interactive: ' + interactive);
                if (err) {
                    $scope.error('auth err: ' + err);
                    $scope.resetDropboxClient();
                } else {
                    if (client.isAuthenticated()) {
                        $scope.log('auth ok');
                        $scope.showSigninButton = false;
                        $scope.readNotes();
                        $scope.log('sent read notes request');
                    } else {
                        $scope.error('client not authenticated');
                        $scope.resetDropboxClient();
                    }
                }
            });
        };

        $scope.readNotes = function () {
            $scope.log('start read notes');
            // $scope.notes = DropBoxService.readNotes();
            DropBoxService.readNotes().then(function (notes) {
                $scope.notes = notes;
                $scope.showWaitingBar = false;
                $scope.hide();
                $scope.$broadcast('scroll.refreshComplete');
                $scope.log('read notes done');
            }, function (err) {
                $scope.error('read notes promise get error: ' + err);
                $scope.resetDropboxClient();
            });
        };

        $scope.writeNotes = function () {
            $scope.log('start write notes');
            DropBoxService.writeNotes($scope.notes).then(function () {
                $scope.log('write notes successful');
            }), function (err) {
                $scope.error('write notes error: ' + err);
                $scope.resetDropboxClient();
            }
        }

        $scope.resetDropboxClient = function () {
            $scope.log('reset dropbox client');
            DropBoxService.reset();
            $scope.showSigninButton = true;
            $scope.showWaitingBar = false;
            $scope.hide();
            $scope.$broadcast('scroll.refreshComplete');
        };

        $scope.log = function (log) {
            console.log(log);
            $scope.logs = log;
        };

        $scope.error = function (log) {
            console.log(log);
            $scope.errors = log;
        };

        $scope.onRefresh = function () {
            $scope.authDropbox(false);
        }

        $scope.authDropbox(false);
    }])

    .controller('MyCtrl1', ['$scope', function ($scope) {
        $scope.onRefresh = function () {
            window.alert('refresh done!');
            // Trigger refresh complete on the pull to refresh action
            $scope.$broadcast('scroll.refreshComplete');
        }
    }]);