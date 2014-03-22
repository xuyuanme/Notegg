'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('DropboxCtrl', ['$scope', '$location', 'DropboxService', function ($scope, $location, DropboxService) {

        $scope.init = function () {
            $scope.log('init MyCtrl');
            $scope.notesContainer = {notes: ''};
            $scope.uiContainer = {showSigninButton: false, showWaitingBar: true};
            if (!DropboxService.isAuthenticated()) {
                $scope.log('reset dropbox client');
                DropboxService.reset();
                $scope.resetUI();
            } else {
                $scope.show();
                $scope.authDropbox(false);
            }
            $scope.$on('DropboxError', function (event, err) {
                $scope.resetUI();
                $scope.$apply();
            });
        };

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
                DropboxService.reset();
            }
            DropboxService.authenticate({interactive: interactive}, function (err, client) {
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
//                        $scope.readNotes();
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
            // $scope.notes = DropboxService.readNotes();
            DropboxService.readNotes().then(function (result) {
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
                    DropboxService.reset();
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
            DropboxService.writeNotes($scope.notesContainer.notes, {lastVersionTag: $scope.versionTag}).then(function (stat) {
                $scope.versionTag = stat.versionTag;
                $scope.hide();
                $scope.log('write notes successful');
            }), function (err) {
                $scope.error('write notes error for versionTag ' + $scope.versionTag + ': ' + err);
                $scope.resetUI();
            }
        };

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
        };

        $scope.init();
    }])

    .controller('MyCtrl1', ['$scope', function ($scope) {
        $scope.onRefresh = function () {
            window.alert('refresh done!');
            // Trigger refresh complete on the pull to refresh action
            $scope.$broadcast('scroll.refreshComplete');
        }
    }])

    .controller('NoteCtrl', function ($scope, $ionicModal, NotebookService, $location, DropboxService) {
        // A utility function for creating a new notebook
        // with the given notebookTitle
        var createNotebook = function (notebookTitle) {
            var newNotebook = NotebookService.newNotebook(notebookTitle);
            $scope.notebooks.push(newNotebook);
            NotebookService.save($scope.notebooks, true);
            DropboxService.mkdir('/' + notebookTitle);
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

            // Grab the last active, or the first notebook
            $scope.activeNotebook = $scope.notebooks[NotebookService.getLastActiveIndex()];

            if ($scope.notebooks.length === 0) {
                createNotebook("Main");
            }
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

        // Create our modal
        $ionicModal.fromTemplateUrl('partials/new-note.html', function (modal) {
            $scope.noteModal = modal;
        }, {
            scope: $scope
        });

        $scope.newNote = function () {
            $scope.noteModal.show();
        };

        $scope.closeNewNote = function () {
            $scope.noteModal.hide();
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

        $scope.refreshModel = function (notebooks) {
            $scope.notebooks = notebooks;
            $scope.activeNotebook = notebooks[NotebookService.getLastActiveIndex()];
            NotebookService.save($scope.notebooks, true);
        };

        $scope.refreshNotebooks = function () {
            NotebookService.readNotebooks(function (notebooks) {
                $scope.refreshModel(notebooks);
                $scope.$apply();
            });
            $scope.$broadcast('scroll.refreshComplete');
        };

        init();
    })
    .controller('EditNoteCtrl', function ($scope, NotebookService, $location) {
        $scope.newEdit = NotebookService.isNewEdit();
        $scope.activeNote = NotebookService.getActiveNote();

        $scope.writeNote = function (item) {
            NotebookService.writeNote(item);
            $scope.goto('/');
        };

        $scope.goto = function (url) {
            $location.path(url);
        }
    });