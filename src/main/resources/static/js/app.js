"use strict";

angular.module('sampleApp', ['ui.router', 'behavio'])
	.config(function($stateProvider, $urlRouterProvider) {
		$urlRouterProvider.otherwise('/');

		$stateProvider
			.state('index', {
				url: '',
				templateUrl: 'views/login.html',
				controller: function($scope, $state, $http, $interval, $compile) {

					$scope.elements = {
						"username": true,
						"password": true
					};

					$scope.startMonitor = function() {
						$scope.dataListener = $interval(function() {
							$scope.outputData = bw.getBehavioData();
							
						},  100);
						$('#startbutton').removeClass('btn-info');
						$('#startbutton').addClass('btn-success');
						$('#stopbutton').removeClass('btn-default');
						$('#stopbutton').addClass('btn-danger');
						
						$('#outputArea').show();
					};
					$scope.stopMonitor = function() {
						$interval.cancel($scope.dataListener);
						$scope.outputData = '';
						$('#startbutton').addClass('btn-info');
						$('#startbutton').removeClass('btn-default');
						$('#stopbutton').addClass('btn-default');
						$('#stopbutton').removeClass('btn-danger');
						
						$('#outputArea').hide();
					};
					$scope.generateJID = function() {
						$scope.journeyId = Math.random().toString(36).substr(2);
					};
					$scope.generateSID = function() {
						$scope.sessionId = Math.random().toString(36).substr(2);
					};
					$scope.generateuID = function() {
						$scope.userId = "marco.fanti@gmail.com";
					};
					$scope.clearUserId = function() {
						$scope.userId = "";
					};
					$scope.clearNotes = function() {
						$scope.notes = "";
					};
					$scope.clearUsername = function() {
						$scope.username = "";
					};
					$scope.clearPassword = function() {
						$scope.password = "";
					};
					$scope.clearField = function($field) {
						$scope[$field] = '';
					}
					$scope.sendData = function() {
						$('#alerts').html('');
						if (typeof $scope.userId == 'undefined' || $scope.userId == '')
						{
							$('#alerts').html('<div class="alert alert-warning"><a href="#" class="close" data-dismiss="alert">&times;</a>userid cannot be empty.</div>');
							return;
						}
						// send data to the backend
						var callback = function(xhr) {
							if (xhr.status === 200){
								$('#alerts').html('<div class="alert alert-info"><a href="#" class="close" data-dismiss="alert">&times;</a>Data sent.</div>');
								$('#sessionid').attr('disabled', 'disabled');
								$('#generateSID').attr('disabled', 'disabled');
								$('#finalizebutton').removeAttr('disabled');
							} else {
								$('#alerts').html('<div class="alert alert-danger"><a href="#" class="close" data-dismiss="alert">&times;</a>Something went wrong. Check console for XHR info.</div>');
								console.log(xhr);
							}
						}
						bw.sendDataGetReport($scope.journeyId, $scope.sessionId,$scope.userId,$scope.notes, callback);
						//reset behavio data and fields
						bw.resetBehavioData();
						$scope.resetFields();
					};
					$scope.resetData = function() {
						$scope.resetFields();
						bw.getBehavioData(true);
						$('#alerts').html('');
					};
					$scope.resetFields = function() {
						var fields = Object.keys($scope.elements);
						for (var i=0; i<fields.length; ++i)
							$scope.clearField(fields[i]);
					};
					$scope.addElement = function() {
						if ($scope.elements[$scope.elementName]) {
							$scope.errorMessage = $scope.elementName + " is already added";
							console.log($scope.errorMessage);
							return;
						}

						if (typeof $scope.elementName == 'undefined' || typeof $scope.elementMonitorType == 'undefined'
							|| $scope.elementName == '' || $scope.elementMonitorType == '')
						{
							$scope.errorMessage = 'Fields cannot be empty';
							console.log($scope.errorMessage);
							return;
						} else {
							$scope.errorMessage = null;
						}

						var elString = '<label for="' + $scope.elementName + '" id="label_' + $scope.elementName + '">' + $scope.elementName + '</label>';
						elString += '<div class="input-group" id="input-group_' + $scope.elementName + '">';
						elString += '  <input type="' + (($scope.elementMonitorType === 'fa') ? 'password' : 'text') + '" ng-model=' + $scope.elementName + ' class="form-control ng-pristine ng-untouched ng-valid" id="' + $scope.elementName + '" name="' + $scope.elementName + '" monitored>';
						elString += '  <span class="input-group-btn"><button class="btn btn-default" ng-click="removeElement(\'' + $scope.elementName + '\')" type="button"><span class="glyphicon glyphicon-remove-circle" aria-hidden="true"></span></button></span>'
						elString += '</div>';

						$scope.elements[$scope.elementName] = true;
						$scope.elementName = '';
						$scope.elementMonitorType = '';

						$('#monitoredFields').append($compile(elString)($scope));
					};
					$scope.removeElement = function($field) {
						if ($scope.elements[$field]) {
							$scope.clearField($field);
							$('#' + $field).remove();
							
							$('#label_' + $field).remove();
							$('#input-group_' + $field).remove();
							
							$scope.elements[$field] = false;
						}
					}
					$scope.finalizeSession = function() {

						var params = {};
						params.sessionId = $scope.sessionId;
						params.userid = $scope.userId;
						params.report = 'true';
						params.reportflags = '746877092';
						params.tenantid = "default_tenant";
						$.ajax({
							type: 'POST',
							url: bhw_bindjourney_endpoint,
							data: params,
							contentType: 'application/x-www-form-urlencoded',
							dataType: 'json',
							success: function (result)
							{
							},
							error: function(result)
							{
							}
						});
						var params2 = {};
						params2.sessionId = $scope.sessionId;
						params2.tenantid = "default_tenant";

						$.ajax({
							type: 'POST',
							url: bhw_finalizesession_endpoint,
							data: params2,
							contentType: 'application/x-www-form-urlencoded',
							dataType: 'json',
							success: function (result)
							{
								if (result.success == true)
								{
									$('#alerts').html('<div class="alert alert-info"><a href="#" class="close" data-dismiss="alert">&times;</a>Session finalized.</div>');
									$('#sessionid').removeAttr('disabled');
									$('#generateSID').removeAttr('disabled');
									$('#finalizebutton').attr('disabled', 'disabled');
									$('#journeyid').val('');
									$('#sessionid').val('');
									$('#userid').val('');
									$('#notes').val('');
									$scope.sessionId = '';
									$scope.journeyId = '';
									$scope.userId = '';
									$scope.notes = '';
									bw.resetBehavioData();
									$scope.resetFields();
								}
								else
								{
									$('#alerts').html('<div class="alert alert-warning"><a href="#" class="close" data-dismiss="alert">&times;</a>Session finalized.</div>');
								}
							},
							error: function(result)
							{
								$('#alerts').html('<div class="alert alert-warning"><a href="#" class="close" data-dismiss="alert">&times;</a>Session finalized.</div>');
							}
						});

					};
				}
			})
	});
