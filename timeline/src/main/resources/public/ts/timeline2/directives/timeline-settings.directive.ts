import { IAttributes, IController, IDirective, IScope } from "angular";
import moment = require("moment");
import  gsap = require("gsap");
import { ConfigurationFrameworkFactory, IIdiom, IThemeDesc, IWidget, SessionFrameworkFactory, WidgetFrameworkFactory, WIDGET_NAME } from "ode-ts-client";
import * as $ from "jquery";
import { TimelineController } from "./timeline.directive";
import { ThemeHelperService } from "ode-ngjs-front";

/* Controller for the directive */
export class Controller implements IController {
	public skins:IThemeDesc[];
	public widgets:IWidget[];
	public languages:string[];

    constructor( 
		private themeSvc:ThemeHelperService
		) {
		this.widgets = WidgetFrameworkFactory.instance().list;
    }
	showPanel:boolean = false;

	get languagePreference():string {
		return SessionFrameworkFactory.instance().session.currentLanguage;
	}

	togglePanel($event) {
		this.showPanel = !this.showPanel;
	}

	saveTheme(skin:IThemeDesc, $event) {
		ConfigurationFrameworkFactory.instance().Platform.theme.setDefaultTheme( skin );
		this.themeSvc.applyStyle( skin.path );
	}

	toggleWidget( widget:IWidget, $event) {
		if( ! widget.platformConf.mandatory ) {
			widget.userPref.show = !widget.userPref.show;
			WidgetFrameworkFactory.instance().saveUserPrefs();
    	}
	}

	getWidgetIconClass( widget:IWidget ) {
		switch( widget.platformConf.name ) {
			case WIDGET_NAME.BOOKMARK:		return "ic-signets";
			case WIDGET_NAME.CARNET:		return "ic-carnet-de-bord";
			case WIDGET_NAME.LAST_INFOS:	return "ic-app actualites";
			case WIDGET_NAME.MY_APPS:		return "ic-apps";
			case WIDGET_NAME.RECORD:		return "ic-microphone";
			case WIDGET_NAME.RSS:			return "ic-rss";
			// TODO list all classes or use another naming convention in ode-bootstrap
			// case WIDGET_NAME.AGENDA:		return "ic-";
			// case WIDGET_NAME.BIRTHDAY:		return "ic-";
			// case WIDGET_NAME.CALENDAR:		return "ic-";
			// case WIDGET_NAME.CURSUS:		return "ic-";
			// case WIDGET_NAME.MAXICOURS:		return "ic-";
			// case WIDGET_NAME.MOOD:			return "ic-";
			// case WIDGET_NAME.NOTES:			return "ic-";
			// case WIDGET_NAME.QWANT:			return "ic-";
			// case WIDGET_NAME.QWANT_JUNIOR:	return "ic-";
			default:	return "ic-app";
		}
	}

	saveLang(language, $event){
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
			ConfigurationFrameworkFactory.instance().Platform.theme.listThemes()
		]).then( results => {
			ctrl.languages = results[0];
			ctrl.skins = results[1];
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

/*
export let personalizationController = ng.controller('Personalization', ['$rootScope', '$scope', 'model', ($rootScope, $scope, model) => {

	$scope.display = {};

	$scope.showNotifs = function() {
		$scope.dispaly.showNotifsPanel = true;
	};

	$scope.hideNotifs = function() {
		$scope.dispaly.showNotifsPanel = false;
	};

	$('lightbox[show="display.showNotifsPanel"]').on('click', function(event){
		event.stopPropagation()
	});

	$rootScope.$on('close-panel', function(e){
		$scope.showPanel = false;
	})
}]);
*/