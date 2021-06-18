import { IAttributes, IController, IDirective, IScope } from "angular";
import { IFlashMessageModel, ITimelineApp, ITimelineFactory, SessionFrameworkFactory } from "ode-ts-client";

/* Controller for the directive */
export class FlashMsgController implements IController {
	public app:ITimelineApp;
	public currentLanguage:string;

	list() {
		return this.app.loadFlashMessages();
	}

	public get messages() {
		return this.app.flashMessages;
	}

    dismiss( message:IFlashMessageModel ) {
		this.app.markAsRead( message ).then( () => {
            this.list();
        });
    }
};

/* Directive */
class Directive implements IDirective<IScope,JQLite,IAttributes,IController[]> {
    restrict = 'E';
	template = require("./flash-messages.directive.html");
    scope = {
    };
	bindToController = true;
	controller = [FlashMsgController];
	controllerAs = 'ctrl';
	require = ['flashMessages'];

    link(scope:IScope, elem:JQLite, attr:IAttributes, controllers:IController[]|undefined): void {
        let ctrl:FlashMsgController|null = controllers ? controllers[0] as FlashMsgController : null;
        if(!ctrl) return;

		ctrl.app = ITimelineFactory.createInstance();
		ctrl.currentLanguage = SessionFrameworkFactory.instance().session.currentLanguage;

		ctrl.list();
    }
}

/**
 * The flash-messages directive.
 *
 * Usage:
 *   &lt;flash-messages></flash-messages&gt;
 */
export function DirectiveFactory() {
	return new Directive();
}
