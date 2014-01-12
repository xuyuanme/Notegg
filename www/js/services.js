'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', [])
    .value('version', '0.1')
    .factory('DropBoxService', function ($q, LogService) {
        LogService.log('init dropbox client');
        var client = new Dropbox.Client({ key: 'w7hk0g1c2pnqs8g' });
        if (myApp.isPhone) {
            client.authDriver(new Dropbox.AuthDriver.Cordova({rememberUser: true}));
        } else {
            client.authDriver(new Dropbox.AuthDriver.Popup({ rememberUser: true, receiverUrl: document.location + 'auth_receiver.html' }));
        }

        var service = {
            authenticate: function (fn) {
                LogService.log('start auth');
                if (client._oauth._token === null) {
                    LogService.log('auth token is null, client reset');
                    this.reset();
                }
                try {
                    client.authenticate(fn);
                } catch (err) {
                    LogService.log('catch err: ' + err);
                    this.reset();
                }
            },
            reset: function () {
                LogService.log('client reset');
                client.reset();
            },
            readNotes: function () {
                LogService.log('start read notes');
                var defered = $q.defer();
                client.readFile("notes.txt", function (err, data) {
                    if (err) {
                        LogService.log('read notes err: ' + err);
                        defered.reject(err);
                    } else {
                        LogService.log('read notes resolved');
                        defered.resolve(data);
                    }
                });
                return defered.promise;
            }
//            writeNotes: function () {
//                client.writeFile('notes.txt', 'Hello, World!a', function (error) {
//                    if (error) {
//                        window.alert('Error: ' + error);
//                    } else {
//                        window.alert('File written successfully!');
//                    }
//                });
//            }
        };

        return service;
    })
    .factory('LogService', function () {
        var service = {
            log: function (log) {
                console.log(log);
            }
        }
        return service;
    });