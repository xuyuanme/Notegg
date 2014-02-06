'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', [])
    .value('version', '0.1')
    .factory('DropBoxService', function ($q) {
//        console.log('init dropbox client');
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
            }
        };

        return service;
    })
    .factory('Notebooks', function () {
        var activeNoteIndex;
        return {
            all: function () {
                var notebookString = window.localStorage['notebooks'];
                if (notebookString) {
                    return angular.fromJson(notebookString);
                }
                return [];
            },
            save: function (notebooks) {
                window.localStorage['notebooks'] = angular.toJson(notebooks);
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
            },
//            getActiveNoteIndex: function () {
//                return activeNoteIndex;
//            },
            getActiveNote: function () {
                if (activeNoteIndex === -1) {
                    return {title: "New Note", content: ""};
                } else {
                    return this.all()[this.getLastActiveIndex()].notes[activeNoteIndex];
                }
            },
            writeNote: function (note) {
                var notebooks = this.all();
                if (note && note.content !== '') {
                    note.title = note.content.split('\n')[0];
                    if (activeNoteIndex === -1) {
                        notebooks[this.getLastActiveIndex()].notes.push(note);
                    } else {
                        notebooks[this.getLastActiveIndex()].notes[activeNoteIndex] = note;
                    }
                } else {
                    notebooks[this.getLastActiveIndex()].notes.splice(activeNoteIndex, 1);
                }
                this.save(notebooks);
            }
        }
    });