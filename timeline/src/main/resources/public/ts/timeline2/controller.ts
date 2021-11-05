import { IIdiom, IUserInfo } from 'ode-ts-client';
import { session, conf } from 'ode-ngjs-front';

export class AppController {
	me: IUserInfo;
	currentLanguage: string;
	lang: IIdiom;

	constructor(){
		this.initialize();
	}

	private async initialize():Promise<void> {
		const platformConf = conf().Platform;
		this.me = session().user;
		this.currentLanguage = session().currentLanguage;
		this.lang = platformConf.idiom;
	}

	public toggleContainer( ev:UIEvent, containerId:string ) {
		$(".list-trigger .trigger").removeClass('on');
		$(ev.currentTarget).addClass('on');
		let classFocus = 'focus-' + containerId;
		$('.container-advanced').attr('class', 'container-advanced ' + classFocus);
	}

};
