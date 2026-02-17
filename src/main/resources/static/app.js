"use strict";

angular.module('sampleApp', ['ui.router', 'behavio'])
    .config(function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('index', {
                url: '',
                templateUrl: 'views/index.html'
            })
            .state('login', {
                url: '/login',
                templateUrl: 'views/login.html',
                controller: function($scope, $http) {
                    // Function to send data to the backend
                    $scope.sendData = function() {
                        var behavioData = bw.getBehavioData(false); // Get data without resetting first

                        $http.post('/api/GetReport', {
                            'username': $scope.username,
                            'password': $scope.password,
                            'behaviodata': behavioData
                        }).then(function(response) {
                            console.log('Data sent successfully', response.data);

                            // --- Direct and Explicit Reset Logic ---
                            // 1. Reset the behavio data collector for the next session.
                            bw.getBehavioData(true);

                            // 2. Clear the model values and the DOM values explicitly.
                            $scope.username = '';
                            $scope.password = '';
                            jQuery('#username').val('');
                            jQuery('#password').val('');

                            // 3. Clear and hide the raw data text area.
                            $scope.outputData = '';
                            if (document.getElementById('outputArea')) {
                                document.getElementById('outputArea').style.display = 'none';
                            }
                            console.log('Form fields and behavio data have been reset.');

                        }, function(e) {
                            console.error('Error sending data', e);
                        });
                    };

                    // Function to display the collected data
                    $scope.startMonitor = function() {
                        $scope.outputData = bw.getBehavioData(false);
                        document.getElementById('outputArea').style.display = 'block';
                    };

                    // Function to hide the collected data
                    $scope.stopMonitor = function() {
                        document.getElementById('outputArea').style.display = 'none';
                    };

                    // Function to reset the collected data and clear fields
                    $scope.resetData = function() {
                        bw.getBehavioData(true);
                        $scope.outputData = '';
                        $scope.username = '';
                        $scope.password = '';
                        if (document.getElementById('outputArea')) {
                            document.getElementById('outputArea').style.display = 'none';
                        }
                        console.log('Behavio data and form fields have been reset.');
                    };
                }
            });
    });
