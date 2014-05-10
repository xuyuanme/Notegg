'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('ToastController', function ($scope, Utils) {
        $scope.$on('ShowToast', function (event, message) {
            if (message) {
                Utils.info('show toast message: ' + message);
                $scope.toast = {message: message};
//                showToast();
            }
        });
    })
    .controller('DropboxCtrl', ['$scope', '$location', 'DropboxService', 'Utils', '$rootScope', function ($scope, $location, DropboxService, Utils, $rootScope) {

        $scope.init = function () {
            Utils.info('init MyCtrl');
            $scope.uiContainer = {showSigninButton: false, showWaitingBar: true};
            if (!DropboxService.isAuthenticated()) {
                Utils.info('reset dropbox client');
                DropboxService.reset();
                $scope.resetUI();
            } else {
                $scope.authDropbox(false);
            }
            $scope.$on('DropboxError', function (event, err) {
                if (err.status === Dropbox.ApiError.INVALID_TOKEN) {
                    Utils.info('reset dropbox client');
                    DropboxService.reset();
                }
                $scope.resetUI();
                $scope.$apply();
            });
        };

        $scope.authDropbox = function (interactive) {
//            $scope.uiContainer.showSigninButton = false;
//            $scope.uiContainer.showWaitingBar = true;

            if (interactive === null || interactive === undefined) {
                interactive = true;
            }
            if (interactive) {
                // if it's active auth triggered by user, means sth is wrong, reset first
                DropboxService.reset();
            }
            DropboxService.authenticate({interactive: interactive}, function (err, client) {
                Utils.info('auth with interactive: ' + interactive);
                if (err) {
                    Utils.error('auth err: ' + err);
                    $scope.resetUI();
                } else {
                    if (client.isAuthenticated()) {
                        Utils.info('auth ok');
                        $scope.uiContainer.showSigninButton = false;
                        $scope.uiContainer.showWaitingBar = false;
                        if (myApp.isPhone) {
                            $scope.$apply();
                        }
                        if (interactive) {
                            Utils.info('broadcast login success event');
                            $rootScope.$broadcast('LoginSuccess');
                        }
                    } else {
                        Utils.error('client not authenticated');
                        $scope.resetUI();
                    }
                }
            });
        };

        $scope.resetUI = function () {
            Utils.info('reset ui');
            $scope.uiContainer.showSigninButton = true;
            $scope.uiContainer.showWaitingBar = false;
            $scope.$broadcast('scroll.refreshComplete');
        };

//        $scope.onRefresh = function () {
//            $scope.authDropbox(false);
//        };

        $scope.init();
    }])

    .controller('NoteCtrl', function ($scope, $ionicModal, NotebookService, $location, DropboxService, Utils, $ionicLoading) {
        var createNotebook = function (notebookTitle) {
            $scope.notebooks = NotebookService.createNotebook(notebookTitle);
            $scope.selectNotebook($scope.notebooks.length - 1);
        };

        var deleteNotebook = function (item) {
            DropboxService.remove($scope.notebooks[item].title);
            $scope.notebooks.splice(item, 1);
            if ($scope.notebooks.length === 0) {
                $scope.activeNotebook = null;
            } else if (NotebookService.getLastActiveIndex() === item) {
                $scope.selectNotebook(0, true);
            }
            NotebookService.save($scope.notebooks, true);
        };

        var init = function () {
            // Load or initialize notebooks
            $scope.notebooks = NotebookService.all();
            // should save first in case lost data on mobile app
//            NotebookService.save($scope.notebooks); // wrong, should do it in sync way
            document.addEventListener("resume", function () {
                $scope.refreshNotebooks();
            }, false);

            document.addEventListener("deviceready", function () {
                $scope.refreshNotebooks();
            }, false);

            // Grab the last active, or the first notebook
            $scope.activeNotebook = $scope.notebooks[NotebookService.getLastActiveIndex()];

            if ($scope.notebooks.length === 0) {
                createNotebook("Main");
            }

            $scope.$on('LoginSuccess', function (event) {
                $scope.refreshNotebooks();
            });
        };

        // Called to create a new notebook
        $scope.newNotebook = function () {
            if (document.URL.indexOf('https://') !== -1 || document.URL.indexOf('http://') !== -1) {
                var notebookTitle = prompt('Notebook Name').trim();
                if (notebookTitle !== '') {
                    createNotebook(notebookTitle);
                }
            } else {
                navigator.notification.prompt(
                    "Please enter notebook name", // message
                    function (answer) {
                        if (answer.buttonIndex === 2 && answer.input1.trim() !== '') {
                            // Ok
                            createNotebook(answer.input1.trim());
                        }
                        else {
                            // Exit
                        }
                    }, // callback
                    "New Notebook", //title
                    ["Cancel", "OK"], // button titles
                    new String() // defaultText
                );
            }
        };

        // Called to select the given notebook
        $scope.selectNotebook = function (index, keepMenuOpen) {
            $scope.activeNotebook = $scope.notebooks[index];
            NotebookService.setLastActiveIndex(index);
            if ($scope.sideMenuController && !keepMenuOpen) {
                $scope.sideMenuController.close();
            }
        };

        $scope.toggleNotebooks = function () {
            $scope.sideMenuController.toggleLeft();
        };

        $scope.itemButtons = [
            {
                text: 'Delete',
                type: 'button-assertive',
                onTap: function (item) {
                    DropboxService.remove($scope.activeNotebook.title + '/' + $scope.activeNotebook.notes[item].title + '.txt');
                    $scope.activeNotebook.notes.splice(item, 1);
                    NotebookService.save($scope.notebooks, true);
                }
            }
        ];

        $scope.onNotebookDelete = function (item) {
            if (document.URL.indexOf('https://') !== -1 || document.URL.indexOf('http://') !== -1) {
                if (confirm('Delete Notebook "' + $scope.notebooks[item].title + '"?')) {
                    deleteNotebook(item);
                }
            } else {
                navigator.notification.confirm(
                    'Delete Notebook "' + $scope.notebooks[item].title + '"?', // message
                    function (buttonIndex) {
                        if (buttonIndex === 1) {
                            deleteNotebook(item);
                            $scope.$apply();
                        }
                    },            // callback to invoke with index of button pressed
                    'Warning',           // title
                    'OK,Cancel'         // buttonLabels
                );
            }
        };

        $scope.setActiveNote = function (index) {
            if (index === undefined) {
                index = -1;
            }
            NotebookService.setActiveNoteIndex(index);
            $location.path('noteEdit');
        };

        $scope.onReorder = function (el, oldIndex, newIndex) {
            if (oldIndex !== newIndex) {
                var tempNode = $scope.notebooks[newIndex];
                $scope.notebooks[newIndex] = $scope.notebooks[oldIndex];
                $scope.notebooks[oldIndex] = tempNode;
                tempNode = null;
            }
            NotebookService.save($scope.notebooks);
        };

        $scope.refreshNotebooks = function () {
            $scope.loading = $ionicLoading.show({
                content: 'Loading...'
            });
            NotebookService.refreshNotebooks(function (err, notebooks) {
                if (!err && notebooks) {
                    $scope.notebooks = notebooks;
                    $scope.activeNotebook = $scope.notebooks[NotebookService.getLastActiveIndex()];
                    $scope.$apply();
                }
                $scope.loading.hide();
                $scope.$broadcast('scroll.refreshComplete');
            });
        };

        init();
    })
    .controller('EditNoteCtrl', function ($scope, NotebookService, Utils) {
        $scope.newEdit = NotebookService.isNewEdit();
        $scope.activeNote = NotebookService.getActiveNote();
        var notebooks = NotebookService.all();

        $scope.writeNote = function (note) {
            if (note) {
                var lastActiveIndex = NotebookService.getLastActiveIndex();
                var lastActiveNoteIndex = NotebookService.getActiveNoteIndex();

                note.isChanged = true;
                if (!note.title) {
                    note.title = note.content.split('\n')[0];
                }
                if (lastActiveNoteIndex === -1) {
                    // skip the empty new note
                    if (note.title.trim() !== '') {
                        // add new note
                        notebooks[lastActiveIndex].notes.push(note);
                    }
                } else {
                    // edit note
                    notebooks[lastActiveIndex].notes[lastActiveNoteIndex] = note;
                }
                NotebookService.save(notebooks);
            }
            this.gotoHome();
        };

        $scope.gotoHome = function () {
            Utils.goto('/');
        }
    });