import { IScope } from 'angular';
import { APP, ConfigurationFrameworkFactory, IIdiom, IUserInfo, SessionFrameworkFactory } from 'ode-ts-client';

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
		const platformConf = ConfigurationFrameworkFactory.instance().Platform;
		this.$scope.me = SessionFrameworkFactory.instance().session.user;
		this.$scope.lang = platformConf.idiom;
		this.$scope.lightmode = (window as any).LIGHT_MODE;
		this.$scope.hasWorkflowZimbraExpert = () => {
			return SessionFrameworkFactory.instance().session.hasWorkflow('fr.openent.zimbra.controllers.ZimbraController|preauth');
		};
		
		await Promise.all([
			platformConf.apps.initialize(APP.TIMELINE),
			platformConf.theme.listSkins()
		])
		
		this.$scope.display = {
			pickTheme: (platformConf.theme.skins.length > 1),
			confirmReport: false
		};
	}

	closePanel() {
		this.$rootScope.$broadcast('close-panel');
	}
};
