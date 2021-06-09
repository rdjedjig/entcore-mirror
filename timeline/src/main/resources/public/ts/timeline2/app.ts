import angular = require("angular");
import { OdeModules } from 'ode-ngjs-front';
import { AppController } from "./controller";

angular.module("app", [OdeModules.getBase(), OdeModules.getI18n(), OdeModules.getUi(), OdeModules.getWidgets()])
.controller("appCtrl", ['$rootScope', '$scope', AppController]);
