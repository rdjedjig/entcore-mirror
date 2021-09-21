import { IAttributes, IController, IDirective, IScope } from "angular";
import { ConfigurationFrameworkFactory, IIdiom, IThemeDesc, IWidget, SessionFrameworkFactory, WidgetFrameworkFactory } from "ode-ts-client";
import * as $ from "jquery";
import { TimelineController } from "./timeline.directive";
import { ThemeHelperService } from "ode-ngjs-front";

/* Controller for the directive */
export class Controller implements IController {
	public skins:IThemeDesc[];
	public widgets:IWidget[];
	public languages:string[];
	public themeRoot:string;
	public safeApply:()=>void;

    constructor(
		public themeSvc:ThemeHelperService
		) {
		this.widgets = WidgetFrameworkFactory.instance().list;
    }
	showPanel:boolean = false;

	get languagePreference():string {
		return SessionFrameworkFactory.instance().session.currentLanguage;
	}

	canTogglePanel():boolean {
		const ww = $(window).width();
		return (typeof ww!=="number" || ww >= 992);
	}

	togglePanel($event) {
		this.showPanel = !this.showPanel;
	}

	isCurrentTheme( skin:IThemeDesc ): boolean {
		return ConfigurationFrameworkFactory.instance().Platform.theme.skinName == skin.displayName;
	}

	async saveTheme(skin:IThemeDesc, $event) {
		await this.themeSvc.setTheme( skin );
		this.safeApply && this.safeApply();
	}

	toggleWidget( widget:IWidget, $event) {
		if( ! widget.platformConf.mandatory ) {
			widget.userPref.show = !widget.userPref.show;
			WidgetFrameworkFactory.instance().saveUserPrefs();
    	}
	}

	getFlagUrlFor( language:string ):string {
		let lang = language.toLocaleLowerCase();
		// Map between language codes and their corresponding flags name.
		switch( lang ) {
			case "en": lang="gb"; break;
			default: break;
		}
		return `${this.themeRoot}/themes/neo/img/icons/flags/${lang}.svg`;
	}

	saveLang(language, $event) {
		ConfigurationFrameworkFactory.instance().User.saveLanguage( language ).then( () => {
			location.reload();
		});
	};

};

interface LocalScope extends IScope {
	lang?: IIdiom;
}

/* Directive */
class Directive implements IDirective<LocalScope,JQLite,IAttributes,IController[]> {
    restrict = 'E';
	replace = true;
	template = require("./timeline-settings.directive.html");
    scope = {
    };
	bindToController = true;
	controller = ["odeThemeHelperService", Controller];
	controllerAs = 'ctrl';
	require = ['timelineSettings', '^timeline'];

    async link(scope:LocalScope, elem:JQLite, attr:IAttributes, controllers:IController[]|undefined) {
        let ctrl:Controller|null = controllers ? controllers[0] as Controller : null;
        let timelineCtrl:TimelineController|null = controllers ? controllers[1] as TimelineController : null;
        if(!ctrl || !timelineCtrl) return;

		scope.lang = ConfigurationFrameworkFactory.instance().Platform.idiom;

		Promise.all([
			ConfigurationFrameworkFactory.instance().Platform.listLanguages(),
			ConfigurationFrameworkFactory.instance().Platform.theme.listThemes(),
			ctrl.themeSvc.getBootstrapThemePath()
		]).then( results => {
			ctrl.languages = results[0];
			ctrl.skins = results[1];
			ctrl.themeRoot = results[2];
			ctrl.safeApply = ( fn?: string | ((scope:IScope)=>any) ) => {
				const phase = scope.$root.$$phase;
				if (phase == '$apply' || phase == '$digest') {
					if (typeof (fn) === 'function') {
						fn(scope);
					}
				} else {
					scope.$apply(fn as string);
				}
			}
			scope.$apply();
		});

    }

}

/**
 * The timeline-settings directive.
 *
 * Usage:
 *   &lt;timeline-settings></timeline-settings&gt;
 */
export function DirectiveFactory() {
	return new Directive();
}
