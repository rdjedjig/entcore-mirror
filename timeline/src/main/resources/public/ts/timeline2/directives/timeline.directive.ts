import { IAttributes, IController, IDirective, IScope } from "angular";
import moment = require("moment");
import { ConfigurationFrameworkFactory, ITimelineFactory, NotificationModel, SessionFrameworkFactory } from "ode-ts-client";

type Action = {
    label: string;
    action: (notification:any) => void;
    condition: (notif?:any) => string;
    doneProperty?:string;
    doneLabel?:string;
};

/* Controller for the directive */
export class Controller implements IController {
    private me = SessionFrameworkFactory.instance().session.user;
	public lang =  ConfigurationFrameworkFactory.instance().Platform.idiom;

    constructor() {
        if (this.userStructures && this.userStructures.length == 1) {
            this.userStructure = this.userStructures[0];
        }
    }

    app = ITimelineFactory.createInstance();

	filtered = {};
	config = {
		hideAdminv1Link: false
	}
    userStructure = null;
	userStructures = this.me.structures;
	switchingFilters = false;
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

/*
	removeFilter(){
		if(model.notificationTypes.noFilter){
			model.notificationTypes.deselectAll();
		}
		model.notifications.sync();
	};

	allFilters(){
		this.switchingFilters = true;
		if(model.notificationTypes.selection().length === model.notificationTypes.length()){
			model.notificationTypes.deselectAll();
		}else{
			model.notificationTypes.selectAll();
		}

		model.notifications.page = 0;
		model.notifications.lastPage = false;
		model.notifications.all = [];
		model.notifications.sync(false, () => this.switchingFilters = false);
	};

	isCache = () => (window as any).TIMELINE_CACHE;

	showSeeMore = () => {
		if(this.notifications.loading){
			return false;
		}
		return (window as any).TIMELINE_CACHE && model.notifications.page==1 && !model.notifications.lastPage;
	}

	showSeeMoreOnEmpty = () => {
		try{
			if(this.notifications.loading){
				return false;
			}
			return (window as any).TIMELINE_CACHE && model.notifications.page==0 && this.notifications.all.length === 0 && this.notifications.lastPage;
		} catch(e){
			return false;
		}
	}

	forceLoadPage = () =>{
		this.notifications.lastPage = false;
		model.notifications.page++
		this.loadPage();
	}
	
	switchFilter = (type) => {
		this.switchingFilters = true;
		type.apply(() => this.switchingFilters = false);
	}

	unactivesFilters(){
		var unactives = model.notificationTypes.length() - model.notificationTypes.selection().length;
		return unactives;
	}

	loadPage(){
		model.notifications.sync(true);
	}

	display = {};

	suffixTitle(type) {
		return lang.translate(type === 'timeline' ? type + '.notification' : type);
	}

	let isAdml = () => {
		return model.me.functions && model.me.functions.ADMIN_LOCAL && model.me.functions.ADMIN_LOCAL.scope;
	}

	let isAdmc = () => {
		return model.me.functions && model.me.functions.SUPER_ADMIN && model.me.functions.SUPER_ADMIN.scope;
	}

	// get platform config about admin version to create admin (v1 or v2) link for report notification
	if (isAdml() || isAdmc()) {
		http()
			.get('/admin/api/platform/config')
			.done(res => {
				this.config.hideAdminv1Link = res['hide-adminv1-link'];
			});
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

	allFiltersOn = (): boolean => {
		return this.notificationTypes.selection() 
			&& this.notificationTypes.all.length > 0
			&& this.notificationTypes.selection().length === this.notificationTypes.all.length;
	}

	isEmpty = (): boolean => {
		return this.notifications.all 
			&& this.notifications.all.length === 0 
			&& this.allFiltersOn();
	}

	noFiltersSelected = (): boolean => {
		return this.notificationTypes.selection().length == 0;
	}

	noResultsWithFilters = (): boolean => {
		return this.notifications.all 
			&& this.notifications.all.length === 0 
			&& this.notificationTypes.selection().length < this.notificationTypes.all.length
			&& this.notificationTypes.selection().length > 0;
	}
*/

	formatDate(dateString){
		return moment(dateString).fromNow();
	};

	getCssType( n:NotificationModel ):string {
		switch( n.type ) {
			case "USERBOOK":
			case "WIKI":						return "wiki";
			case "NEWS":
			case "COLLABORATIVEWALL":
			case "BLOG":						return "blog";
			case "WORKSPACE":
			case "MESSAGERIE":
			case "SCRAPBOOK":
			case "MINDMAP":
			case "HOMEWORKS":
			case "TIMELINEGENERATOR":
			case "PAGES":						return "pages";
			case "RBS":
			case "SUPPORT":
			case "FORUM":
			case "RACK":
			case "EXERCIZER":
			case "SCHOOLBOOK":
			case "CALENDAR":
			case "TIMELINE":
			case "SHAREBIGFILES":
			case "ARCHIVE":
			case "POLL":
			case "COMMUNITY":
			case "COLLABORATIVEEDITOR":
			default:							return "default";
		}
	}
};

interface TimelineScope extends IScope {
}

/* Directive */
class Directive implements IDirective<TimelineScope,JQLite,IAttributes,IController[]> {
    restrict = 'E';
	template = require("./timeline.directive.html").default;
    scope = {
    };
	bindToController = true;
	controller = [Controller];
	controllerAs = 'ctrl';
	require = ['timeline'];

    link(scope:TimelineScope, elem:JQLite, attr:IAttributes, controllers:IController[]|undefined): void {
        let ctrl:Controller|null = controllers ? controllers[0] as Controller : null;
        if(!ctrl) return;

        ctrl.lang.addBundle('/timeline/i18nNotifications?mergeall=true', function(){
//            this.notifications = model.notifications;
//            $scope.$apply('notifications');
        });
    
		ctrl.app.initialize().then( () => {
			
		});
    }
}

/**
 * The timeline directive.
 *
 * Usage:
 *   &lt;timeline></timeline&gt;
 */
export function DirectiveFactory() {
	return new Directive();
}
