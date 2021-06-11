import angular = require("angular");
import { OdeModules } from 'ode-ngjs-front';
import { AppController } from "./controller";
import * as TimelineApp from './directives/timeline.directive';


angular.module("app", [OdeModules.getBase(), OdeModules.getI18n(), OdeModules.getUi(), OdeModules.getWidgets()])
.controller("appCtrl", ['$rootScope', '$scope', AppController])
.directive("timeline", TimelineApp.DirectiveFactory);
