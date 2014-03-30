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
            readNote: function (path) {
                console.log('start read note ' + path);
                var defered = $q.defer();
                client.readFile(path, function (err, data, stat, range) {
                    if (err) {
                        console.log('read note err: ' + err);
                        defered.reject(err);
                    } else {
                        var title = path.replace(/.*\//, '').replace(/\.\w*$/, ''); // replace '/a.a/b.b/e.e.txt' to 'e.e'
                        console.log('read note ' + title + ' resolved');
                        defered.resolve({title: title, content: data, versionTag: stat.versionTag});
                    }
                });
                return defered.promise;
            },
            readNotebook: function (path) {
                console.log('start read notebook ' + path);
                var defered = $q.defer();
                var promises = [];
                var that = this;

                var title = path.replace(/^\//, ''); // replace '/main' to 'main'
                console.log('Notebook title: ' + title);

                client.readdir(path, function (err, d1, d2, files) {
                    if (err) {
                        console.log('read notebook err: ' + err);
                        defered.reject(err);
                    } else {
                        for (var i in files) {
                            (function (i) {
                                var temp = files[i].name.split('.');
                                if (files[i].isFile && temp.length > 1 && temp[temp.length - 1] === "txt") {
                                    promises.push(that.readNote(files[i].path).then(function (note) {
                                        return note;
                                    }));
                                }
                            }(i));
                        }
                        $q.all(promises).then(function (notes) {
                            console.log('all notes for notebook ' + title + ' resolved');
                            defered.resolve({title: title, notes: notes});
                        }, function (err) {
                            defered.reject(err);
                        });
                    }
                });
                return defered.promise;
            },
            readNotebooks: function () {
                console.log('start read notebooks');
                var defered = $q.defer();
                var promises = [];
                var that = this;

                client.readdir('/', function (err, d1, d2, folders) {
                    if (err) {
                        console.log('read notebooks err: ' + err);
                        defered.reject(err);
                    } else {
                        for (var i in folders) {
                            (function (i) {
                                if (folders[i].isFolder) {
                                    promises.push(that.readNotebook('/' + folders[i].name).then(function (notebook) {
                                        return notebook
                                    }));
                                }
                            }(i));
                        }
                        $q.all(promises).then(function (notebooks) {
                            console.log('all notebooks read successful');
                            defered.resolve(notebooks);
                        }, function (err) {
                            defered.reject(err);
                        });
                    }
                });
                return defered.promise;
            },
            writeNote: function (dir, note) {
                console.log('[' + dir + '] start to write note ' + note.title);
                var defered = $q.defer();
                client.writeFile(dir + '/' + note.title + '.txt', note.content, {lastVersionTag: note.versionTag}, function (err, stat) {
                    if (err) {
                        note.dir = dir;
                        defered.reject(note);
                    } else {
                        defered.resolve(stat);
                    }
                });
                return defered.promise;
            },
            writeNotebook: function (notebook) {
                console.log('start to write notebook ' + notebook.title);
                var defered = $q.defer();
                var promises = [];
                var that = this;
                var dir = notebook.title;
                for (var i in notebook.notes) {
                    (function (i) {
                        if (notebook.notes[i].isChanged) {
                            promises.push(that.writeNote(dir, notebook.notes[i]).then(function (stat) {
                                notebook.notes[i].versionTag = stat.versionTag;
                                return notebook.notes[i];
                            }, function (rejectNote) {
                                console.log('copy reject note ' + rejectNote.title + ' to _draft box');
                                that.saveDraft(rejectNote);
                            }));
                        } else {
                            promises.push($q.when(notebook.notes[i]).then(function (note) {
                                return note;
                            }));
                        }
                    }(i));
                }

                $q.all(promises).then(function (notes) {
                    console.log('all notes for ' + notebook.title + ' wrote successful');
                    defered.resolve({title: notebook.title, notes: notes});
                }, function (err) {
                    defered.reject(err);
                });

                return defered.promise;
            },
            writeNotebooks: function (notebooks) {
                console.log('start write notebooks');
                var defered = $q.defer();
                var promises = [];
                var that = this;

                for (var i in notebooks) {
                    (function (i) {
                        if (notebooks[i].title !== '_draft') {
                            promises.push(that.writeNotebook(notebooks[i]).then(function (notebook) {
                                return notebook
                            }));
                        }
                    }(i));
                }

                $q.all(promises).then(function (notebooks) {
                    defered.resolve(notebooks);
                }, function (err) {
                    defered.reject(err);
                });

                return defered.promise;
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
            },
            getDraftNotebook: function () {
                var notebookString = window.localStorage['drafts_notebook'];
                if (notebookString) {
                    return angular.fromJson(notebookString);
                }
                return {title: '_draft', notes: []};
            },
            saveDraft: function (draft) {
                var draftNotebook = this.getDraftNotebook();
                draftNotebook.notes.push(draft);
                window.localStorage['drafts_notebook'] = angular.toJson(draftNotebook);
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
                    console.log('read from local storage');
                    var notebooks = angular.fromJson(notebookString);
                    if (DropboxService.getDraftNotebook().notes.length > 0) {
                        notebooks.push(DropboxService.getDraftNotebook());
                    }
                    return notebooks;
//                    return angular.fromJson(notebookString);
                }
                return [];
            },
            save: function (notebooks, skipDropbox) {
                if (!skipDropbox) {
                    DropboxService.writeNotebooks(notebooks).then(function (notebooks) {
                        console.log('save to local storage on Dropbox successful');
                        window.localStorage['notebooks'] = angular.toJson(notebooks);
                    }, function (err) {
                        // TODO: Error Handling
                        console.log(err)
                    });
                } else {
                    console.log('save to local storage');
                    window.localStorage['notebooks'] = angular.toJson(notebooks);
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
                    note.isChanged = true;
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
                DropboxService.readNotebooks().then(function (notebooks) {
                    console.log('read notebooks done');
                    console.log(notebooks);
                    fn(null, notebooks);
                }, function (err) {
                    fn(err);
                });
            }
        }
    });