'use strict';

app.controller('planController', [
    '$rootScope',
    '$scope',
    'planRepositoryService',
    'planDocumentService',
    '$cookieStore',
    '$resource',
    '$stateParams',
    'appSettings',
    'insights',
    '$location',
    '$timeout',
    '$window',
    '$http',
    '$q',
    '$anchorScroll',
    'getPlanType',
    'planTypeDataService',
	'hraService',
	'localStorageService',
    'getPlan',
    'getSpendingLimitsAndTierTitles',
    'getCopays',
    'getUserMessges',
	'jsonDataService',
	'dateHelperService',
    '$translate',
    function ($rootScope, $scope, planRepositoryService, planDocumentService, $cookieStore, $resource, $stateParams, appSettings, insights,
                          $location, $timeout, $window, $http, $q, $anchorScroll, getPlanType, planTypeDataService, hraService, localStorageService,
                          getPlan, getSpendingLimitsAndTierTitles, getCopays, getUserMessages, jsonDataService, dateHelperService, $translate) {
	// insights.logEvent('Hello World from Plan Controller');

    	var isFromLoginPage = $stateParams.showUserMessage;

    	if ($rootScope.configBools) {
    		this.showBankOfAmericaNewUI = $rootScope.configBools.showBankOfAmericaNewPaymentUI;
    	}
    	else {
    		this.showBankOfAmericaNewUI = false;
    	}

    	this.member = $rootScope.portalValues.member;
    	this.contract = $rootScope.portalValues.contract;

	    this.member.effectiveDate = dateHelperService.ymdToDate(this.member.ymdEffectiveDate);
	    this.member.firstEffectiveDate = dateHelperService.ymdToDate(this.member.ymdFirstEffectiveDate);
	    this.member.endDate = dateHelperService.ymdToDate(this.member.ymdEndDate);
	    
	    if (!this.member.isActive) return;

	    if (this.member.isMedicarePlan && this.contract.hasDental) {
	        this.medicalContractDescription = $translate('Medical_and_Dental');// 'Medical and Dental';
	    } else {
	        this.medicalContractDescription = $translate('Medical'); //'Medical';
	    }

    	$scope.$on('$viewContentLoaded', function () {
    		$timeout(function () {
    			if ($scope.userMessages.userMessages.length > 0 && isFromLoginPage)
    				$('#user-message').modal('show');
    		}, 500);

    		$timeout(function () {
    			if ($('.my-plan-copayments ul li:visible').length < 2) {
    				$('.my-plan-copayments ul li:visible').addClass('hidePointer');
    			} else {
    				$('.my-plan-copayments ul li').removeClass('hidePointer');
    			}
    		}, 100);

    		$("#dialog-confirm").dialog({
    		    autoOpen: false,
    		    resizable: false,
    		    height: 140,
    		    modal: true,
    		    buttons: {
    		        "Delete": function () {
		                $rootScope.$broadcast('deleteItemForTranslation');
    		            $(this).dialog("close");
    		        },
    		        Cancel: function () {
    		            $(this).dialog("close");
    		        }
    		    }
    		});
    	});

    	var setPlanInfo = function (data) {
    		$scope.plan = data;

    		var medicalAmountDue = getDollarCentPart(data.medicalAmountDue);
    		var supplementalAmountdue = getDollarCentPart(data.supplementalAmountDue);
    		$cookieStore.put('isMemberAnEmployee', data.isMemberAnEmployee);
    		$scope.plan.medicalPaymentTitle = "Medical Amount Due $" + medicalAmountDue.dollar + medicalAmountDue.cent;
    		$scope.plan.supplementalPaymentTitle = "Supplemental Amount Due $" + supplementalAmountdue.dollar + supplementalAmountdue.cent;
    		$scope.showAdditionalCoverage = function () {
    			return ($scope.plan.showDentalandLife && !$scope.plan.isMemberAnEmployee) && ($scope.plan.hasDental || $scope.plan.hasLife);
    		}
    		/*Uncomment this comment block to test additional coverage..
            $scope.showAdditionalCoverage = function () {
                return true;
                }
            $scope.plan.showDentalandLife = true;
            $scope.plan.hasDental = true;
            $scope.plan.hasLife = true;*/
    		if (data.hasDental === true) {
    			$cookieStore.put('dentalGroupNumber', isEmpty(data.dentalGroupNumber));
    			$cookieStore.put('supplementalContractNumber', isEmpty(data.supplementalContractNumber));

    		};
    		if (data.hasLife === true) {
    			// $cookieStore.put('groupNumber', isEmpty(data.groupNumber));
    		};
    		console.log('formatted medical and supplemental payment titles');
    	};

    	setPlanInfo(getPlan);

    	$scope.userMessages = getUserMessages;

    	$scope.spendingLimits = getSpendingLimitsAndTierTitles;
    	$scope.tierTitles = getSpendingLimitsAndTierTitles.titles;

    	$scope.copays = function () {
    		for (var copayPropertyName in getCopays) {
    			if (getCopays.hasOwnProperty(copayPropertyName)) {
    				for (var subPropertyName in getCopays[copayPropertyName]) {
    					if (getCopays[copayPropertyName][subPropertyName] && getCopays[copayPropertyName][subPropertyName] !== '') {
    						return getCopays;
    					}
    				}
    			}
    		}

    		return null;
    	}();

    	planTypeDataService.benefitPackage = getPlanType.benefitPackage;
    	planTypeDataService.contractNumber = getPlanType.contractNumber;
    	planTypeDataService.effectiveDate = getPlanType.effectiveDate;
    	planTypeDataService.groupNumber = getPlanType.groupNumber;
    	planTypeDataService.memberName = getPlanType.memberName;
    	planTypeDataService.memberNumber = getPlanType.memberNumber;
    	planTypeDataService.planName = getPlanType.planName;
    	planTypeDataService.programNumber = getPlanType.programNumber;
    	planTypeDataService.isFutureDatedPlan = getPlanType.isFutureDatedPlan;
    	planTypeDataService.isMedicarePlan = getPlanType.isMedicarePlan;

    	$rootScope.planTypeInfo = planTypeDataService;

    	$scope.planTypeDone = false;
    	$scope.coveredMembersListDone = false;
    	$scope.copaysDone = false;
    	$scope.memberNumber = 0;
    	$scope.hraHasError = false;

    	$scope.updateSpinner = function () {
    		$rootScope.showSpinner = !($scope.planTypeDone || $scope.coveredMembersListDone || $scope.copaysDone);
    	}

    	//////////////////////////////////////////////////////////
    	// Scoped methods
    	$scope.infoButtonPopup = function () {
    		alert('Required minimums have been met!');
    	};

    	$scope.copayTab_1_Exists = $scope.plan != undefined
                       && $scope.tierTitles != undefined
                       && $scope.tierTitles['tier1'] != undefined
                       && $scope.tierTitles['tier1'] != 'N/A';

    	$scope.copayTabExists = function (tab) {
    		var results = $scope.plan != undefined
                       && $scope.tierTitles != undefined
                       && $scope.tierTitles['tier' + tab] != undefined
                       && $scope.tierTitles['tier' + tab] != 'N/A';
    		return results;
    	};

    	$scope.showRidersExpanded = function () {
    		if ($("#rider-additional-info").next("div.collapsible-content").hasClass("collapsible-content-collapsed")) {
    			$("#rider-additional-info>a.collapsible-heading-toggle").trigger('tap');
    		}
    		//$anchorScroll.yOffset = 120;
    		//$anchorScroll("rider-additional-info");

    		$('html, body').animate({
    			scrollTop: $("#rider-additional-info").offset().top - 120
    		}, 1000);
    	};

    	$scope.loggedInMember = function () {
    		var loggedInMember = null;

    		if ($scope.planTypeDone && $scope.coveredMembersListDone) {
    			for (var i = 0; i < $scope.coveredMembersList.length; i++) {
    				if ($scope.coveredMembersList[i].memberNumber == $scope.planType.memberNumber) {
    					loggedInMember = $scope.coveredMembersList[i];
    					$scope.memberNumber = loggedInMember.memberNumber;
    					break;
    				}
    			}
    		}

    		return loggedInMember;
    	};

    	$scope.onSelectedMemberChange = function () {

    		// if we're not on mobile, get out
    		if (Modernizr.mq('(min-width: 768px)')) return;

    		// expand any collapsed individual deductible charts
    		$('.spending-plan-individual-container h3.collapsible-heading-collapsed .collapsible-heading-toggle').trigger('expand');
    	};

    	// End of Scoped methods
    	//////////////////////////////////////////////////////////

    	//////////////////////////////////////////////////////////
    	// INIT:  load view model
    	$rootScope.showSpinner = true;

    	// JTK - DO NOT ADD ANY WEB API CALLS UNTIL BELOW
    	// I WANT THE ONES FOR ABOVE THE FOLD TO FIRE OFF FIRST
    	$scope.planType = getPlanType;
    	$scope.planTypeDone = true;
    	$scope.updateSpinner();

    	//planRepositoryService.planType.get(function (planType) {
    	//    console.log('fetched planType ');
    	//    $scope.planType = planType;
    	//    $scope.planTypeDone = true;
    	//    $scope.updateSpinner();
    	//});

    	//planRepositoryService.spendingLimitsAndTierTitles.get(function (data) {
    	//    console.log('1. fetched spending limits and tier titles');
    	//    $scope.spendingLimits = data;
    	//    $scope.tierTitles = data.titles;

    	//    // copay tabs need tierTitles
    	//    //planRepositoryService.copays.get(function (copays) {
    	//    //    console.log('2. fetched copays');
    	//    //    $scope.copays = copays;
    	//    //    $scope.copaysDone = true;
    	//    //    $scope.updateSpinner();
    	//    //});
    	//});

    	planRepositoryService.coveredMembersList.list(function (coveredMembersList) {
    		console.log('fetched coveredMembers list');

    		$scope.coveredMembersList = [];
    		//Sorting the list by member number and then that list I'm only taking distinct covered members
    		_.each(_.sortBy(coveredMembersList, 'memberNumber'), function (coveredMember) {
    			if (_.where($scope.coveredMembersList, { memberNumber: coveredMember.memberNumber }).length === 0) {
    				$scope.coveredMembersList.push(coveredMember);
    			}
    		});

    		// select is initialized to the subscribing member
    		$scope.selectedMember = $scope.coveredMembersList[0];

    		$scope.coveredMembersListDone = true;
    		$scope.updateSpinner();
    	});

    	//Checking each tier to see if it has 200%ANLPREM which will need to be calculated
    	var checkForLimitCalculation = function (tierObj, monthlyPremium) {
    		for (var propertyName in tierObj) {

    			if (tierObj[propertyName] === '200%ANLPREM') {
    				if (monthlyPremium === 0) {
    					tierObj[propertyName] = undefined;
    				} else {
    					tierObj[propertyName] = '$' + (monthlyPremium * 24).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,') + ' (200% Annual Premium)';
    				}

    			}
    		}
    	}

    	// JTK - you can start adding webapi calls here
    	planRepositoryService.coveredMembers.get(function (coveredMembers) {
    		console.log('fetched coveredMembers');
    		$scope.coveredMembers = coveredMembers;
    		$scope.selectedMember = $scope.coveredMembers[0];
    		$scope.contractIsSubscriberOnly = $scope.coveredMembers.length <= 1;

    		_.each($scope.coveredMembers, function (coveredMember) {
    			checkForLimitCalculation(coveredMember.spendingLimits.deductible, coveredMember.indvidualMonthlyPremium);
    			checkForLimitCalculation(coveredMember.spendingLimits.outOfPocketMax, coveredMember.indvidualMonthlyPremium);
    		});

    		checkForLimitCalculation($scope.spendingLimits.deductible, $scope.selectedMember.contractMonthlyPremium);
    		checkForLimitCalculation($scope.spendingLimits.outOfPocketMax, $scope.selectedMember.contractMonthlyPremium);

    		// Note: This is not directly related to fetching the covered members data, but this 
    		// event needs to be fired after the data is loaded so the dropdown can get the right style

    		// THIS EVENT MAKES THE COMBO BOXES WORK, DON'T REMOVE - JTK
    		$timeout(function () { $scope.$emit('swhp.selectability.dataHandled'); });
    		// THIS EVENT MAKES THE +/- EXPAND SECTIONS WORK, DON'T REMOVE - JTK
    		$timeout(function () { $scope.$broadcast('swhp.collapsible.dataHandled'); });
    		//$timeout(function () { $scope.$emit('swhp.collapsible.dataHandled'); });

    	});

    	planRepositoryService.categorizedBenefits.get(function (data) {
    		console.log('fetched categorizedbenefits');
    		$scope.tierCols = 1;
    		var tier2 = [];
    		var tier3 = [];

    		for (var i = 0; i < data.benefits.length; i++) {
    			tier2 = $.grep(data.benefits[i].items, function (item) {
    				return item.extendedNetworkCostShare != null && item.extendedNetworkCostShare.trim() !== "";
    			});
    			if (tier2.length > 0) {
    				break;
    			}
    		}

    		for (var i = 0; i < data.benefits.length; i++) {
    			tier3 = $.grep(data.benefits[i].items, function (item) {
    				return item.outOfNetworkCostShare != null;
    			});
    			if (tier3.length > 0) {
    				break;
    			}
    		}

    		if (tier2.length > 0 && tier3.length > 0) {
    			$scope.tierCols = 3;
    		} else if (tier2.length > 0 && tier3.length === 0) {
    			$scope.tierCols = 2;
    		}

    		var itemsCount = data.benefits.length;
    		var leftSideCount = Math.floor(itemsCount / 2);
    		leftSideCount += itemsCount % 2;

    		data.leftSideItems = loadEocColumn(data.benefits, 0, leftSideCount);
    		//data.leftSideItems.tierCount = tierCols;
    		data.rightSideItems = loadEocColumn(data.benefits, leftSideCount, itemsCount - leftSideCount);
    		//data.rightSideItems.tierCount = tierCols;

    		$scope.categorizedBenefits = data;
    	});

    	//planRepositoryService.plan.get(function (data) {
    	//    $scope.plan = data;

    	//    var medicalAmountDue = getDollarCentPart(data.medicalAmountDue);
    	//    var supplementalAmountdue = getDollarCentPart(data.supplementalAmountDue);
    	//    $cookieStore.put('isMemberAnEmployee', data.isMemberAnEmployee);
    	//    $scope.plan.medicalPaymentTitle = "Medical Amount Due $" + medicalAmountDue.dollar + medicalAmountDue.cent;
    	//    $scope.plan.supplementalPaymentTitle = "Supplemental Amount Due $" + supplementalAmountdue.dollar + supplementalAmountdue.cent;
    	//    $scope.showAdditionalCoverage = function () {
    	//        return ($scope.plan.showDentalandLife && !$scope.plan.isMemberAnEmployee) && ($scope.plan.hasDental || $scope.plan.hasLife);
    	//    }
    	//    /*Uncomment this comment block to test additional coverage..
    	//    $scope.showAdditionalCoverage = function () {
    	//        return true;
    	//        }
    	//    $scope.plan.showDentalandLife = true;
    	//    $scope.plan.hasDental = true;
    	//    $scope.plan.hasLife = true;*/
    	//    if (data.hasDental === true) {
    	//        $cookieStore.put('dentalGroupNumber', isEmpty(data.dentalGroupNumber));
    	//        $cookieStore.put('supplementalContractNumber', isEmpty(data.supplementalContractNumber));

    	//    };
    	//    if (data.hasLife === true) {
    	//       // $cookieStore.put('groupNumber', isEmpty(data.groupNumber));
    	//    };
    	//    console.log('formatted medical and supplemental payment titles');
    	//});

    	planRepositoryService.spendingPositions.get(function (data) {
    		console.log('fetched spendingPositions');
    		$scope.spendingPositions = data;
    	});

    	//var onError = function () {
    	//    //$rootScope.showSpinner = false;
    	//    //alert('Cannot get plan document');
    	//}
    	//var onSuccess = function () {
    	//    //$rootScope.showSpinner = false;
    	//}

    	// PlanDocumentController -> PlanDocumentService -> PlanDocumentRepository.GetExchangeSbc -> db.GetBenefitPackageByMemberId
    	//planRepositoryService.exchangeSbc.get(function (results) {
    	//	//$rootScope.showSpinner = true;
    	//	$scope.showPlanDocuments = results.showPlanDocuments;
    	//	$scope.summaryOfBenefitsAndCoverageUrl = results.summaryOfBenefitsAndCoverageUrl;
    	//	$scope.evidenceOfCoverageUrl = results.evidenceOfCoverageUrl;
    	//	$scope.newMemberHandbookUrl = results.newMemberHandbookUrl;
    	//	$scope.formularyDrugListUrl = results.formularyDrugListUrl;
    	//});

        // Plan Documents
    	$scope.planDocumentDp = {

    	    getAllForMember: function () {

    	        return $q(function (resolve, reject) {

    	            planRepositoryService.planDocument.getAllForMember(null,
                        function (result) {
                            resolve(result);
                        },
                        function (result) {
                            reject(result);
                        });
    	        });
    	    },

    	    download: function (data) {

    	        return $q(function (resolve, reject) {

    	            planDocumentService.planDocument.download(data,
                        function (result) {
                            resolve(result);
                        },
                        function (result) {
                            vm.onWebApiError();
                            reject(result);
                        });
    	        });
    	    }
    	};

    	$scope.showPlanDocuments = true;

        $scope.documentList = [];

        $scope.planDocumentDp.getAllForMember().then(
            function (result) {
                $scope.documentList = result.documents;
            },
            function (result) {

            });

        $scope.onViewDocumentCommand = function (id) {

            $rootScope.showSpinner = true;
            //debugger;
            //planDocumentService.planDocument.download({ id: id }, function(result) {
            //    debugger;
            //        $rootScope.showSpinner = false;

            //        if (result.$status != 204) { // 204 - httpStatusCode.NoContent
            //            if (navigator.userAgent.toLowerCase().indexOf('chrome') <= -1) {
            //                window.navigator.msSaveOrOpenBlob(result.blob, result.fileName);
            //            } else {
            //                var fileURL = URL.createObjectURL(result.blob);
            //                window.open(fileURL, '_blank');
            //            }
            //        } else {
            //            // alert("This document contains no data.");
            //        }
            //});
            $scope.planDocumentDp.download({ id: id }).then(
                function (result) {
                    $rootScope.showSpinner = false;

                    if (result.$status != 204) { // 204 - httpStatusCode.NoContent
                        if (navigator.userAgent.toLowerCase().indexOf('chrome') <= -1) {
                            window.navigator.msSaveOrOpenBlob(result.blob, result.fileName);
                        } else {
                            var fileURL = URL.createObjectURL(result.blob);
                            window.open(fileURL, '_blank');
                        }
                    } else {
                        // alert("This document contains no data.");
                    }
                },
                function () {

                    $rootScope.showSpinner = false;

                    // alert("There was a error downloading the document. Please try again.");
                });
        }

    	hraService.getAllHraInfo().then(function (results) {
    		var hraInfo = results.data;
    		var showHra = hraInfo.showHra && !hraInfo.hasError;

    		$scope.hraHasError = hraInfo.hasError;
    		$scope.showHra = showHra;

    		if (hraInfo.hasError) {
    			console.log("Success callback called with error: " + hraInfo.errorMessage);
    		}

    		if (showHra) {
    			var availableBalance = 0;
    			var maxAsOfDate = new Date(2000, 1, 1);

    			localStorageService.set('hraInfo', hraInfo);

    			_.each(hraInfo.planAccounts, function (planAccount) {
    				var planAccountAsOfDate = new Date(planAccount.asOfDate);
    				if (planAccountAsOfDate > maxAsOfDate) {
    					availableBalance = planAccount.availableBalance;
    					maxAsOfDate = planAccountAsOfDate;
    				}
    			});

    			$scope.availableBalance = getDollarCentPart(availableBalance);
    		}

    	}, function (error) {
    		//Error
    		$scope.plan.showHra = false;
    		$scope.plan.hraHasError = true;
    		console.log("Error callback called with error: " + JSON.stringify(error));
    	});
        
    	$cookieStore.remove('supplementalContractNumber');
    	$cookieStore.remove('dentalGroupNumber');

    	////////////////////////////////////////////////////////////////
    	// End of INIT

    	////////////////////////////////////////////////////////////////
    	// Local methods
    	function loadEocColumn(benefits, startIndex, itemLimit) {
    		var items = new Array();
    		for (var itemIndex = 0; itemIndex < itemLimit; itemIndex++) {
    			items.push(benefits[startIndex + itemIndex]);
    		}
    		return items;
    	}

    	// Money Formatting 
    	function getDollarCentPart(money) {
    		var dollarPart = "";
    		var centPart = "";
    		if (money || money == 0) {
    			var array = money.toString().split(".");
    			dollarPart = array[0];
    			centPart = array.length > 1 ? array[1] : "00";
    			centPart = String(centPart + "00").slice(0, 2);
    		}
    		return {
    			amount: money,
    			dollar: parseInt(dollarPart),
    			cent: "." + centPart
    		};
    	};
    	function isEmpty(value) {
    		if (value == null || value === '') {
    			return "N/A";
    		} else {
    			return value;
    		}
    	};
    }]);
