'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('MyCtrl', ['$scope', '$location', 'DropBoxService', 'Loading', function ($scope, $location, DropBoxService, Loading) {

        $scope.init = function () {
            $scope.log('init MyCtrl');
            $scope.notesContainer = {notes: ''};
            $scope.uiContainer = {showSigninButton: false, showWaitingBar: true};
            if (!DropBoxService.isAuthenticated()) {
                $scope.log('reset dropbox client');
                DropBoxService.reset();
                $scope.resetUI();
            } else {
                $scope.show();
                $scope.authDropbox(false);
            }
        }

        $scope.goto = function (value) {
            $location.path(value);
            // window.alert($scope.actualWidth + ',' + $scope.actualHeight + ',' + $scope.screenWidth + ',' + $scope.screenHeight);
        };

        // Trigger the loading indicator
        $scope.show = function () {

//            // Show the loading overlay and text
//            $scope.loading = Loading.show({
//
//                // The text to display in the loading indicator
//                content: 'Loading',
//
//                // The animation to use
//                animation: 'fade-in',
//
//                // Will a dark overlay or backdrop cover the entire view
//                showBackdrop: true,
//
//                // The maximum width of the loading indicator
//                // Text will be wrapped if longer than maxWidth
//                maxWidth: 200,
//
//                // The delay in showing the indicator
//                showDelay: 500
//            });
        };

        // Hide the loading indicator
        $scope.hide = function () {
//            $scope.loading.hide();
        };

        $scope.authDropbox = function (interactive) {
//            $scope.uiContainer.showSigninButton = false;
//            $scope.uiContainer.showWaitingBar = true;
            $scope.show();

            if (interactive === null || interactive === undefined) {
                interactive = true;
            }
            if (interactive) {
                // if it's active auth triggered by user, means sth is wrong, reset first
                DropBoxService.reset();
            }
            DropBoxService.authenticate({interactive: interactive}, function (err, client) {
                $scope.log('auth with interactive: ' + interactive);
                if (err) {
                    $scope.error('auth err: ' + err);
                    $scope.resetUI();
                } else {
                    if (client.isAuthenticated()) {
                        $scope.log('auth ok');
                        $scope.uiContainer.showSigninButton = false;
                        $scope.uiContainer.showWaitingBar = false;
                        if (myApp.isPhone) {
                            $scope.$apply();
                        }
                        $scope.readNotes();
                        $scope.log('sent read notes request');
                    } else {
                        $scope.error('client not authenticated');
                        $scope.resetUI();
                    }
                }
            });
        };

        $scope.readNotes = function () {
            $scope.log('start read notes');
            // $scope.notes = DropBoxService.readNotes();
            DropBoxService.readNotes().then(function (result) {
                $scope.versionTag = result.stat.versionTag;
                $scope.notesContainer.notes = result.data;
                $scope.uiContainer.showWaitingBar = false;
                $scope.hide();
                $scope.$broadcast('scroll.refreshComplete');
                $scope.log('read notes done');
            }, function (err) {
                $scope.error('read notes promise get error: ' + err);
                if (err.status === Dropbox.ApiError.INVALID_TOKEN) {
                    $scope.log('reset dropbox client');
                    DropBoxService.reset();
                    $scope.resetUI();
                } else if (err.status === Dropbox.ApiError.NOT_FOUND) {
//                    $scope.writeNotes();
                } else if (err.status === Dropbox.ApiError.NETWORK_ERROR) {

                } else {
                    $scope.resetUI();
                }
            });
        };

        $scope.writeNotes = function () {
            $scope.show();
            $scope.log('start write notes for versionTag: ' + $scope.versionTag);
            if ($scope.notesContainer.notes === '') {
                $scope.notesContainer.notes = "Write your first note here";
            }
            DropBoxService.writeNotes($scope.notesContainer.notes, {lastVersionTag: $scope.versionTag}).then(function (stat) {
                $scope.versionTag = stat.versionTag;
                $scope.hide();
                $scope.log('write notes successful');
            }), function (err) {
                $scope.error('write notes error for versionTag ' + $scope.versionTag + ': ' + err);
                $scope.resetUI();
            }
        }

        $scope.resetUI = function () {
            $scope.log('reset ui');
            $scope.uiContainer.showSigninButton = true;
            $scope.uiContainer.showWaitingBar = false;
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

        $scope.init();
    }])

    .controller('MyCtrl1', ['$scope', function ($scope) {
        $scope.onRefresh = function () {
            window.alert('refresh done!');
            // Trigger refresh complete on the pull to refresh action
            $scope.$broadcast('scroll.refreshComplete');
        }
    }]);