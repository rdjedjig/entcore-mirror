import { IAttributes, IController, IDirective, IScope } from "angular";
import { L10n } from "ode-ngjs-front";
import  gsap = require("gsap");
import { ConfigurationFrameworkFactory, ITimelineFactory, ITimelineNotification, NotificationModel, SessionFrameworkFactory, TransportFrameworkFactory } from "ode-ts-client";
import * as $ from "jquery";

/* Controller for the directive */
export class TimelineController implements IController {
    private me = SessionFrameworkFactory.instance().session.user;
	public lang =  ConfigurationFrameworkFactory.instance().Platform.idiom;

	public savePrefsAndReload: () => Promise<void>;
	public handleLoadPageClick: (force: boolean) => Promise<void>;

    constructor() {
        if (this.userStructures && this.userStructures.length == 1) {
            this.userStructure = this.userStructures[0];
        }
    }

    app = ITimelineFactory.createInstance();

	selectedFilter = {};	// ng-model for filters chip.

	config = {
		hideAdminv1Link: false
	};
    userStructure = null;
	userStructures = this.me.structures;

	get isAdml() {
		return this.me.functions && this.me.functions.ADMIN_LOCAL && this.me.functions.ADMIN_LOCAL.scope;
	}

	get isAdmc() {
		return this.me.functions && this.me.functions.SUPER_ADMIN && this.me.functions.SUPER_ADMIN.scope;
	}

	showAdminv1Link() {
		return !this.config.hideAdminv1Link;
	}

	showAdminv2HomeLink() {
		return !this.showAdminv1Link() && this.userStructures && this.userStructures.length > 1;
	}

	showAdminv2AlertsLink() {
		return !this.showAdminv1Link() && this.userStructures && this.userStructures.length == 1;
	}

	public async initialize() {
		const admx:Promise<any> = (this.isAdml || this.isAdmc)
		// get platform config about admin version to create admin (v1 or v2) link for report notification
		? TransportFrameworkFactory.instance().http
			.get('/admin/api/platform/config')
			.then(res => {
				this.config.hideAdminv1Link = res['hide-adminv1-link'];
			})
		: Promise.resolve();

		await Promise.all([
			this.app.initialize(),
			admx
		]);
	}

	public isAllSelected:boolean = false;	// ng-model for the "Select All / none" chip

	public get canDiscard():boolean {
		return SessionFrameworkFactory.instance().session.hasWorkflow("org.entcore.timeline.controllers.TimelineController|discardNotification");
	}
	public doDiscard( notif:ITimelineNotification ) {
		if( this.canDiscard ) {
			const idx = this.app.notifications.findIndex( n => n._id===notif._id );
			if( idx >= 0 ) {
				this.app.notifications.splice( idx, 1 );
				notif.discard();
			}
		}
	}

	display:{
		confirmReport:boolean;
	} = {
		confirmReport: false
	};
	currentNotification:ITimelineNotification;

	public canReport( notif:ITimelineNotification ):boolean {
		return notif.model.sender && SessionFrameworkFactory.instance().session.hasWorkflow("org.entcore.timeline.controllers.TimelineController|reportNotification");
	}
	public confirmReport( notif:ITimelineNotification ) {
		if( this.canReport(notif) ) {
			this.currentNotification = notif;
			this.display.confirmReport = true;
		}
	}
	public doReport() {
		this.currentNotification.report().then( () => {
			this.currentNotification.model.reported = true;
			this.currentNotification = null;
		});
	}

/*
	actions = {
		discard = {
			label: "timeline.action.discard",
			action: (notification) => {
				notification.opened = false
				notification.discard().done(function() {
					notifications.remove(notification)
					$scope.$apply()
				})
			},
			condition: () => {
				return this.me.workflow.timeline.discardNotification
			}
		} as Action,
		report: {
			label: "timeline.action.report",
			doneProperty: 'reported',
			doneLabel: 'timeline.action.reported',
			action: function(notification) {
				$scope.display.confirmReport = true;
				$scope.doReport(notif) {
					notification.report().done(function() {
						notification.reported = true
						$scope.$apply()
					})
				}
			},
			condition: function(notif) {
				return notif.sender && model.me.workflow.timeline.reportNotification
			}
		}  as Action
	}
	showActions(notif) {
		return Object.values( this.actions ).filter( (act:Action) => act.condition(notif) );
	}
	toggleNotificationById(id:string, force:boolean){
		const notif = this.app.notifications.all.find(n=>n._id==id);
		notif && this.toggleNotification(notif,null,force);
	}
	toggleNotification(notification, $event, force:boolean=null){
		$event && $event.stopPropagation();
        notification.opened = (force!=null) ? force : !notification.opened;
	}
*/

    /* FIXME mobile swipe events
	ui.extendSelector.touchEvents('div.notification')
	const  onBodyClick = (event) => {
		event.stopPropagation();
		$('.notification-actions.opened').each((key,value)=>{
			const id = $(value).closest(".notification").attr('data-notificationid');
			this.toggleNotificationById(id,false);
		})
		$scope.$apply();
	}
	var applySwipeEvent() {
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
    */

	public lightmode: boolean = false;
	public isCache:boolean = false;

	showSeeMore() {
		if(this.app.isLoading){
			return false;
		}
		return this.app.hasMorePage;
	}

	showSeeMoreOnEmpty() {
		try{
			if(this.app.isLoading){
				return false;
			}
			return this.isCache && this.app.page===0 && this.app.notifications.length===0 && !this.app.hasMorePage;
		} catch(e){
			return false;
		}
	}

	noResultsWithFilters():boolean {
		return this.app.notifications
			&& this.app.notifications.length === 0 
			&& this.app.selectedNotificationTypes.length < this.app.notificationTypes.length
			&& this.app.selectedNotificationTypes.length > 0;
	}

	loadPage( force?:boolean ): Promise<void> {
		return this.app.loadNotifications( force );
	}

/*

	unactivesFilters(){
		var unactives = model.notificationTypes.length() - model.notificationTypes.selection().length;
		return unactives;
	}

*/
	private updateSelectAllChip() {
		this.isAllSelected = this.areAllFiltersOn();
	}

	initFilters() {
		this.app.notificationTypes.forEach( type => {
			this.selectedFilter[type] = false;
		});
		this.app.selectedNotificationTypes.forEach( type => {
			this.selectedFilter[type] = true;
		});
		this.updateSelectAllChip();
	}

	switchFilter( type:string ) {
		const isSelected = this.selectedFilter[type]; // has just been updated by ng-model
		const savedIndex = this.app.selectedNotificationTypes.findIndex( t=>t===type );
		if( isSelected && savedIndex===-1 ) {
			this.app.selectedNotificationTypes.push( type );
			this.savePrefsAndReload();
		} else if( !isSelected && savedIndex!==-1 ) {
			this.app.selectedNotificationTypes.splice(savedIndex,1);
			this.savePrefsAndReload();
		}
		this.updateSelectAllChip();
	}

//	public switchingFilters = false;

	switchAll() {
		if( this.areAllFiltersOn() ){
			//Deselect all
			this.app.selectedNotificationTypes.splice(0);
			this.app.notificationTypes.forEach( type => {
				this.selectedFilter[type] = false;
			});
			this.isAllSelected = false;
		} else {
			//Select all
			this.app.selectedNotificationTypes.splice(0);
			this.app.notificationTypes.forEach( type => {
				this.app.selectedNotificationTypes.push( type );
				this.selectedFilter[type] = true;
			});
			this.isAllSelected = true;
		}
		this.savePrefsAndReload();
	}

	areAllFiltersOn(): boolean {
		return (this.app.selectedNotificationTypes.length >= this.app.notificationTypes.length);
	}

	formatDate(dateString){
		return L10n.moment(dateString).fromNow();
	}

	isEmpty(): boolean  {
		return this.app.notifications.length === 0 
			&& this.areAllFiltersOn();
	}

	noFiltersSelected = (): boolean => {
		return this.app.selectedNotificationTypes.length === 0;
	}

	getCssType( notifType:string ):string {
		notifType = notifType.toLowerCase();
		// This mapping follows the CSS classes defined at https://support.web-education.net/issues/47239
		switch( notifType ) {
			case "news":						return "actualites";
			case "collaborativewall":			return "collaborative-wall";
			case "messagerie":					return "conversation";
			case "homeworks":					return "cahier-textes";
			default:							return notifType;
		}
	}

	getFilterClass(notifType:string) {
		return "filter color-app-"+this.getCssType(notifType) + (this.selectedFilter[notifType]?" active":"");
	}

	toggleTools(event:UIEvent) {
		$((event.currentTarget as HTMLElement).parentNode).toggleClass('open');
	}

	translateType(notifType:string) {
		notifType=notifType.toLowerCase();
		return this.lang.translate(notifType === 'timeline' ? notifType + '.notification' : notifType);
	}

};

interface TimelineScope extends IScope {
	canRenderUi:boolean;
}

/* Directive */
class Directive implements IDirective<TimelineScope,JQLite,IAttributes,IController[]> {
    restrict = 'E';
	template = require("./timeline.directive.html");
    scope = {
		pickTheme: "="
    };
	bindToController = true;
	controller = [TimelineController];
	controllerAs = 'ctrl';
	require = ['timeline'];

    async link(scope:TimelineScope, elem:JQLite, attr:IAttributes, controllers:IController[]|undefined) {
        const ctrl:TimelineController|null = controllers ? controllers[0] as TimelineController : null;
        if(!ctrl) return;

		ctrl.lightmode = attr["lightmode"] == "true" || false;
		ctrl.isCache = attr["cache"] == "true" || false;

		ctrl.savePrefsAndReload = () => {
			return ctrl.app.savePreferences()
			.then( () => {
				ctrl.app.notifications.splice(0);
				ctrl.app.resetPagination();
				return ctrl.app.loadNotifications();
			})
			.then( () => {
				scope.$apply();
			});
		}

		scope.canRenderUi = false;

		if( ctrl.lightmode ) {
			scope.canRenderUi = true;
			scope.$apply();
			return; // Do not load the notifications in lightmode
		}

        await ctrl.lang.addBundlePromise('/timeline/i18nNotifications?mergeall=true');
		await ctrl.initialize();
		ctrl.initFilters();
		ctrl.loadPage();
		scope.canRenderUi = true;
		scope.$apply();

		// Advanced transitions for filters
		$('.filter-button').each(function (i) {
			var target = '#' + $(this).data('target');
			var filterTween = gsap.gsap.timeline().reversed(true).pause();
			filterTween.from(target, { duration: 0.1, height: 0, autoAlpha: 0, display: 'none' });
			filterTween.from(target + " .filter", {
				duration: 0.1, 
				autoAlpha: 0, 
				translateY: '100%',
				stagger: 0.1
			}, "-=0.1");
			$(target).data('tween', filterTween);
		});

		$('.filter-button').on('click', function (e) {
			var target = '#' + $(this).data('target');
			if ($(target).data("tween").reversed()) {
				$(target).data("tween").play();
			} else {
				$(target).data("tween").reverse()
			}
		});

		ctrl.handleLoadPageClick = (force: boolean): Promise<void> => {
			return ctrl.loadPage(force).then(() => scope.$apply());
		}
    }
}

/**
 * The timeline directive.
 *
 * Usage:
 *   &lt;timeline lightmode="true|false" cache="true|false"></timeline&gt;
 */
export function DirectiveFactory() {
	return new Directive();
}
