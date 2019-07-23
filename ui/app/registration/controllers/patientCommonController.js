'use strict';

angular.module('bahmni.registration')
    .controller('PatientCommonController', ['$scope', '$rootScope', '$http', 'patientAttributeService', 'appService', 'spinner', '$location', 'ngDialog', '$window', '$state',
        function ($scope, $rootScope, $http, patientAttributeService, appService, spinner, $location, ngDialog, $window, $state) {
            var autoCompleteFields = appService.getAppDescriptor().getConfigValue("autoCompleteFields", []);
            var showCasteSameAsLastNameCheckbox = appService.getAppDescriptor().getConfigValue("showCasteSameAsLastNameCheckbox");
            var personAttributes = [];
            var caste;

            $scope.showMiddleName = appService.getAppDescriptor().getConfigValue("showMiddleName");
            $scope.showLastName = appService.getAppDescriptor().getConfigValue("showLastName");
            $scope.isLastNameMandatory = $scope.showLastName && appService.getAppDescriptor().getConfigValue("isLastNameMandatory");
            $scope.showBirthTime = appService.getAppDescriptor().getConfigValue("showBirthTime") != null
                ? appService.getAppDescriptor().getConfigValue("showBirthTime") : true;  // show birth time by default
            $scope.genderCodes = Object.keys($rootScope.genderMap);
            $scope.dobMandatory = appService.getAppDescriptor().getConfigValue("dobMandatory") || false;
            $scope.readOnlyExtraIdentifiers = appService.getAppDescriptor().getConfigValue("readOnlyExtraIdentifiers");
            $scope.showSaveConfirmDialogConfig = appService.getAppDescriptor().getConfigValue("showSaveConfirmDialog");
            $scope.showSaveAndContinueButton = false;

            var dontSaveButtonClicked = false;
            var isHref = false;

            $rootScope.onHomeNavigate = function (event) {
                if ($scope.showSaveConfirmDialogConfig && $state.current.name != "patient.visit") {
                    event.preventDefault();
                    $scope.targetUrl = event.currentTarget.getAttribute('href');
                    isHref = true;
                    $scope.confirmationPrompt(event);
                }
            };

            var stateChangeListener = $rootScope.$on("$stateChangeStart", function (event, toState, toParams) {
                if ($scope.showSaveConfirmDialogConfig && (toState.url == "/search" || toState.url == "/patient/new")) {
                    $scope.targetUrl = toState.name;
                    isHref = false;
                    $scope.confirmationPrompt(event, toState, toParams);
                }
            });

            $scope.confirmationPrompt = function (event, toState) {
                if (dontSaveButtonClicked === false) {
                    if (event) {
                        event.preventDefault();
                    }
                    ngDialog.openConfirm({template: "../common/ui-helper/views/saveConfirmation.html", scope: $scope});
                }
            };

            $scope.continueWithoutSaving = function () {
                ngDialog.close();
                dontSaveButtonClicked = true;
                if (isHref === true) {
                    $window.open($scope.targetUrl, '_self');
                } else {
                    $state.go($scope.targetUrl);
                }
            };

            $scope.cancelTransition = function () {
                ngDialog.close();
                delete $scope.targetUrl;
            };

            $scope.$on("$destroy", function () {
                stateChangeListener();
            });

            $scope.isAutoComplete = function (fieldName) {
                return !_.isEmpty(autoCompleteFields) ? autoCompleteFields.indexOf(fieldName) > -1 : false;
            };

            $scope.isReadOnly = function (fieldName) {
                var readOnlyPatientAttributes = ["HealthFacilityName", "TodaysDate", "RegistrantName", "UniqueArtNo", "TypeofPatient"];

                if (!$scope.patientLoaded) {
                    readOnlyPatientAttributes = [];
                }
                return readOnlyPatientAttributes.indexOf(fieldName) > -1 || false;
            };

            var showSections = function (sectionsToShow, allSections) {
                _.each(sectionsToShow, function (sectionName) {
                    allSections[sectionName].canShow = true;
                    allSections[sectionName].expand = true;
                });
            };

            var hideSections = function (sectionsToHide, allSections) {
                _.each(sectionsToHide, function (sectionName) {
                    allSections[sectionName].canShow = false;
                });
            };

            var executeRule = function (ruleFunction) {
                var attributesShowOrHideMap = ruleFunction($scope.patient);
                var patientAttributesSections = $rootScope.patientConfiguration.getPatientAttributesSections();
                showSections(attributesShowOrHideMap.show, patientAttributesSections);
                hideSections(attributesShowOrHideMap.hide, patientAttributesSections);
            };

            $scope.handleUpdate = function (attribute) {
                var ruleFunction = Bahmni.Registration.AttributesConditions.rules && Bahmni.Registration.AttributesConditions.rules[attribute];
                if (ruleFunction) {
                    executeRule(ruleFunction);
                }
                if (!$scope.patientLoaded && attribute === "TypeofPatient") {
                    if (personAttributes.length == 0) {
                        personAttributes = _.map($rootScope.patientConfiguration.attributeTypes, function (attribute) {
                            return attribute.name;
                        });
                    }
                    var personAttributeHasTypeofPatient = personAttributes.indexOf("TypeofPatient") !== -1;
                    var personAttributeTypeofPatient = personAttributeHasTypeofPatient
                        ? $rootScope.patientConfiguration.attributeTypes[personAttributes.indexOf("TypeofPatient")].name : undefined;
                    if (personAttributeTypeofPatient &&
                        $scope.patient[personAttributeTypeofPatient] && $scope.patient[personAttributeTypeofPatient].value === "Walk-In") {
                        for (var i = 0; i < personAttributes.length; ++i) {
                            var attrName = personAttributes[i];
                            if (attrName !== "TypeofPatient" && attrName !== "UniqueArtNo") {
                                var attrElement = angular.element(document.getElementById(attrName));
                                if (attrElement) {
                                    attrElement.attr('disabled', true);
                                }
                            } else if (attrName === "UniqueArtNo") {
                                var attrElement = angular.element(document.getElementById(attrName));
                                if (attrElement) {
                                    attrElement.attr('disabled', false);
                                }
                            }
                        }
                    } else if (personAttributeTypeofPatient &&
                        $scope.patient[personAttributeTypeofPatient] && $scope.patient[personAttributeTypeofPatient].value !== "Walk-In") {
                        for (var i = 0; i < personAttributes.length; ++i) {
                            var attrName = personAttributes[i];
                            if (attrName !== "TypeofPatient" && attrName !== "UniqueArtNo") {
                                var attrElement = angular.element(document.getElementById(attrName));
                                if (attrElement) {
                                    attrElement.attr('disabled', false);
                                }
                            } else if (attrName === "UniqueArtNo") {
                                var attrElement = angular.element(document.getElementById(attrName));
                                if (attrElement) {
                                    attrElement.attr('disabled', true);
                                }
                            }
                        }
                    }
                }
            };

            var executeShowOrHideRules = function () {
                _.each(Bahmni.Registration.AttributesConditions.rules, function (rule) {
                    executeRule(rule);
                });
            };

            var setReadOnlyFields = function () {
                if (personAttributes.length == 0) {
                    personAttributes = _.map($rootScope.patientConfiguration.attributeTypes, function (attribute) {
                        return attribute.name;
                    });
                }
                var personAttributeHasTypeofPatient = personAttributes.indexOf("TypeofPatient") !== -1;
                var personAttributeTypeofPatient = personAttributeHasTypeofPatient
                    ? $rootScope.patientConfiguration.attributeTypes[personAttributes.indexOf("TypeofPatient")].name : undefined;
                if (personAttributeTypeofPatient && $scope.patient[personAttributeTypeofPatient] &&
                        $scope.patient[personAttributeTypeofPatient].value === "Walk-In") {
                    for (var i = 0; i < personAttributes.length; i++) {
                        var attrName = personAttributes[i];
                        var attrElement = angular.element(document.getElementById(attrName));
                        if (attrElement) {
                            attrElement.attr('disabled', true);
                        }
                    }
                } else {
                    var readOnlyPatientAttributes = ["HealthFacilityName", "TodaysDate", "RegistrantName", "UniqueArtNo", "TypeofPatient"];
                    for (var i = 0; i < readOnlyPatientAttributes.length; i++) {
                        var attrName = readOnlyPatientAttributes[i];
                        var attrElement = angular.element(document.getElementById(attrName));
                        if (attrElement) {
                            attrElement.attr('disabled', true);
                        }
                    }
                }
            };

            $scope.$watch('patientLoaded', function () {
                if ($scope.patientLoaded) {
                    executeShowOrHideRules();
                    setReadOnlyFields();
                }
            });

            $scope.getAutoCompleteList = function (attributeName, query, type) {
                return patientAttributeService.search(attributeName, query, type);
            };

            $scope.getDataResults = function (data) {
                return data.results;
            };
        }]);

