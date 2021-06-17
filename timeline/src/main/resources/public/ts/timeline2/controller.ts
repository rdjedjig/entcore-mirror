import { IScope } from 'angular';
import { ConfigurationFrameworkFactory, IIdiom, IUserInfo, SessionFrameworkFactory } from 'ode-ts-client';

interface AppScope extends IScope {
	me: IUserInfo;
	lang: IIdiom;
	lightmode: string;
	hasWorkflowZimbraExpert: ()=>boolean;
	display:{
		confirmReport?:boolean;
		pickTheme?:boolean;
	};
}

export class AppController {
	constructor(
			private $rootScope:IScope,
			private $scope:AppScope 
		){
		this.initialize();
	}

	private async initialize():Promise<void> {
		// FIXME
		// template.open('main', 'main');
		// template.open('settings', 'settings');
		// template.open('notifications', 'notifications');
		// template.open('notifspanel', 'notifspanel');
		//this.$scope.template = template;
		this.$scope.me = SessionFrameworkFactory.instance().session.user;
		this.$scope.lang = ConfigurationFrameworkFactory.instance().Platform.idiom;
		this.$scope.lightmode = (window as any).LIGHT_MODE;
		this.$scope.hasWorkflowZimbraExpert = () => {
			return SessionFrameworkFactory.instance().session.hasWorkflow('fr.openent.zimbra.controllers.ZimbraController|preauth');
		};
		await ConfigurationFrameworkFactory.instance().Platform.theme.listSkins();
		this.$scope.display = {
			pickTheme: (ConfigurationFrameworkFactory.instance().Platform.theme.skins.length > 1),
			confirmReport: false
		};
	}

	closePanel() {
		this.$rootScope.$broadcast('close-panel');
	}
};

/*

export let flashMessagesController = ng.controller('FlashMessages', ['$scope', 'model', ($scope, model) => {
	$scope.currentLanguage = currentLanguage
    $scope.messages = model.flashMessages

    $scope.markMessage = function(message){
        message.markAsRead().done(function(){
            $scope.messages.sync()
            $scope.messages.one('sync', $scope.$apply)
        })
    }
}]);
*/