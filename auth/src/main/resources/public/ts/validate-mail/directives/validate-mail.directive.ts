import { IAttributes, IController, IDirective, IScope } from "angular";
import { L10n, conf, http, session } from "ode-ngjs-front";
import { NotifyFrameworkFactory } from "ode-ts-client";

/* Controller for the directive */
export class ValidateMailController implements IController {
    private me = session().user;
	public lang = conf().Platform.idiom;
	public force = false;

	constructor() {
    }

	onValidateMail: () => Promise<void>;

	get isAdml() {
		return this.me.functions && this.me.functions.ADMIN_LOCAL && this.me.functions.ADMIN_LOCAL.scope;
	}

	get isAdmc() {
		return this.me.functions && this.me.functions.SUPER_ADMIN && this.me.functions.SUPER_ADMIN.scope;
	}

	public async initialize() {
		await conf().Platform.idiom.addBundlePromise("/auth/i18n");
	}

	// public getInfos():Promise<IEmailValida
	// public checkEmail()
};

interface ValidateMailScope extends IScope {
	force?: boolean;
	canRenderUi: boolean;
}

/* Directive */
class Directive implements IDirective<ValidateMailScope,JQLite,IAttributes,IController[]> {
    restrict = 'E';
	template = require("./validate-mail.directive.html");
    scope = {
		force: "@?"
    };
	bindToController = true;
	controller = [ValidateMailController];
	controllerAs = 'ctrl';
	require = ['validateMail'];

    link(scope:ValidateMailScope, elem:JQLite, attr:IAttributes, controllers:IController[]|undefined) {
        const ctrl:ValidateMailController|null = controllers ? controllers[0] as ValidateMailController : null;
        if(!ctrl) return;

		scope.canRenderUi = false;

		ctrl.initialize()
		.then( () => {
			scope.canRenderUi = true;
			scope.$apply();
			
			ctrl.onValidateMail = (): Promise<void> => {
				//return ctrl.loadPage(force).then(() => scope.$apply());
				return Promise.resolve();
			}
		});
    }
}

/**
 * The validate-mail directive.
 * When a validation MUST be done, set the force attribute to true.
 *
 * Usage:
 *   &lt;validate-mail force?="true|false"></validate-mail&gt;
 */
export function DirectiveFactory() {
	return new Directive();
}