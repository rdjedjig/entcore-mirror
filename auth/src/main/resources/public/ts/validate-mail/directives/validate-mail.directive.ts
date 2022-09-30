import angular = require("angular");
import { IAttributes, IController, IDirective, IScope } from "angular";
import { L10n, conf, http, session, notify, notif } from "ode-ngjs-front";
import { IEmailValidationInfos } from "ode-ts-client";

type OTPStatus = ""|"wait"|"ok"|"ko";

/* Controller for the directive */
export class ValidateMailController implements IController {
    private me = session().user;
	public lang = conf().Platform.idiom;

	// Scoped data
	public step:ValidationStep = "email"; // by default
	public force?:Boolean;
	public redirect?:string;

	// Input data
	public emailAddress?:String;
	public inputCode?:String;
	public acceptableEmailPattern:string = "*";
	public status:OTPStatus = "";
	public koStatusCause = "";

	// Server data
	private infos?:IEmailValidationInfos;

	get isAdml() {
		return this.me.functions && this.me.functions.ADMIN_LOCAL && this.me.functions.ADMIN_LOCAL.scope;
	}

	get isAdmc() {
		return this.me.functions && this.me.functions.SUPER_ADMIN && this.me.functions.SUPER_ADMIN.scope;
	}

	public async initialize() {
		this.infos = await Promise.all([
			notif().onSessionReady().promise,
			conf().Platform.idiom.addBundlePromise("/auth/i18n")
		])
		.then( unused => session().getEmailValidationInfos() )
		.catch( e => {
			setTimeout( () => notify.error('validate-mail.error.network', 4000), 500 );
			return null;
		});

		if( this.infos ) {
			if( this.step == "email" ) {
				if( !this.infos.emailState 
						|| this.infos.emailState.state !== "valid"
						|| this.infos.emailState.valid != this.infos.email ) {
					// Auto-fill the email address field
					this.emailAddress = this.infos.email || "";
				}
				if( this.infos.emailState && this.infos.emailState.valid && this.infos.emailState.valid.length>0 ) {
					// Reject the current valid email address (cannot be validated twice)
					this.acceptableEmailPattern = "^(?!"+this.infos.emailState.valid+"$).*";
				}
			} else {
				// Before displaying the step 2 immediately, the emailAddress must be initialized.
				this.emailAddress = this.infos.emailState.pending;
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

	public validateCode():Promise<OTPStatus> {
		return session().tryEmailValidation(this.inputCode)
		.then( validation => {
			if( validation.state === "valid" ) {
				this.status = "ok";
			} else {
				this.status = "ko";
				if( validation.state === "outdated" ) {
					this.koStatusCause = 'validate-mail.error.ttl';
				} else {
					this.koStatusCause = 'validate-mail.error.code';
				}
			}
		})
		.catch( e => {
			notify.error('validate-mail.error.network');
		})
		.then( () => this.status );
	}

	public renewCode():Promise<void> {
		return session().checkEmail(this.emailAddress)
		.then( () => session().getEmailValidationInfos() )
		.then( infos => {
			notify.success('validate-mail.step2.renewed');
			this.infos = infos;
			this.inputCode = "";
			this.status = "";
			this.koStatusCause = "";
		});
	}
};

interface ValidateMailScope extends IScope {
	step?: ValidationStep;
	canRenderUi: boolean;
	onValidate: (step:ValidationStep) => Promise<void>;
	onCodeChange: (form:angular.IFormController) => Promise<void>;
	onCodeRenew: () => Promise<void>;
}

/* Directive */
class Directive implements IDirective<ValidateMailScope,JQLite,IAttributes,IController[]> {
    restrict = 'E';
	template = require("./validate-mail.directive.html");
    scope = {
		step: "=?",
		force: "=?",
		redirect: "=?"
    };
	bindToController = true;
	controller = [ValidateMailController];
	controllerAs = 'ctrl';
	require = ['validateMail'];

    link(scope:ValidateMailScope, elem:JQLite, attr:IAttributes, controllers:IController[]|undefined) {
        const ctrl:ValidateMailController|null = controllers ? controllers[0] as ValidateMailController : null;
        if(!ctrl) return;

		scope.canRenderUi = false;

		scope.onValidate = async (step:ValidationStep): Promise<void> => {
			if( step=="email" ) await ctrl.validateMail();
			scope.$apply();
		}

		scope.onCodeChange = async (formCode) => {
			const form = document.forms.namedItem('formCode');
			try {
				if( formCode.$invalid ) {
					ctrl.status = "";
				} else if( formCode.$valid ) {
					form && angular.element(form.inputCode).prop("readonly", "readonly");
					ctrl.status = "wait";
					scope.$apply();
					const newStatus = await ctrl.validateCode();
					if( newStatus==="ok" ) {
						// Lock UI and redirect after a few seconds
						angular.element(document.getElementById('btnRenew')).prop("disabled", "disabled");
						angular.element(document.getElementById('btnBack')).prop("disabled", "disabled");
						if( ctrl.redirect ) {
							setTimeout( () => {
								try {
									const url = new URL(ctrl.redirect);
									window.location.href = url.toString();
								} catch {
									// silent fail
								}
							}, 2000);
						}
					} else {
						// Unlock UI
						form && angular.element(form.inputCode).prop("readonly", "");
					}
				}
			} catch {
			} finally {
				angular.element(document.getElementById('btnRenew')).prop("disabled", "");
				scope.$apply();
			}
		}

		scope.onCodeRenew = async () => {
			angular.element(document.getElementById('btnRenew')).prop("disabled", "disabled");
			await ctrl.renewCode();
			scope.$apply();
		}

		ctrl.initialize()
		.then( () => {
			scope.canRenderUi = true;
			scope.$apply();
			setTimeout( ()=>document.getElementById("input-data").focus(), 10 );
		});
    }
}

/**
 * The validate-mail directive.
 * Set step="email" to display the first screen (=email input).
 * Set step="code"  to display the second screen (=code input).
 * Set force="true" when the user MUST validate his email address.
 * Set redirect="URL" when the user must be redirected after validation.
 *
 * Usage:
 *   &lt;validate-mail step?="email|code" force?="true" redirect?="URL"></validate-mail&gt;
 */
export function DirectiveFactory() {
	return new Directive();
}