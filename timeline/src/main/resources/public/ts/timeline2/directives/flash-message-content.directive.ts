import { IAttributes, IController, IDirective, IScope, ICompileService } from "angular";
import { NgHelperService, RichContentService } from "ode-ngjs-front";

interface Scope extends IScope {
	toggleContent?: () => void;
	ellipsis: string;
}

/* Directive */
class Directive implements IDirective<Scope,JQLite,IAttributes,IController[]> {
	constructor( 
		private $compile:ICompileService,
		private richContentSvc:RichContentService, 
		private ngHelperSvc:NgHelperService ) {
	}

	restrict= 'A';
	scope= {
		flashMessageContent: '='
	};

    link(scope:Scope, elem:JQLite, attr:IAttributes, controllers?:IController[]): void {
		scope.$watch('flashMessageContent', (newVal)=> {
			this.richContentSvc.apply(newVal as string ?? '', elem, scope);

			// Limit to 4 lines of displayed text and add a button "See more"
			scope.ellipsis = "&nbsp;";
			scope.toggleContent = () => {
				if( scope.ellipsis === "&nbsp;" ) {
					elem.css( {"max-height": "64px", "overflow-y": "hidden"} );
					scope.ellipsis = "...";
				} else {
					elem.css( {"max-height": "none", "overflow-y": "initial"} );
					scope.ellipsis = "&nbsp;";
				}
			}
			if( this.ngHelperSvc.height(elem) > 4 * 16 ) {
				const moreContainer = $(`
					<div class="position-relative mt-3">
						<span ng-bind-html="[[ellipsis]]"></span>
						<button class="btn btn-secondary position-absolute top-0 end-0 small" ng-click="toggleContent()">
							<small><i18n>seemore</i18n></small>
						</button>
					</div>`
				);
				elem.parent().append( this.$compile(moreContainer)(scope) );
				scope.toggleContent();
			}
		});
    }
}

/**
 * The flash-message-content directive.
 *
 * Usage:
 *   &lt;flash-message-content>The content to display which can be very very long</flash-message-content&gt;
 */
export function DirectiveFactory($compile:ICompileService, richContentSvc:RichContentService, ngHelperService:NgHelperService) {
	return new Directive($compile, richContentSvc, ngHelperService);
}
DirectiveFactory.$inject = ["$compile", "odeRichContentService", "odeNgHelperService"];
