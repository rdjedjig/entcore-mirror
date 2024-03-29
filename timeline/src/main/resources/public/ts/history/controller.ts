import {ui, http, idiom as lang, ng, skin, $, moment, model} from 'entcore';

export let historyController = ng.controller('HistoryController', ['$scope', 'model', function HistoryController($scope, model){
	$scope.notifications = [];
	$scope.notificationTypes = model.notificationTypes;
    $scope.registeredNotifications = model.registeredNotifications;
	$scope.translate = lang.translate;
	$scope.me = model.me;
	$scope.filtered = {};
	$scope.display = {};
	$scope.lightmode = (window as any).LIGHT_MODE;

	$scope.actions = {
		delete: {
			label: "timeline.action.delete.own",
			action: function(notification){
				notification.opened = false
				notification.delete().done(function(){
					$scope.notifications.remove(notification)
					$scope.$apply()
				})
			}
		}
	}
	$scope.toggleNotificationById=function(id:string, force:boolean){
		const notif = $scope.notifications.all.find(n=>n._id==id);
		notif && $scope.toggleNotification(notif,null,force)
	}
	$scope.toggleNotification=function(notification,$event, force:boolean=null){
		$event && $event.stopPropagation();
		if(force!=null){
			notification.opened = force;
		}else{
			notification.opened = !notification.opened;
		}
	}
	ui.extendSelector.touchEvents('div.notification')
	const  onBodyClick = (event) => {
		event.stopPropagation();
		$('.notification-actions.opened').each((key,value)=>{
			const id = $(value).closest(".notification").attr('data-notificationid');
			$scope.toggleNotificationById(id,false);
		})
		$scope.$apply();
	}
	var applySwipeEvent = function() {
	    $('div.notification').off('swipe-left');
		$('div.notification').off('swipe-right');
		$("body").off("click",onBodyClick)
	    $('div.notification').on('swipe-left', function(event) {
			const id = $(event.delegateTarget).attr('data-notificationid');
			$scope.toggleNotificationById(id,true);
	    })
		$('div.notification').on('swipe-right', function(event) {
			const id = $(event.delegateTarget).attr('data-notificationid');
			$scope.toggleNotificationById(id,false);
		})
		$('body').on('click', onBodyClick);
	}

	model.on('notifications.change, notificationTypes.change', function(e){
		applySwipeEvent()
		if(!$scope.$$phase){
			$scope.$apply('notifications');
			$scope.$apply('notificationTypes');
		}
	});

	lang.addBundle('/timeline/i18nNotifications', function(){
		$scope.notifications = model.notifications;
		$scope.$apply('notifications');
	});

	const loadThemeConf = async function(){
		await skin.listSkins();
		$scope.display.pickTheme = skin.pickSkin;
		$scope.$apply();
	}
	loadThemeConf();

	$scope.formatDate = function(dateString){
		return moment(dateString).calendar();
	};

	$scope.removeFilter = function(){
		if(model.notificationTypes.noFilter){
			model.notificationTypes.deselectAll();
		}
		model.notifications.sync();
	};

	$scope.allFilters = function(){
		if(model.notificationTypes.selection().length === model.notificationTypes.length()){
			model.notificationTypes.deselectAll();
		}else{
			model.notificationTypes.selectAll();
		}

		model.notifications.page = 0;
		model.notifications.lastPage = false;
		model.notifications.all= [];
		model.notifications.sync();
	};

	$scope.unactivesFilters = function(){
		var unactives = model.notificationTypes.length() - model.notificationTypes.selection().length;
		return unactives;
	}

	$scope.loadPage = function(){
		model.notifications.sync(true);
	}

	http().get('/userbook/api/person').done(function(data){
		model.me.email = data.result[0].email;
		$scope.$apply();
	})

	$scope.display = {};
    model.me.workflow.load(['zimbra']);
    $scope.hasWorkflowZimbraExpert = () => {
       return model.me.hasWorkflow('fr.openent.zimbra.controllers.ZimbraController|preauth');
    };
}]);
