'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', [])
    .value('version', '0.1')
    .factory('DropboxService', function ($q, $rootScope) {
//        console.log('init dropbox client');
        var errorHandling = function (err) {
            if (err) {
                console.log(err);
                $rootScope.$broadcast('DropboxError', err);
            }
        };
        var client = new Dropbox.Client({ key: 'w7hk0g1c2pnqs8g' });
        if (myApp.isPhone) {
            client.authDriver(new Dropbox.AuthDriver.Cordova({rememberUser: true}));
        } else {
            client.authDriver(new Dropbox.AuthDriver.Redirect({ rememberUser: true }));
//            client.authDriver(new Dropbox.AuthDriver.Popup({ rememberUser: true, receiverUrl: document.location + 'auth_receiver.html' }));
        }
        // fake auth first to see if there's catched token
        client.authenticate({interactive: false});

        var service = {
            authenticate: function (options, fn) {
                try {
                    client.authenticate(options, fn);
                } catch (err) {
                    // Ignore unresolved error: [$rootScope:infdig] 10 $digest() iterations reached
                    if (err.message.indexOf("iterations reached") === -1) {
                        client.reset();
                        fn(err);
                    }
                }
            },
            isAuthenticated: function () {
                return client.isAuthenticated();
            },
            reset: function () {
//                console.log('client reset');
                client.reset();
            },
            readNotes: function () {
//                console.log('start read notes');
                var defered = $q.defer();
                client.readFile("notes.txt", function (err, data, stat, range) {
                    if (err) {
//                        console.log('read notes err: ' + err);
                        defered.reject(err);
                    } else {
//                        console.log('read notes resolved');
                        defered.resolve({data: data, stat: stat, range: range});
                    }
                });
                return defered.promise;
            },
            writeNotes: function (data, options) {
                var defered = $q.defer();
                client.writeFile('notes.txt', data, options, function (err, stat) {
                    if (err) {
                        defered.reject(err);
                    } else {
                        defered.resolve(stat);
                    }
                });
                return defered.promise;
            },
            writeNotebook: function (notebook) {
                var dir = notebook.title;
                for (var i in notebook.notes) {
                    client.writeFile(dir + '/' + notebook.notes[i].title + '.txt', notebook.notes[i].content, {lastVersionTag: notebook.notes[i].versionTag}, function (err) {
                        errorHandling(err);
                    });
                }
            },
            readNotebooks: function (fn) {
                var notebooks = [];
                client.readdir('/', function (err, d1, d2, folders) {
                    if (err) {
                        errorHandling(err);
                    } else {
                        for (var i in folders) {
                            (function (i) {
                                if (folders[i].isFolder) {
                                    var notebook = {title: '', notes: []};
                                    notebook.title = folders[i].name;
                                    client.readdir('/' + folders[i].name, function (err, d1, d2, files) {
                                        if (err) {
                                            errorHandling(err);
                                        } else {
                                            for (var j in files) {
                                                (function (j) {
                                                    var temp = files[j].name.split('.');
                                                    if (files[j].isFile && temp.length > 1 && temp[temp.length - 1] === "txt") {
                                                        var note = {title: '', content: '', versionTag: ''};
                                                        temp.splice(temp.length - 1, 1);
                                                        note.title = temp.join('.');
                                                        client.readFile(files[j].path, function (err, data, stat) {
                                                            if (err) {
                                                                errorHandling(err);
                                                            } else {
//                                                    note.title = data.split('\n')[0].substring(0, 10);
                                                                note.content = data;
                                                                note.versionTag = stat.versionTag;
                                                                fn(notebooks);
                                                            }
                                                        });
                                                        notebook.notes.push(note);
                                                    }
                                                }(j));
                                            }
                                        }
                                    });
                                    notebooks.push(notebook);
                                }
                            }(i));
                        }
                    }
                });
            },
            remove: function (path) {
                client.remove(path, function (err) {
                    errorHandling(err);
                });
            },
            mkdir: function (path) {
                client.mkdir(path, function (err) {
                    errorHandling(err);
                });
            }
        };

        return service;
    })
    .factory('NotebookService', function (DropboxService) {
        var activeNoteIndex;
        var newEdit = false;
        return {
            all: function () {
                var notebookString = window.localStorage['notebooks'];
                if (notebookString) {
                    return angular.fromJson(notebookString);
                }
                return [];
            },
            save: function (notebooks, skipDropbox) {
                window.localStorage['notebooks'] = angular.toJson(notebooks);
                if (!skipDropbox) {
                    for (var i in notebooks) {
                        DropboxService.writeNotebook(notebooks[i]);
                    }
                }
            },
            newNotebook: function (notebookTitle) {
                // Add a new project
                return {
                    title: notebookTitle,
                    notes: []
                };
            },
            getLastActiveIndex: function () {
                return parseInt(window.localStorage['lastActiveNotebook']) || 0;
            },
            setLastActiveIndex: function (index) {
                window.localStorage['lastActiveNotebook'] = index;
            },
//            getActiveNotebook: function () {
//                return this.all()[this.getLastActiveIndex()];
//            },
            setActiveNoteIndex: function (index) {
                activeNoteIndex = index;
                newEdit = index === -1 ? true : false;
            },
//            getActiveNoteIndex: function () {
//                return activeNoteIndex;
//            },
            getActiveNote: function () {
                if (activeNoteIndex === -1) {
                    return {title: "", content: ""};
                } else {
                    return this.all()[this.getLastActiveIndex()].notes[activeNoteIndex];
                }
            },
            writeNote: function (note) {
                var notebooks = this.all();
                if (note && note.content.trim() !== '') {
                    if (!note.title) {
                        note.title = note.content.split('\n')[0];
                    }
                    if (activeNoteIndex === -1) {
                        notebooks[this.getLastActiveIndex()].notes.push(note);
                    } else {
                        notebooks[this.getLastActiveIndex()].notes[activeNoteIndex] = note;
                    }
                } else {
                    if (activeNoteIndex !== -1) {
                        notebooks[this.getLastActiveIndex()].notes.splice(activeNoteIndex, 1);
                    }
                }
                this.save(notebooks);
            },
            isNewEdit: function () {
                return newEdit;
            },
            readNotebooks: function (fn) {
                DropboxService.readNotebooks(fn);
            }
        }
    });