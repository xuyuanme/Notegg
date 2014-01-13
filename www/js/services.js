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
            client.authDriver(new Dropbox.AuthDriver.Popup({ rememberUser: true, receiverUrl: document.location + 'auth_receiver.html' }));
        }

        var service = {
            authenticate: function (options, fn) {
                client.authenticate(options, fn);
            },
            reset: function () {
//                console.log('client reset');
                client.reset();
            },
            readNotes: function () {
//                console.log('start read notes');
                var defered = $q.defer();
                client.readFile("notes.txt", function (err, data) {
                    if (err) {
//                        console.log('read notes err: ' + err);
                        defered.reject(err);
                    } else {
//                        console.log('read notes resolved');
                        defered.resolve(data);
                    }
                });
                return defered.promise;
            },
            writeNotes: function (data) {
                var defered = $q.defer();
                client.writeFile('notes.txt', data, function (err) {
                    if (err) {
                        defered.reject(err);
                    } else {
                        defered.resolve();
                    }
                });
                return defered.promise;
            }
        };

        return service;
    });