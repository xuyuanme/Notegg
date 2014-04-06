'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', [])
    .value('version', '0.1')
    .factory('Utils', function ($location) {
        var service = {
            Error: {WriteNoteFail: 1, Others: 999},
            goto: function (url) {
                $location.path(url);
            },
            info: function (log) {
                console.log(log);
            },
            warn: function (log) {
                console.log(log);
            },
            error: function (log) {
                console.log(log);
            }
        };
        return service;
    })
    .factory('DropboxService', function ($q, $rootScope, Utils) {
//        Utils.info('init dropbox client');
        var errorHandling = function (err) {
            if (err) {
                Utils.info(err);
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
                client.reset();
            },
            readNote: function (path) {
                Utils.info('start read note ' + path);
                var defered = $q.defer();
                client.readFile(path, function (err, data, stat, range) {
                    if (err) {
                        Utils.info('read note err: ' + err);
                        defered.reject({status: err.status, data: path});
                    } else {
                        var title = path.replace(/.*\//, '').replace(/\.\w*$/, ''); // replace '/a.a/b.b/e.e.txt' to 'e.e'
                        Utils.info('read note ' + title + ' resolved');
                        defered.resolve({title: title, content: data, versionTag: stat.versionTag});
                    }
                });
                return defered.promise;
            },
            readNotebook: function (path) {
                Utils.info('start read notebook ' + path);
                var defered = $q.defer();
                var promises = [];
                var that = this;

                var title = path.replace(/^\//, ''); // replace '/main' to 'main'
                Utils.info('Notebook title: ' + title);

                client.readdir(path, function (err, d1, d2, files) {
                    if (err) {
                        Utils.info('read notebook err: ' + err);
                        defered.reject({status: err.status, data: path});
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
                            Utils.info('all notes for notebook ' + title + ' resolved');
                            defered.resolve({title: title, notes: notes});
                        }, function (err) {
                            defered.reject(err);
                        });
                    }
                });
                return defered.promise;
            },
            readNotebooks: function () {
                Utils.info('start read notebooks');
                var defered = $q.defer();
                var promises = [];
                var that = this;

                client.readdir('/', function (err, d1, d2, folders) {
                    if (err) {
                        Utils.info('read notebooks err: ' + err);
                        defered.reject({status: err.status, data: err});
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
                            Utils.info('all notebooks read successful');
                            defered.resolve(notebooks);
                        }, function (err) {
                            defered.reject(err);
                        });
                    }
                });
                return defered.promise;
            },
            writeNote: function (dir, note) {
                Utils.info('[' + dir + '] start to write note ' + note.title);
                var defered = $q.defer();
                client.writeFile(dir + '/' + note.title + '.txt', note.content, {lastVersionTag: note.versionTag}, function (err, stat) {
                    if (err) {
                        note.dir = dir;
                        defered.reject({status: err.status, data: note});
                    } else {
                        defered.resolve(stat);
                    }
                });
                return defered.promise;
            },
            writeNotebook: function (notebook) {
                Utils.info('start to write notebook ' + notebook.title);
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
                            }));
                        } else {
                            promises.push($q.when(notebook.notes[i]).then(function (note) {
                                return note;
                            }));
                        }
                    }(i));
                }

                $q.all(promises).then(function (notes) {
                    Utils.info('all notes for ' + notebook.title + ' wrote successful');
                    defered.resolve({title: notebook.title, notes: notes});
                }, function (err) {
                    defered.reject(err);
                });

                return defered.promise;
            },
            writeNotebooks: function (notebooks) {
                Utils.info('start write notebooks');
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
            }
        };

        return service;
    })
    .factory('NotebookService', function (DropboxService, Utils) {
        var activeNoteIndex;
        var newEdit = false;
        return {
            // Read all notes from local storage
            all: function () {
                var notebookString = window.localStorage['notebooks'];
                if (notebookString) {
                    Utils.info('read from local storage');
                    var notebooks = angular.fromJson(notebookString);
                    if (this.getDraftNotebook().notes.length > 0) {
                        notebooks.push(this.getDraftNotebook());
                    }
                    return notebooks;
                }
                return [];
            },
            save: function (notebooks, skipDropbox) {
                var that = this;
                Utils.info('save to local storage');
                window.localStorage['notebooks'] = angular.toJson(notebooks);
                if (!skipDropbox) {
                    DropboxService.writeNotebooks(notebooks).then(function (notebooks) {
                        Utils.info('save to local storage again on Dropbox successful, so versionTag is updated');
                        window.localStorage['notebooks'] = angular.toJson(notebooks);
                    }, function (err) {
                        Utils.error('save notebooks error, code: ' + err.status);
                        // TODO: Error Handling
                        Utils.error('copy reject note ' + err.data.title + ' to _draft box');
                        that.saveDraft(err.data);
                        // TODO: verify and implement the logic here
                        // TODO: offline edit support
                        // TODO: delete draft unsuccessful
                    });
                }
            },
            createNotebook: function (notebookTitle) {
                var notebooks = this.all();
                notebooks.push({
                    title: notebookTitle,
                    notes: []
                });
                this.save(notebooks, true);
                DropboxService.mkdir('/' + notebookTitle);
                return notebooks;
            },
            // Get active notebook index
            getLastActiveIndex: function () {
                return parseInt(window.localStorage['lastActiveNotebook']) || 0;
            },
            // Set active notebook index
            setLastActiveIndex: function (index) {
                window.localStorage['lastActiveNotebook'] = index;
            },
            // Get active note index (for edit note controller)
            getActiveNoteIndex: function () {
                return activeNoteIndex;
            },
            // Set active note index (for edit note controller)
            setActiveNoteIndex: function (index) {
                activeNoteIndex = index;
                newEdit = index === -1 ? true : false;
            },
            getActiveNote: function () {
                if (activeNoteIndex === -1) {
                    return {title: "", content: ""};
                } else {
                    return this.all()[this.getLastActiveIndex()].notes[activeNoteIndex];
                }
            },
            isNewEdit: function () {
                return newEdit;
            },
            refreshNotebooks: function (fn) {
                var that = this;
                DropboxService.readNotebooks().then(function (notebooks) {
                    Utils.info('read notebooks done');
                    that.save(notebooks, true);
                    fn(null, that.all());
                }, function (err) {
                    fn(err);
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
        }
    });