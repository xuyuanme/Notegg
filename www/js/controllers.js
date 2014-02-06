'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('MyCtrl', ['$scope', '$location', 'DropBoxService', function ($scope, $location, DropBoxService) {

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
    }])

    .controller('NoteCtrl', function ($scope, $ionicModal, Notebooks) {

        // A utility function for creating a new notebook
        // with the given notebookTitle
        var createNotebook = function (notebookTitle) {
            var newNotebook = Notebooks.newNotebook(notebookTitle);
            $scope.notebooks.push(newNotebook);
            Notebooks.save($scope.notebooks);
            $scope.selectNotebook(newNotebook, $scope.notebooks.length - 1);
        }

        // Load or initialize notebooks
        $scope.notebooks = Notebooks.all();

        // Grab the last active, or the first notebook
        $scope.activeNotebook = $scope.notebooks[Notebooks.getLastActiveIndex()];

        // Called to create a new notebook
        $scope.newNotebook = function () {
            if (document.URL.indexOf('https://') !== -1 || document.URL.indexOf('http://') !== -1) {
                var notebookTitle = prompt('Notebook Name');
                if (notebookTitle) {
                    createNotebook(notebookTitle);
                }
            } else {
                navigator.notification.prompt(
                    "Please enter notebook name", // message
                    function (answer) {
                        if (answer.buttonIndex === 1 && answer.input1 !== '') {
                            // Ok
                            createNotebook(answer.input1);
                        }
                        else {
                            // Exit
                        }
                    }, // callback
                    "New Notebook", //title
                    ["Ok", "Exit"], // button titles
                    new String() // defaultText
                );
            }
        };

        // Called to select the given notebook
        $scope.selectNotebook = function (notebook, index) {
            $scope.activeNotebook = notebook;
            Notebooks.setLastActiveIndex(index);
            $scope.sideMenuController.close();
        };

        // Create our modal
        $ionicModal.fromTemplateUrl('partials/new-note.html', function (modal) {
            $scope.noteModal = modal;
        }, {
            scope: $scope
        });

        $scope.createNote = function (note) {
            if (!$scope.activeNotebook) {
                return;
            }
            $scope.activeNotebook.notes.push({
                title: note.title
            });
            $scope.noteModal.hide();

            // Inefficient, but save all the notebooks
            Notebooks.save($scope.notebooks);

            note.title = "";
        };

        $scope.newNote = function () {
            $scope.noteModal.show();
        };

        $scope.closeNewNote = function () {
            $scope.noteModal.hide();
        }

        $scope.toggleNotebooks = function () {
            $scope.sideMenuController.toggleLeft();
        };

        $scope.itemButtons = [
            {
                text: 'Delete',
                type: 'button-assertive',
                onTap: function (item) {
                    $scope.activeNotebook.notes.splice($scope.activeNotebook.notes.indexOf(item), 1);
                    Notebooks.save($scope.notebooks);
                }
            }
        ];

        $scope.onItemDelete = function (item) {
            $scope.notebooks.splice($scope.notebooks.indexOf(item), 1);
            Notebooks.save($scope.notebooks);
        };

        $scope.setActiveNote = function (index) {
            if (index === undefined) {
                index = -1;
            }
            Notebooks.setActiveNoteIndex(index);
        };
    })
    .controller('EditNoteCtrl', function ($scope, Notebooks) {
        $scope.activeNote = Notebooks.getActiveNote();

        $scope.writeNote = function (item) {
            Notebooks.writeNote(item);
        }
    });