import { IAttributes, IController, IDirective, IScope } from "angular";
import angular = require("angular");
import { L10n, conf, http, session, notify } from "ode-ngjs-front";
import { IEmailValidationInfos, NotifyFrameworkFactory } from "ode-ts-client";

/* Controller for the directive */
export class ValidateMailController implements IController {
    private me = session().user;
	public lang = conf().Platform.idiom;

	// Scoped data
	public step:ValidationStep = "email"; // by default
	public force?:Boolean;

	// Input data
	public emailAddress?:String;
	public inputCode?:String;
	public acceptableEmailPattern:string = "*";

	// Server data
	private infos?:IEmailValidationInfos;

	onValidateMail: () => Promise<void>;
	onValidateCode: () => Promise<void>;

	get isAdml() {
		return this.me.functions && this.me.functions.ADMIN_LOCAL && this.me.functions.ADMIN_LOCAL.scope;
	}

	get isAdmc() {
		return this.me.functions && this.me.functions.SUPER_ADMIN && this.me.functions.SUPER_ADMIN.scope;
	}

	public async initialize() {
		await conf().Platform.idiom.addBundlePromise("/auth/i18n");
		this.infos = await session().getEmailValidationInfos();
		if( this.infos ) {
			if( !this.infos.emailState 
					|| this.infos.emailState.state !== "valid"
					|| this.infos.emailState.valid != this.infos.email ) {
				this.emailAddress = this.infos.email || "";
			}
			if( this.infos.emailState && this.infos.emailState.valid && this.infos.emailState.valid.length>0 ) {
				this.acceptableEmailPattern = "^(?!"+this.infos.emailState.valid+").*$";
			}
		}
	}

	public inputToBTCss(input) {
		return {
			'form-control': true,
			'is-invalid': input.$invalid
		};
	}

	public validateMail() {
		return session().checkEmail(this.emailAddress)
		.then( () => {
			this.step = "code";
			this.inputCode && delete this.inputCode;
		})
		.catch( e => {
			notify.error('validate-mail.error.network');
		});
	}
};

interface ValidateMailScope extends IScope {
	step?: ValidationStep;
	canRenderUi: boolean;
}

/* Directive */
class Directive implements IDirective<ValidateMailScope,JQLite,IAttributes,IController[]> {
    restrict = 'E';
	template = require("./validate-mail.directive.html");
    scope = {
		step: "=?",
		force: "=?"
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
			setTimeout( ()=>document.getElementById("input-data").focus(), 10 );
			
			ctrl.onValidateMail = async (): Promise<void> => {
				await ctrl.validateMail();
				scope.$apply();
			}
			
			ctrl.onValidateCode = (): Promise<void> => {
				//return ctrl.loadPage(force).then(() => scope.$apply());
				return Promise.resolve();
			}
		});
    }
}

/**
 * The validate-mail directive.
 * Set step="email" to display the first screen (=email input).
 * Set step="code"  to display the second screen (=code input).
 *
 * Usage:
 *   &lt;validate-mail step?="email|code"></validate-mail&gt;
 */
export function DirectiveFactory() {
	return new Directive();
}