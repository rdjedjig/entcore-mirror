import { ConfigurationFrameworkFactory, IIdiom, IUserInfo, SessionFrameworkFactory } from 'ode-ts-client';

export class AppController {
	me: IUserInfo;
	currentLanguage: string;
	lang: IIdiom;
	lightmode: string;

	constructor(){
		this.initialize();
	}

	private async initialize():Promise<void> {
		const platformConf = ConfigurationFrameworkFactory.instance().Platform;
		this.me = SessionFrameworkFactory.instance().session.user;
		this.currentLanguage = SessionFrameworkFactory.instance().session.currentLanguage;
		this.lang = platformConf.idiom;
		this.lightmode = (window as any).LIGHT_MODE;
	}

	public toggleContainer( ev:UIEvent, containerId:string ) {
		$(".list-trigger .trigger").removeClass('on');
		$(ev.currentTarget).addClass('on');
		let classFocus = 'focus-' + containerId;
		$('.container-advanced').attr('class', 'container-advanced ' + classFocus);
	}

};
