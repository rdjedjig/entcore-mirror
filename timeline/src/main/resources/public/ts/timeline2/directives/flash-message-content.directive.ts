import { IAttributes, IController, IDirective, IScope, ICompileService } from "angular";
import { NgHelperService, RichContentService } from "ode-ngjs-front";
import { IFlashMessageModel } from "ode-ts-client";
import { FlashMsgController } from "./flash-messages.directive";

interface Scope extends IScope {
	flashMessageContent: IFlashMessageModel;
	toggleContent?: () => void;
	ellipsis?: string;
}

/* Directive */
class Directive implements IDirective<Scope,JQLite,IAttributes,IController[]> {
	constructor( 
		private $compile:ICompileService,
		private richContentSvc:RichContentService, 
		private helperSvc:NgHelperService ) {
	}

	restrict= 'A';
	scope= {
		flashMessageContent: '='
	};
	require= ["^flashMessages"];

    link(scope:Scope, elem:JQLite, attr:IAttributes, controllers?:IController[]): void {
		const maxHeightPx	= 64;
		const ellipsis		= "&nbsp;&#8230;";
		const parentCtrl = controllers[0] as FlashMsgController;
		if( !parentCtrl || !scope.flashMessageContent ) return;

		this.richContentSvc.apply(scope.flashMessageContent?.contents[parentCtrl.currentLanguage] ?? '', elem, scope);

		// If needed, limit the height of displayed text, and add a button "See more" which toggles the full message display back and forth.
		if( this.helperSvc.height(elem) > maxHeightPx ) {
			// Helper function for toggling long messages.
			scope.toggleContent = () => {
				if( scope.ellipsis !== ellipsis ) {
					elem.css( {"max-height": ''+maxHeightPx+"px", "overflow-y": "hidden"} );
					scope.ellipsis = ellipsis;
				} else {
					elem.css( {"max-height": "none", "overflow-y": "initial"} );
					scope.ellipsis = "&nbsp;";
				}
			}

			// Create a div for displaying the ellipsis.
			const divEllipsis = $(`<div class="flash-ellipsis"><div ng-bind-html="[[ellipsis]]"></div></div>`);
			elem.append( this.$compile(divEllipsis)(scope) );

			const moreContainer = $(`
				<a href="" class="btn-read-more"
						ng-click="toggleContent()"><span class="btn-read-more-inner"><i18n>timeline.flash.message.seemore</i18n></span>
				</a>
			`);
			elem.parent().append( this.$compile(moreContainer)(scope) );

			scope.toggleContent();
		}
    }
}

/**
 * The flash-message-content directive.
 *
 * Usage:
 *   &lt;flash-message-content>The content to display which can be very very long</flash-message-content&gt;
 */
export function DirectiveFactory($compile:ICompileService, richContentSvc:RichContentService, helperSvc:NgHelperService) {
	return new Directive($compile, richContentSvc, helperSvc);
}
DirectiveFactory.$inject = ["$compile", "odeRichContentService", "odeNgHelperService"];
