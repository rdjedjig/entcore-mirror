// Copyright © WebServices pour l'Éducation, 2014
//
// This file is part of ENT Core. ENT Core is a versatile ENT engine based on the JVM.
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation (version 3 of the License).
//
// For the sake of explanation, any module that communicate over native
// Web protocols, such as HTTP, with ENT Core is outside the scope of this
// license and could be license under its own terms. This is merely considered
// normal use of ENT Core, and does not fall under the heading of "covered work".
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
var protoApp = {
  scope : '#main',
			init : function() {
			var that = this;
			that.i18n.load();
			$('body').delegate(that.scope, 'click',function(event) {
					if (!event.target.getAttribute('call')) return;
					event.preventDefault();
					if(event.target.getAttribute('disabled') !== null){
							return;
						}
					var call = event.target.getAttribute('call');
					that.action[call]({url : event.target.getAttribute('href'), target: event.target});
					event.stopPropagation();
				});
		},
	action : {
		},
	template : {
			getAndRender : function (pathUrl, templateName, elem, dataExtractor){
					var that = this;
					if (_.isUndefined(dataExtractor)) {
								dataExtractor = function (d) { return {list : _.values(d.result)}; };
						}
					$.get(pathUrl)
						.done(function(data) {
								$(elem).html(that.render(templateName, dataExtractor(data)));
							})
					.error(function(data) {
								protoApp.notify.error(data);
							});
				},
			render : function (name, data) {
					_.extend(data, {
								'i18n' : protoApp.i18n.i18n,
								'formatDate' : function() {
								return function(str) {
										var dt = new Date(Mustache.render(str, this).replace('CEST', 'EST')).toShortString();
										return dt;
									};
							},
						'formatDateTime' : function() {
								return function(str) {
										var dt = new Date(Mustache.render(str, this).replace('CEST', 'EST')).toShortString();
										return dt;
									};
							},
						longDate: function(){
								return function(date) {
										var momentDate = moment(Mustache.render(date, this).replace('CEST', 'EST'));
										if(momentDate !== null){
												return momentDate.format('D MMMM YYYY');
											}
									};
							},
						longDay: function(){
							return function(date) {
										var momentDate = moment(Mustache.render(date, this).replace('CEST', 'EST'));
										if(momentDate !== null){
												return momentDate.format('D MMMM');
											}
									};
							}
					});
				return Mustache.render(this[name] === undefined ? name : this[name], data);
			}
	},
	notify : {
			done : function (msg) { this.instance('success')(msg);},
			error : function (msg) { this.instance('error')(msg); },
			warn : function (msg) {},
			info : function (msg) { this.instance('info')(msg); },
			instance : function(level) {
					return humane.spawn({ addnCls: 'humane-original-' + level });
				}
		},
	i18n : {
			load : function () {
					var that = this;
					$.ajax({url: 'i18n', async: false})
						.done(function(data){
									that.bundle = data;
							})
				},
			bundle : {},
			i18n : function() {
					return function(key) {
								key = Mustache.render(key, this);
							return protoApp.i18n.bundle[key] === undefined ? key : protoApp.i18n.bundle[key];
						};
				},
			translate: function(key){
					return this.i18n()(key);
				}
		},
	define : function (o) {
			var props = { template : {}, action:{}};
			for (prop in props) {
					for (key in o[prop]) {
								props[[prop]][key] = {'value' : o[[prop]][key]};
						}
					Object.defineProperties(this[prop], props[[prop]]);
				}
		}
};

var template = {
	viewPath: '/' + appPrefix + '/public/template/',
	containers: {},
	open: function(name, view){
		var path = this.viewPath + view + '.html';
		var folder = appPrefix;
		if(appPrefix === '.'){
			folder = 'portal';
		}
		if(skin.templateMapping[folder] && skin.templateMapping[folder].indexOf(view) !== -1){
			path = '/assets/themes/' + skin.skin + '/template/' + folder + '/' + view + '.html';
		}

		this.containers[name] = path;

		if(this.callbacks && this.callbacks[name]){
			this.callbacks[name].forEach(function(cb){
				cb();
			});
		}
	},
	contains: function(name, view){
		return this.containers[name] === this.viewPath + view + '.html';
	},
	isEmpty: function(name){
		return this.containers[name] === 'empty' || !this.containers[name];
	},
	close: function(name){
		this.containers[name] = 'empty';
		if(this.callbacks && this.callbacks[name]){
			this.callbacks[name].forEach(function(cb){
				cb();
			});
		}
	},
	watch: function(container, fn){
		if(typeof fn !== 'function'){
			throw TypeError('template.watch(string, function) called with wrong parameters');
		}
		if(!this.callbacks){
			this.callbacks = {};
		}
		if(!this.callbacks[container]){
			this.callbacks[container] = [];
		}
		this.callbacks[container].push(fn);
	}
};

var notify = {
	message: function(type, message){
		message = lang.translate(message);
		humane.spawn({ addnCls: 'humane-original-' + type })(message);
	},
	error: function(message){
		this.message('error', message);
	},
	info: function(message){
		this.message('info', message)
	}
};

var module = angular.module('app', ['ngSanitize', 'ngRoute'], function($interpolateProvider) {
		$interpolateProvider.startSymbol('[[');
		$interpolateProvider.endSymbol(']]');
	})
	.factory('notify', function(){
		return notify;
	})
	.factory('route', function($rootScope, $route, $routeParams){
		var routes = {};
		var currentAction = undefined;
		var currentParams = undefined;

		$rootScope.$on("$routeChangeSuccess", function($currentRoute, $previousRoute){
			if(typeof routes[$route.current.action] === 'function' &&
				(currentAction !== $route.current.action || (currentParams !== $route.current.params && !(Object.getOwnPropertyNames($route.current.params).length === 0)))){
				currentAction = $route.current.action;
				currentParams = $route.current.params;
				routes[$route.current.action]($routeParams);
			}
		});

		return function(setRoutes){
			routes = setRoutes;
			// refreshing in case routechangeevent already fired
			// an amusing quirk of FF is that routing is refreshed before being analyzed, thus we push it
			// at the end of the execution thread
			setTimeout(function(){
				$route.reload();
			}, 1);
		}
	})
	.factory('template', function(){
		return template;
	})
	.factory('date', function() {
		if(currentLanguage === 'fr'){
			moment.lang(currentLanguage, {
				calendar : {
					lastDay : '[Hier à] HH[h]mm',
					sameDay : '[Aujourd\'hui à] HH[h]mm',
					nextDay : '[Demain à] HH[h]mm',
					lastWeek : 'dddd [dernier à] HH[h]mm',
					nextWeek : 'dddd [prochain à] HH[h]mm',
					sameElse : 'dddd LL'
				}
			});
		}
		else{
			moment.lang(currentLanguage);
		}

		return {
            create: function(date){
                return (moment ? moment(date) : date)
            },
			format: function(date, format) {
				if(!moment){
					return '';
				}
				return moment(date).format(format);
			},
			calendar: function(date){
				if(!moment){
					return '';
				}
				return moment(date).calendar();
			}
		};
	})
	.factory('lang', function(){
		return lang
	})
	.factory('_', function(){
		if(window._ === undefined){
			loader.syncLoad('underscore');
		}
		return _;
	})
	.factory('model', function($timeout){
		var fa = Collection.prototype.trigger;
		Collection.prototype.trigger = function(event){
			$timeout(function(){
				fa.call(this, event);
			}.bind(this), 10);
		};

		var fn = Model.prototype.trigger;
		Model.prototype.trigger = function(event){
			$timeout(function(){
				fn.call(this, event);
			}.bind(this), 10);
		};

		return model;
	})
	.factory('ui', function(){
		return ui;
	});

//routing
if(routes.routing){
	module.config(routes.routing);
}

//directives
module.directive('completeChange', function() {
	return {
		restrict: 'A',
		scope:{
			exec: '&completeChange',
			field: '=ngModel'
		},
		link: function(scope, element, attributes) {
			scope.$watch('field', function(newVal) {
				element.val(newVal);
				if(element[0].type === 'textarea' && element.hasClass('inline-editing')){
					setTimeout(function(){
						element.height(1);
						element.height(element[0].scrollHeight - 1);
					}, 100);

				}
			});

			element.bind('change', function() {
				scope.field = element.val();
				if(!scope.$$phase){
					scope.$apply('field');
				}
				scope.$parent.$eval(scope.exec);
				if(!scope.$$phase){
					scope.$apply('field');
				}
			});
		}
	};
});

module.directive('lightbox', function($compile){
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			show: '=',
			onClose: '&'
		},
		template: '<div>'+
					'<section class="lightbox-background"></section>'+
					'<section class="lightbox-view">'+
						'<div class="twelve cell" ng-transclude></div>'+
						'<div class="close-lightbox">'+
						'<i class="close-2x"></i>'+
						'</div>'+
						'<div class="clear"></div>'+
					'</section>'+
				'</div>',
		link: function(scope, element, attributes){
			element.find('.lightbox-background, i').on('click', function(){
				element.find('.lightbox-view').first().fadeOut();
				element.find('.lightbox-background').first().fadeOut();

				scope.$eval(scope.onClose);
				if(!scope.$$phase){
					scope.$parent.$apply();
				}
			});
			scope.$watch('show', function(newVal){
				if(newVal){
					var lightboxWindow = element.find('.lightbox-view');
					//delay to account for templates loading inside the lightbox
					setTimeout(function(){
						lightboxWindow.fadeIn();

						lightboxWindow.css({
							top: parseInt(($(window).height() - lightboxWindow.height()) / 2) + 'px'
						});
					}, 10);

					var backdrop = element.find('.lightbox-background');
					setTimeout(function(){
						backdrop.fadeIn();
					}, 0);
				}
				else{
					element.find('.lightbox-view').fadeOut();
					element.find('.lightbox-background').fadeOut();
				}
			})
		}
	}
});

module.directive('mediaLibrary', function($compile){
	return {
		restrict: 'E',
		scope: {
			ngModel: '=',
			ngChange: '&',
			multiple: '=',
			fileFormat: '='
		},
		templateUrl: '/' + infraPrefix + '/public/template/media-library.html',
		link: function(scope, element, attributes){
			scope.upload = {
				loading: []
			};

			scope.$watch('ngModel', function(newVal){
				if((newVal && newVal._id) || (newVal && scope.multiple && newVal.length)){
					scope.ngChange();
				}

				scope.upload = {
					loading: []
				};
			});

			$('body').on('click', '.lightbox-backdrop', function(){
				scope.upload = {
					loading: []
				};
			});
		}
	}
});

module.directive('linker', function($compile){
	return {
		restrict: 'E',
		templateUrl: '/' + infraPrefix + '/public/template/linker.html',
		controller: function($scope){
			$scope.linker = {
				me: model.me,
				search: { text: '', application: {} },
				params: {},
				resource: {}
			};
		},
		link: function(scope, element, attributes){
			scope.linker.editor = scope.$eval(attributes.editor);
			scope.linker.onChange = function(){
				scope.$eval(attributes.onChange);
			};
			var linkNode = $('<a />');
			var appendText = '';
			scope.$watch('display', function(newVal){
				if(newVal.chooseLink){
					if(!scope.linker.editor){
						scope.linker.editor = scope.$eval(attributes.editor);
					}
					var contextEditor = scope.linker.editor;
					var bookmarks = contextEditor.getSelection().createBookmarks(),
						range = contextEditor.getSelection().getRanges()[0],
						fragment = range.clone().cloneContents();
					contextEditor.getSelection().selectBookmarks(bookmarks);

					var node = $(range.startContainer.getParent().$);
					if(node[0].nodeName !== 'A'){
						node = $(range.startContainer.$);
						if(node[0].nodeName !== 'A'){
							scope.newNode = true;
							return;
						}

					}

					scope.linker.params.link = node.attr('href');
					scope.linker.externalLink = !node.attr('data-id');
					scope.linker.params.appPrefix = node.attr('data-app-prefix');
					scope.linker.params.id = node.attr('data-id');
					scope.linker.params.blank = node.attr('target') === '_blank';
					scope.linker.params.target = node.attr('target');
					scope.linker.params.tooltip = node.attr('tooltip');

					scope.linker.search.application = _.find(scope.linker.apps, function(app){
						return app.address.indexOf(node.attr('data-app-prefix')) !== -1;
					});

					scope.linker.search.text = scope.params.id;
					scope.linker.loadApplicationResources(function(){
						scope.linker.searchApplication();
						scope.linker.search.text = ' ';
						scope.linker.$apply();
					});
				}
				else{
					scope.linker.params = {};
					scope.linker.search.text = '';
				}
			}, true);

			http().get('/resources-applications').done(function(apps){
				scope.linker.apps = _.filter(model.me.apps, function(app){
					return _.find(apps, function(match){
						return app.address.indexOf(match) !== -1
					});
				});
				var currentApp = _.find(scope.linker.apps, function(app){
					return app.address.indexOf(appPrefix) !== -1;
				});

				scope.linker.search.application = scope.linker.apps[0];
				if(currentApp){
					scope.linker.search.application = currentApp;
				}
				scope.linker.loadApplicationResources(function(){});

				var split = scope.linker.search.application.address.split('/');
				scope.linker.params.appPrefix = split[split.length - 1];
				scope.$apply('linker');
			});

			scope.linker.loadApplicationResources = function(cb){
				var split = scope.linker.search.application.address.split('/');
				var prefix = split[split.length - 1];
				scope.linker.params.appPrefix = prefix;
				if(!cb){
					cb = function(){
						scope.linker.searchApplication();
						scope.$apply('linker');
					};
				}

				Behaviours.loadBehaviours(prefix, function(appBehaviour){
					appBehaviour.loadResources(cb);
					scope.linker.addResource = appBehaviour.create;
				});
			};

			scope.linker.searchApplication = function(){
				var split = scope.linker.search.application.address.split('/');
				var prefix = split[split.length - 1];
				scope.linker.params.appPrefix = prefix;
				Behaviours.loadBehaviours(scope.linker.params.appPrefix, function(appBehaviour){
					scope.linker.resources = _.filter(appBehaviour.resources, function(resource) {
						return scope.linker.search.text !== '' && (lang.removeAccents(resource.title.toLowerCase()).indexOf(lang.removeAccents(scope.linker.search.text).toLowerCase()) !== -1 ||
							resource._id === scope.linker.search.text);
					});
					scope.linker.resource.title = scope.linker.search.text;
				});
			};

			scope.linker.createResource = function(){
				Behaviours.loadBehaviours(scope.linker.params.appPrefix, function(appBehaviour){
					appBehaviour.create(scope.linker.resource, function(){
						scope.linker.searchApplication();
						scope.linker.search.text = scope.linker.resource.title;
						scope.$apply();
					});
				});
			};

			scope.linker.applyLink = function(link){
				scope.linker.params.link = link;
			};

			scope.linker.applyResource = function(resource){
				scope.linker.params.link = resource.path;
				scope.linker.params.id = resource._id;
			};

			scope.linker.saveLink = function(){
				if(scope.linker.params.blank){
					scope.linker.params.target = '_blank';
				}

				var contextEditor = scope.linker.editor;
				var bookmarks = contextEditor.getSelection().createBookmarks(),
					range = contextEditor.getSelection().getRanges()[0],
					fragment = range.clone().cloneContents();
				contextEditor.getSelection().selectBookmarks(bookmarks);

				var linkNode = scope.linker.editor.document.createElement('a');

				if(scope.linker.params.link){
					linkNode.setAttribute('href', scope.linker.params.link);

					if(scope.linker.params.appPrefix){
						linkNode.setAttribute('data-app-prefix', scope.linker.params.appPrefix);
						if(scope.linker.params.appPrefix !== 'workspace' && !scope.linker.externalLink){
							linkNode.data('reload', true);
						}
					}
					if(scope.linker.params.id){
						linkNode.setAttribute('data-id', scope.linker.params.id);
					}
					if(scope.linker.params.blank){
						scope.linker.params.target = '_blank';
						linkNode.setAttribute('target', scope.linker.params.target);
					}
					if(scope.linker.params.tooltip){
						linkNode.setAttribute('tooltip', scope.linker.params.tooltip);
					}
				}

				var appendText = "",
					childList = fragment.getChildren(),
					childCount = childList.count();
				for(var i = 0; i < childCount; i++){
					var child = childList.getItem(i);
					if(child.$.nodeName === 'A' || !child.getOuterHtml){
						appendText += child.getText();
					}
					else{
						appendText += child.getOuterHtml();
					}
				}

				if(childCount === 0){
					appendText = scope.linker.params.link;
				}

				linkNode.appendHtml(appendText);
				scope.linker.editor.insertElement(linkNode);

				scope.display.chooseLink = false;
				scope.linker.onChange();
				scope.$apply();
			};

			scope.linker.cancel = function(){
				scope.display.chooseLink = false;
			};
		}
	}
});

module.directive('calendar', function($compile){
	return {
		restrict: 'E',
		templateUrl: '/' + infraPrefix + '/public/template/calendar.html',
		controller: function($scope, $timeout){
			var refreshCalendar = function(){
				model.calendar.clearScheduleItems();
				$scope.items = _.where(_.map($scope.items, function(item){
					item.beginning = item.startMoment;
					item.end = item.endMoment;
					return item;
				}), { is_periodic: false });
				model.calendar.addScheduleItems($scope.items);
				$scope.calendar = model.calendar;
				$scope.moment = moment;
				$scope.display = {
					editItem: false,
					createItem: false
				};

				$scope.editItem = function(item){
					$scope.calendarEditItem = item;
					$scope.display.editItem = true;
				};

				$scope.createItem = function(day, timeslot){
					$scope.display.createItem = true;
					$scope.newItem = {};
					$scope.newItem.beginning = moment().utc().dayOfYear(day.index).hour(timeslot.start);
					$scope.newItem.end = moment().utc().dayOfYear(day.index).hour(timeslot.end);
					model.calendar.newItem = $scope.newItem;
					$scope.onCreateOpen();
				};

				$scope.closeCreateWindow = function(){
					$scope.display.createItem = false;
					$scope.onCreateClose();
				};

				$scope.updateCalendarWeek = function(){
					model.calendar = new calendar.Calendar({ week: moment(model.calendar.dayForWeek).week() });
					refreshCalendar();
				};
			};
			$timeout(function(){
				refreshCalendar();
				$scope.$watchCollection('items', refreshCalendar);
			}, 0);
			$scope.refreshCalendar = refreshCalendar;
		},
		link: function(scope, element, attributes){
			template.open('schedule-display-template', attributes.displayTemplate);
			template.open('schedule-create-template', attributes.createTemplate);

			scope.items = scope.$eval(attributes.items);
			scope.onCreateOpen = function(){
				scope.$eval(attributes.onCreateOpen);
			};
			scope.onCreateClose = function(){
				scope.$eval(attributes.onCreateClose);
			};
			scope.$watch(function(){
				return scope.$eval(attributes.items)
			}, function(newVal){
				scope.items = newVal;
			});
		}
	}
});

module.directive('scheduleItem', function($compile){
	return {
		restrict: 'E',
		require: '^calendar',
		template: '<div class="schedule-item" resizable horizontal-resize-lock draggable>' +
			'<container template="schedule-display-template"></container>' +
			'</div>',
		controller: function($scope){

		},
		link: function(scope, element, attributes){
			var parentSchedule = element.parents('.schedule');
			var cssClasses = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
			var scheduleItemEl = element.children('.schedule-item');
			if(scope.item.beginning.dayOfYear() !== scope.item.end.dayOfYear() || scope.item.locked){
				scheduleItemEl.removeAttr('resizable');
				scheduleItemEl.removeAttr('draggable');
				scheduleItemEl.unbind('mouseover');
				scheduleItemEl.unbind('click');
				scheduleItemEl.data('lock', true)
			}

			var getTimeFromBoundaries = function(){
				var startTime = moment().utc();
				startTime.hour(Math.floor(scheduleItemEl.position().top / calendar.dayHeight) + calendar.startOfDay);
				startTime.minute((scheduleItemEl.position().top % calendar.dayHeight) * 60 / calendar.dayHeight);

				var endTime = moment().utc();
				endTime.hour(Math.floor((scheduleItemEl.position().top + scheduleItemEl.height()) / calendar.dayHeight) + calendar.startOfDay);
				endTime.minute(((scheduleItemEl.position().top + scheduleItemEl.height()) % calendar.dayHeight) * 60 / calendar.dayHeight);

				var days = element.parents('.schedule').find('.day');
				var center = scheduleItemEl.offset().left + scheduleItemEl.width() / 2;
				var dayWidth = days.first().width();
				days.each(function(index, item){
					var itemLeft = $(item).offset().left;
					if(itemLeft < center && itemLeft + dayWidth > center){
						var day = index + 1;
						var week = model.calendar.week;
						endTime.week(week);
						startTime.week(week);
						if(day === 7){
							day = 0;
							endTime.week(week + 1);
							startTime.week(week + 1);
						}
						endTime.day(day);
						startTime.day(day);
					}
				});

				return {
					startTime: startTime,
					endTime: endTime
				}
			};

			scheduleItemEl.on('stopResize', function(){
				var newTime = getTimeFromBoundaries();
				scope.item.beginning = newTime.startTime;
				scope.item.end = newTime.endTime;
				if(typeof scope.item.calendarUpdate === 'function'){
					scope.item.calendarUpdate();
					model.calendar.clearScheduleItems();
					model.calendar.addScheduleItems(scope.$parent.items);
					scope.$parent.$apply('items');
				}
			});

			scheduleItemEl.on('stopDrag', function(){
				var newTime = getTimeFromBoundaries();
				scope.item.beginning = newTime.startTime;
				scope.item.end = newTime.endTime;
				if(typeof scope.item.calendarUpdate === 'function'){
					scope.item.calendarUpdate();
					model.calendar.clearScheduleItems();
					model.calendar.addScheduleItems(scope.$parent.items);
					scope.$parent.$apply('items');
					parentSchedule.find('schedule-item').each(function(index, item){
						var scope = angular.element(item).scope();
						scope.placeItem()
					});
				}
			});

			var placeItem = function(){
				var cellWidth = element.parent().width() / 12;
				var startDay = scope.item.beginning.dayOfYear();
				var endDay = scope.item.end.dayOfYear();
				var hours = calendar.getHours(scope.item, scope.day);

				var itemWidth = scope.day.scheduleItems.scheduleItemWidth(scope.item);
				scheduleItemEl.removeClass('twelve six four three two');
				scheduleItemEl.addClass(cssClasses[itemWidth]);
				var calendarGutter = 0;
				var collision = true;
				while(collision){
					collision = false;
					scope.day.scheduleItems.forEach(function(scheduleItem){
						if(scheduleItem === scope.item){
							return;
						}
						if(scheduleItem.beginning.unix() >= scope.item.beginning.unix() && scheduleItem.beginning.unix() < scope.item.end.unix() - 1
							|| scheduleItem.end.unix() >= scope.item.beginning.unix() + 1 && scheduleItem.end.unix() < scope.item.end.unix()){
							if(scheduleItem.calendarGutter === calendarGutter){
								calendarGutter ++;
								collision = true;
							}
						}
					});
				}
				scope.item.calendarGutter = calendarGutter;
				var beginningMinutesHeight = scope.item.beginning.minutes() * calendar.dayHeight / 60;
				var endMinutesHeight = scope.item.end.minutes() * calendar.dayHeight / 60;
				scheduleItemEl.height(((hours.endTime - hours.startTime) * calendar.dayHeight - beginningMinutesHeight + endMinutesHeight) + 'px');
				scheduleItemEl.css({
					top: ((hours.startTime - calendar.startOfDay) * calendar.dayHeight + beginningMinutesHeight) + 'px',
					left: (scope.item.calendarGutter * (itemWidth * cellWidth)) + 'px'
				});
			}

			scope.$parent.$watchCollection('items', placeItem);
			scope.$watch('item', placeItem);
			scope.placeItem = placeItem;
		}
	}
});

function serializeScope(scope){
	var result = {};
	for(var prop in scope){
		if(prop[0] !== '$' && prop !== 'h' && typeof scope[prop] !== 'function' && prop !== 'this' && scope[prop] !== undefined && prop !== 'callbacks'){
			result[prop] = JSON.parse(JSON.stringify(scope[prop]));
		}
	}

	if(scope.$parent === null){
		return result;
	}
	return {
		parent: serializeScope(scope.$parent),
		scope: result
	}
}

function applyScope(input, scope){
	if(!input || !scope){
		return;
	}
	for(var prop in input.scope){
		if(scope[prop] instanceof Collection){
			scope[prop].load(input.scope[prop]);
		}
		if(scope[prop] instanceof Model){
			scope[prop].updateData(input.scope[prop]);
		}
		if(!(scope[prop] instanceof Model) && !(scope[prop] instanceof Collection)){
			scope[prop] = input.scope[prop];
		}
	}
	scope.$apply();
	applyScope(input.parent, scope.$parent);
}

module.directive('container', function($compile){
	return {
		restrict: 'E',
		scope: true,
		template: '<div ng-include="templateContainer"></div>',
		link: function(scope, element, attributes){
			scope.tpl = template;

			template.watch(attributes.template, function(){
				scope.templateContainer = template.containers[attributes.template];
				if(scope.templateContainer === 'empty'){
					scope.templateContainer = undefined;
				}
			});

			if(attributes.template){
				scope.templateContainer = template.containers[attributes.template];
			}
		}
	}
});

module.directive('colorSelect', function($compile){
	return {
		restrict: 'E',
		scope: {
			ngModel: '='
		},
		replace: true,
		template: '' +
			'<div class="color-picker" ng-class="{ opened: pickColor }">' +
				'<button class="colors-opener"></button>' +
				'<div class="colors-list">' +
					'<button ng-repeat="color in colors" class="[[color]]" ng-click="setColor(color)"></button>' +
				'</div>' +
			'</div>',
		link: function(scope, element, attributes){
			scope.colors = ['transparent', 'white', 'pink', 'orange', 'black', 'blue', 'green', 'purple'];
			scope.setColor = function(color){
				scope.ngModel = color;
			};

			element.find('.colors-opener').on('click', function(e){
				scope.pickColor = !scope.pickColor;
				scope.$apply('pickColor');
				e.stopPropagation();
				$('body, .main').one('click', function(){
					scope.pickColor = false;
					scope.$apply('pickColor');
				});
			});
		}
	}
})

module.directive('imageSelect', function($compile){
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			ngModel: '=',
			thumbnails: '&',
			ngChange: '&',
			default: '@'
		},
		template: '<div><img ng-src="[[ngModel]]?[[getThumbnails()]]" class="pick-file" draggable="false" ng-if="ngModel" style="cursor: pointer" />' +
			'<img skin-src="[[default]]" class="pick-file" draggable="false" ng-if="!ngModel" style="cursor: pointer" />' +
			'<lightbox show="userSelecting" on-close="userSelecting = false;">' +
			'<media-library ng-change="updateDocument()" ng-model="selectedFile.file" file-format="\'img\'"></media-library>' +
			'</lightbox>' +
			'</div>',
		link: function(scope, element, attributes){
			scope.selectedFile = { file: {}};

			scope.$watch('thumbnails', function(thumbs){
				var evaledThumbs = scope.$eval(thumbs);
				if(!evaledThumbs){
					return;
				}
				scope.getThumbnails = function(){
					var link = '';
					evaledThumbs.forEach(function(th){
						link += 'thumbnail=' + th.width + 'x' + th.height + '&';
					});
					return link;
				}
			});

			scope.updateDocument = function(){
				scope.userSelecting = false;
				scope.ngModel = '/workspace/document/' + scope.selectedFile.file._id;
				scope.$apply('ngModel');
				scope.ngChange();
			};
			element.on('click', '.pick-file', function(){
				scope.userSelecting = true;
				scope.$apply('userSelecting');
			});
		}
	}
});

module.directive('soundSelect', function($compile){
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			ngModel: '=',
			ngChange: '&'
		},
		template: '<div><audio ng-src="[[ngModel]]" controls ng-if="ngModel" style="cursor: pointer"></audio>' +
			'<lightbox show="userSelecting" on-close="userSelecting = false;">' +
			'<media-library ng-change="updateDocument()" ng-model="selectedFile.file" file-format="\'audio\'"></media-library>' +
			'</lightbox>' +
			'</div>',
		link: function(scope, element, attributes){
			scope.selectedFile = { file: {}};

			scope.updateDocument = function(){
				scope.userSelecting = false;
				scope.ngModel = '/workspace/document/' + scope.selectedFile.file._id;
				scope.$apply('ngModel');
				scope.ngChange();
			};
			element.on('click', 'audio', function(){
				scope.userSelecting = true;
				scope.$apply('userSelecting');
			});
		}
	}
});

module.directive('mediaSelect', function($compile){
	return {
		restrict: 'E',
		transclude: true,
		replace: true,
		scope: {
			ngModel: '=',
			multiple: '=',
			ngChange: '&',
			fileFormat: '=',
			label: "@",
			class: "@",
			value: '@',
			tooltip: "@"
		},
		template: '<div><input type="button" class="pick-file [[class]]" tooltip="[[tooltip]]" />' +
					'<lightbox show="userSelecting" on-close="userSelecting = false;">' +
						'<media-library ng-change="updateDocument()" ng-model="selectedFile.file" multiple="multiple" file-format="fileFormat"></media-library>' +
					'</lightbox>' +
				'</div>',
		link: function(scope, element, attributes){
			if(!scope.tooltip){
				element.find('input').removeAttr('tooltip');
			}
			scope.selectedFile = { file: {}};
			attributes.$observe('label', function(newVal){
				element.find('[type=button]').attr('value', lang.translate(newVal));
			});

			scope.$watch('fileFormat', function(newVal){
				if(newVal === undefined){
					scope.fileFormat = 'img'
				}
			});
			scope.updateDocument = function(){
				scope.userSelecting = false;
				scope.ngModel = '/workspace/document/' + scope.selectedFile.file._id;
				scope.$apply('ngModel');
				scope.ngChange();
			};
			element.find('.pick-file').on('click', function(){
				scope.userSelecting = true;
				scope.$apply('userSelecting');
			});
		}
	}
});

module.directive('filesPicker', function($compile){
	return {
		restrict: 'E',
		transclude: true,
		replace: true,
		template: '<input type="button" ng-transclude />',
		scope: {
			ngChange: '&',
			ngModel: '='
		},
		link: function($scope, $element, $attributes){
			$element.on('click', function(){
				var fileSelector = $('<input />', {
					type: 'file'
				})
					.hide()
					.appendTo('body');
				if($attributes.multiple !== undefined){
					fileSelector.attr('multiple', true);
				}

				fileSelector.on('change', function(){
					$scope.ngModel = fileSelector[0].files;
					$scope.$apply();
					$scope.$eval($scope.ngChange);
					$scope.$parent.$apply();
				});
				fileSelector.click();
			});
		}
	}
})

module.directive('filesInputChange', function($compile){
	return {
		restrict: 'A',
		scope: {
			filesInputChange: '&',
			file: '=ngModel'
		},
		link: function($scope, $element){
			$element.bind('change', function(){
				$scope.file = $element[0].files;
				$scope.$apply();
				$scope.filesInputChange();
				$scope.$apply();
			})
		}
	}
})

module.directive('iconsSelect', function($compile) {
	return {
		restrict: 'E',
		scope:{
			options: '=',
			class: '@',
			current: '=',
			change: '&'
		},
		link: function(scope, element, attributes){
			element.bind('change', function(){
				scope.current.id = element.find('.current').data('selected');
				scope.$eval(scope.change);
				element.unbind('change');
			})
		},
		template: '\
			<div>\
				<div class="current fixed cell twelve" data-selected="[[current.id]]">\
					<i class="[[current.icon]]"></i>\
					<span>[[current.text]]</span>\
				</div>\
				<div class="options-list icons-view">\
				<div class="wrapper"> \
					<div class="cell three option" data-value="[[option.id]]" data-ng-repeat="option in options">\
						<i class="[[option.icon]]"></i>\
						<span>[[option.text]]</span>\
					</div>\
				</div>\
				</div>\
			</div>'
	};
});

module.directive('translate', function($compile) {
	return {
		restrict: 'A',
		replace: true,
		link: function (scope, element, attributes) {
			if(attributes.params){
				var params = scope.$eval(attributes.params);
				for(var i = 0; i < params.length; i++){
					scope[i] = params[i];
				}
			}

			attributes.$observe('content', function(val) {
				if(!attributes.content){
					return;
				}
				element.html($compile('<span class="no-style">' + lang.translate(attributes.content) + '</span>')(scope));
			});

			attributes.$observe('attr', function(val) {
				if(!attributes.attr){
					return;
				}
				var compiled = $compile('<span>' + lang.translate(attributes[attributes.attr]) + '</span>')(scope);
				setTimeout(function(){
					element.attr(attributes.attr, compiled.text());
				}, 10);
			});

			attributes.$observe('attributes', function(val){
				if(!attributes.attributes){
					return;
				}
				var attrObj = scope.$eval(attributes.attributes);
				for(var prop in attrObj){
					var compiled = $compile('<span>' + lang.translate(attrObj[prop]) + '</span>')(scope);
					setTimeout(function(){
						element.attr(prop, compiled.text());
					}, 0);
				}
			})

			attributes.$observe('key', function(val) {
				if(!attributes.key){
					return;
				}
				element.html($compile('<span class="no-style">' + lang.translate(attributes.key) + '</span>')(scope));
			});
		}
	};
});

module.directive('i18n', function($compile){
	return {
		restrict: 'E',
		link: function(scope, element, attributes){
			element.html($compile('<span class="no-style">' + lang.translate(element.text()) + '</span>')(scope));
		}
	}
});

module.directive('i18nPlaceholder', function($compile){
	return {
		link: function(scope, element, attributes){
			attributes.$observe('i18nPlaceholder', function(val) {
				var compiled = $compile('<span>' + lang.translate(attributes.i18nPlaceholder) + '</span>')(scope);
				setTimeout(function(){
					element.attr('placeholder', compiled.text());
				}, 10);
			});
		}
	}
});

module.directive('i18nValue', function($compile){
	return {
		link: function(scope, element, attributes){
			attributes.$observe('i18nValue', function(val) {
				var compiled = $compile('<span>' + lang.translate(attributes.i18nValue) + '</span>')(scope);
				setTimeout(function(){
					element.attr('value', compiled.text());
				}, 10);
			});
		}
	}
});

//Deprecated
module.directive('translateAttr', function($compile) {
	return {
		restrict: 'A',
		link: function compile($scope, $element, $attributes) {
			var compiled = $compile('<span>' + lang.translate($attributes[$attributes.translateAttr]) + '</span>')($scope);
			setTimeout(function(){
				$element.attr($attributes.translateAttr, compiled.text());
			}, 10);
		}
	};
});

module.directive('preview', function($compile){
	return {
		restrict: 'E',
		template: '<div class="row content-line"><div class="row fixed-block height-four">' +
			'<div class="four cell fixed image clip text-container"></div>' +
			'<div class="eight cell fixed-block left-four paragraph text-container"></div>' +
			'</div></div>',
		replace: true,
		scope: {
			content: '='
		},
		link: function($scope, $element, $attributes){
				$scope.$watch('content', function(newValue){
					var fragment = $(newValue);
					$element.find('.image').html(fragment.find('img').first());

					var paragraph = _.find(fragment.find('p'), function(node){
						return $(node).text().length > 0;
					});
					$element.find('.paragraph').text($(paragraph).text());
				})
			}
		}
});

module.directive('bindHtml', function($compile){
	return {
		restrict: 'A',
		scope: {
			bindHtml: '='
		},
		link: function($scope, $element){
			$scope.$watch('bindHtml', function(newVal){
				$element.html($compile('<div>' + newVal + '</div>')($scope.$parent));
				//weird browser bug with audio tags
				$element.find('audio').each(function(index, item){
					var parent = $(item).parent();
					$(item)
						.attr("src", item.src)
						.detach()
						.appendTo(parent);
				});
				if(window.MathJax && window.MathJax.Hub){
					MathJax.Hub.Typeset();
				}
			});
		}
	}
});

module.directive('portal', function($compile){
	return {
		restrict: 'E',
		transclude: true,
		templateUrl: skin.portalTemplate,
		compile: function(element, attributes, transclude){
			element.find('[logout]').attr('href', '/auth/logout?callback=' + skin.logoutCallback);
			ui.setStyle(skin.theme);
		}
	}
});

module.directive('adminPortal', function($compile){
	skin.skin = 'admin';
	skin.theme = '/public/admin/default/';
	return {
		restrict: 'E',
		transclude: true,
		templateUrl: '/public/admin/portal.html',
		compile: function(element, attributes, transclude){
			$('[logout]').attr('href', '/auth/logout?callback=' + skin.logoutCallback);
			ui.setStyle(skin.theme);
		}
	}
});

module.directive('portalStyles', function($compile){
	return {
		restrict: 'E',
		compile: function(element, attributes){
			$('[logout]').attr('href', '/auth/logout?callback=' + skin.logoutCallback)
			ui.setStyle(skin.theme);
		}
	}
});

module.directive('defaultStyles', function($compile){
	return {
		restrict: 'E',
		link: function(scope, element, attributes){
			ui.setStyle(skin.theme);
		}
	}
});

module.directive('skinSrc', function($compile){
	return {
		restrict: 'A',
		scope: '&',
		link: function($scope, $element, $attributes){
			if(!$('#theme').attr('href')){
				return;
			}
			var skinPath = $('#theme').attr('href').split('/');
			var path = skinPath.slice(0, skinPath.length - 2).join('/');
			$attributes.$observe('skinSrc', function(){
				if($attributes.skinSrc.indexOf('http://') === -1 && $attributes.skinSrc.indexOf('/workspace/') === -1){
					$element.attr('src', path + $attributes.skinSrc);
				}
				else{
					$element.attr('src', $attributes.skinSrc);
				}
			});

		}
	}
})

module.directive('localizedClass', function($compile){
	return {
		restrict: 'A',
		link: function($scope, $attributes, $element){
			$element.$addClass(currentLanguage);
		}
	}
});

module.directive('pullDownMenu', function($compile, $timeout){
	return {
		restrict: 'E',
		transclude: true,
		template: '<div class="pull-down-menu hide" ng-transclude></div>',
		controller: function($scope){
		}
	}
});

module.directive('pullDownOpener', function($compile, $timeout){
	return {
		restrict: 'E',
		require: '^pullDownMenu',
		transclude: true,
		template: '<div class="pull-down-opener" ng-transclude></div>',
		link: function(scope, element, attributes){
			element.find('.pull-down-opener').on('click', function(){
				var container = element.parents('.pull-down-menu');
				if(container.hasClass('hide')){
					setTimeout(function(){
						$('body').on('click.pulldown', function(){
							container.addClass('hide');
							$('body').unbind('click.pulldown');
						});
					}, 0);
					container.removeClass('hide');

				}
				else{
					$('body').unbind('click.pulldown');
					container.addClass('hide');
				}
			});
		}
	}
});

module.directive('pullDownContent', function($compile, $timeout){
	return {
		restrict: 'E',
		require: '^pullDownMenu',
		transclude: true,
		template: '<div class="wrapper"><div class="arrow"></div><div class="pull-down-content" ng-transclude></div></div>',
		link: function(scope, element, attributes){
		}
	}
});

module.directive('dropDown', function($compile, $timeout){
	return {
		restrict: 'E',
		transclude: true,
		replace: true,
		scope: {
			options: '=',
			ngChange: '&',
			ngModel: '='
		},
		template: '<div data-drop-down class="drop-down">\
						<div>\
							<ul class="ten cell right-magnet">\
								<li ng-repeat="option in options | limitTo:10" ng-model="option">[[option.toString()]]</li>\
							</ul>\
						</div>\
			</div>',
		link: function($scope, $element, $attributes){
			$scope.$watchCollection('options', function(newValue){
				if(!$scope.options || $scope.options.length === 0){
					$element.addClass('hidden');
					return;
				}
				$element.removeClass('hidden');
				var linkedInput = $('#' + $attributes.for);
				var pos = linkedInput.offset();
				var width = linkedInput.width() +
					parseInt(linkedInput.css('padding-right')) +
					parseInt(linkedInput.css('padding-left')) +
					parseInt(linkedInput.css('border-width') || 1) * 2;
				var height = linkedInput.height() +
					parseInt(linkedInput.css('padding-top')) +
					parseInt(linkedInput.css('padding-bottom')) +
					parseInt(linkedInput.css('border-height') || 1) * 2;

				pos.top = pos.top + height;
				$element.offset(pos);
				$element.width(width);
			})
			$element.parent().on('remove', function(){
				$element.remove();
			})
			$element.detach().appendTo('body');


			$element.on('click', 'li', function(e){
				$scope.current = $(this).scope().option;
				$scope.ngModel = $(this).scope().option;
				$scope.$apply('ngModel');
				$scope.$eval($scope.ngChange);
				$scope.$apply('ngModel');
			});
			$element.attr('data-opened-drop-down', true);

		}
	}
});

module.directive('autocomplete', function($compile){
	return {
		restrict: 'E',
		replace: true,
		scope: {
			options: '&',
			ngModel: '=',
			ngChange: '&'
		},
		template: '' +
			'<div class="row">' +
				'<input type="text" class="twelve cell" ng-model="search" translate attr="placeholder" placeholder="search" />' +
				'<div data-drop-down class="drop-down">' +
					'<div>' +
						'<ul class="ten cell right-magnet">' +
							'<li ng-repeat="option in match | limitTo:10" ng-model="option">[[option.toString()]]</li>' +
						'</ul>' +
					'</div>' +
				'</div>' +
			'</div>',
		link: function(scope, element, attributes){
			var dropDownContainer = element.find('[data-drop-down]');
			var linkedInput = element.find('input');
			scope.match = [];

			scope.$watch('search', function(newVal){
				if(!newVal){
					scope.match = [];
					dropDownContainer.addClass('hidden');
					return;
				}
				scope.match = _.filter(scope.options(), function(option){
					var words = newVal.split(' ');
					return _.find(words, function(word){
						var formattedOption = lang.removeAccents(option.toString()).toLowerCase();
						var formattedWord = lang.removeAccents(word).toLowerCase();
						return formattedOption.indexOf(formattedWord) === -1
					}) === undefined;
				});
				if(!scope.match || scope.match.length === 0){
					dropDownContainer.addClass('hidden');
					return;
				}
				dropDownContainer.removeClass('hidden');

				var pos = linkedInput.offset();
				var width = linkedInput.width() +
					parseInt(linkedInput.css('padding-right')) +
					parseInt(linkedInput.css('padding-left')) +
					parseInt(linkedInput.css('border-width') || 1) * 2;
				var height = linkedInput.height() +
					parseInt(linkedInput.css('padding-top')) +
					parseInt(linkedInput.css('padding-bottom')) +
					parseInt(linkedInput.css('border-height') || 1) * 2;

				pos.top = pos.top + height;
				dropDownContainer.offset(pos);
				dropDownContainer.width(width);
			});

			element.parent().on('remove', function(){
				dropDownContainer.remove();
			});
			dropDownContainer.detach().appendTo('body');

			dropDownContainer.on('click', 'li', function(e){
				scope.ngModel = $(this).scope().option;
				scope.search = '';
				scope.$apply('ngModel');
				scope.$eval(scope.ngChange);
				scope.$apply('ngModel');
				dropDownContainer.addClass('hidden');
			});
			dropDownContainer.attr('data-opened-drop-down', true);
		}
	}
});

module.directive('dropDownButton', function(){
	return {
		restrict: 'E',
		transclude: 'true',
		controller: function($scope){
		},
		template: '<div class="drop-down-button hidden"><div ng-transclude></div></div>',
		link: function(scope, element, attributes){
			element.on('click', '.opener', function(){
				if(!element.find('.drop-down-button').hasClass('hidden')){
					element.find('.drop-down-button').addClass('hidden');
				}
				else{
					element.find('.drop-down-button').removeClass('hidden');
				}
			});
		}
	}
});

module.directive('opts', function(){
	return {
		restrict: 'E',
		require: '^dropDownButton',
		transclude: true,
		template: '<div class="options"><ul ng-transclude></ul></div>',
		link: function(scope, element, attributes){
			element.on('click', 'li', function(){
				element.parents('.drop-down-button').addClass('hidden');
			});
		}
	}
});

var ckeEditorFixedPositionning = function(){
	var editableElement;
	var toolbox;

	for(var instance in CKEDITOR.instances){
		$('head').find('[ckestyle=' + CKEDITOR.instances[instance].name + ']').remove();
		toolbox = $('#cke_' + CKEDITOR.instances[instance].name);
		if(!CKEDITOR.instances[instance].element){
			toolbox.remove();
			CKEDITOR.instances[instance].destroy();
			continue;
		}

		editableElement = $(CKEDITOR.instances[instance].element.$);
		if(editableElement.hasClass('contextual-editor')){
			continue;
		}

		toolbox.width(editableElement.width() + 2 + parseInt(editableElement.css('padding') || 4) * 2);
		toolbox.offset({
			top: editableElement.offset().top - toolbox.height(),
			left: editableElement.offset().left
		});
		$('<style ckestyle="' + CKEDITOR.instances[instance].name + '"></style>').text('#cke_' + CKEDITOR.instances[instance].name + '{' +
			'top:' + (editableElement.offset().top - toolbox.height()) + 'px !important;' +
			'left:' + editableElement.offset().left + 'px !important;' +
			'position: absolute !important;' +
			'display: block !important' +
			'}').appendTo('head');
	}
};

function createCKEditorInstance(editor, scope, $compile){
	var ckeInstance;
	CKEDITOR.on('instanceReady', function(ck){
		ckeInstance = ck;
		editor.focus();
		scope.ngModel.assign(scope, scope.ngModel(scope) || '');
		editor.html($compile(scope.ngModel(scope))(scope));
		scope.$apply();
		setTimeout(function(){
			$('input').first().focus();
		}, 500);

		if(scope.ngModel(scope) && scope.ngModel(scope).indexOf('<img') !== -1){
			$('img').on('load', ckeEditorFixedPositionning);
		}
		else{
			ckeEditorFixedPositionning();
		}
		editor.on('focus', function(){
			ckeEditorFixedPositionning();
			editor.css({ cursor: 'text' });
		});
	});

	editor.on('blur', function(e) {
		scope.ngModel.assign(scope, ckeInstance.editor.getData());
		editor.attr('style', '');
		scope.$apply();
	});

	return ckeEditorFixedPositionning;
}

module.directive('textEditor', function($compile){
	return {
		restrict: 'E',
		scope: {
			ngModel: '=',
			watchCollection: '@',
			notify: '=',
			ngChange: '&'
		},
		template: '<div contenteditable="true" style="width: 100%;" class="contextual-editor"></div>' +
			'<linker editor="contextEditor" on-change="updateContent()"></linker>',
		compile: function(){
			CKEDITOR_BASEPATH = '/' + infraPrefix + '/public/ckeditor/';
			if(window.CKEDITOR === undefined){
				loader.syncLoad('ckeditor');
				CKEDITOR.plugins.basePath = '/' + infraPrefix + '/public/ckeditor/plugins/';
			}
			return function(scope, element, attributes){
				if(!scope.display){
					scope.display = {};
				}
				var editor = element.find('[contenteditable=true]');
				var parentElement = element.parents('grid-cell');
				if(parentElement.length === 0){
					parentElement = editor.parent().parent();
				}
				var instance = CKEDITOR.inline(editor[0],
					{ customConfig: '/' + infraPrefix + '/public/ckeditor/text-config.js' }
				);
				scope.contextEditor = instance;
				CKEDITOR.on('instanceReady', function(ck){
					editor.html($compile(scope.ngModel)(scope.$parent));
				});

				scope.$watch('ngModel', function(newVal){
					if(newVal !== editor.html()){
						editor.html($compile(scope.ngModel)(scope.$parent));
						resizeParent();
					}
				});

				editor.on('click', function(){
					if(parentElement.data('resizing') || parentElement.data('dragging')){
						return;
					}
					editor.focus();
				});

				parentElement.on('startDrag', function(){
					editor.blur();
					editor.attr('contenteditable', false);
				});

				parentElement.on('stopDrag', function(){
					editor.attr('contenteditable', true);
				});

				var followResize = true;
				function resizeParent(){
					editor.parent().parent().height(editor.height());
					editor.parent().parent().trigger('stopResize');

					if(followResize){
						setTimeout(resizeParent, 100);
					}
				}

				editor.on('focus', function(){
					followResize = true;

					resizeParent();
					$('.' + instance.id).width(editor.width());
					parentElement.data('lock', true);
					editor.css({ cursor: 'text' });
				});

				editor.on('blur', function(){
					followResize = false;
					resizeParent();
					parentElement.data('lock', false);
					editor.css({ cursor: '' });
					scope.ngModel = editor.html();
					scope.$apply('ngModel');
					if(scope.ngChange){
						scope.ngChange();
					}
				});

				$('body').on('click', '#cke_' + instance.name + ' .cke_button__linker', function(){
					$('#cke_' + instance.name).hide();
					scope.display.chooseLink = true;
					scope.$apply('display');
				});

				element.on('removed', function(){
					for(var instance in CKEDITOR.instances){
						if(CKEDITOR.instances[instance].element.$ === editor[0]){
							CKEDITOR.instances[instance].destroy();
						}
					}
				});
			}
		}
	}
});

module.directive('htmlEditor', function($compile, $parse){
	return {
		restrict: 'E',
		transclude: true,
		replace: true,
		controller: function($scope){
			$scope.notify = null;
		},
		template: '<div class="twelve cell block-editor">' +
			'<div contenteditable="true" class="editor-container twelve cell" loading-panel="ckeditor-image">' +
			'</div><div class="clear"></div>' +
			'<linker editor="contextEditor" on-change="updateContent()"></linker>' +
			'<lightbox show="selectFiles" on-close="selectFiles = false;">' +
			'<media-library ng-model="selected.files" ng-change="addContent()" multiple="true" file-format="format">' +
			'</media-library></lightbox>' +
            '<lightbox show="inputVideo" on-close="inputVideo = false">' +
                '<p style="padding-bottom: 10px;">' +
                    'Au préalable, votre vidéo doit être enregistrée sur une plateforme de partage ' +
                    '(Youtube, Vimeo, ScolaWebTV, etc.). <br />Pour l\'insérer ici, copiez le le lien de partage "embed" et collez-le ci-dessous.' +
                '</p>' +
                '<input type="test" ng-model="videoText" style="border: 0; width: 99%; margin-bottom: 10px; height: 20px; border-bottom: 1px dashed black; border-top: 1px dashed black;"/>' +
                '<div style="text-align: center"><button type="button" ng-click="addVideoLink(videoText)">Valider</button></div>' +
            '</lightbox>' +
            '</div>',
		compile: function(element, attributes, transclude){
			CKEDITOR_BASEPATH = '/' + infraPrefix + '/public/ckeditor/';
			if(window.CKEDITOR === undefined){
				loader.syncLoad('ckeditor');
				CKEDITOR.plugins.basePath = '/' + infraPrefix + '/public/ckeditor/plugins/';

			}
			return function(scope, element, attributes){
				scope.ngModel = $parse(attributes.ngModel);
				if(!scope.ngModel(scope)){
					scope.ngModel.assign(scope, '');
				}
				scope.notify = scope.$eval(attributes.notify);
				if(!scope.display){
					scope.display = {};
				}

				scope.selected = { files: [], link: '' };

				if(!attributes.fileUploadPath){
					attributes.fileUploadPath = "'/workspace/document?application=' + appPrefix + '-stored-resources&protected=true'"
				}

				CKEDITOR.fileUploadPath = scope.$eval(attributes.fileUploadPath);
				var editor = element.find('[contenteditable=true]');
				var contextEditor = CKEDITOR.inline(editor[0]);
				scope.contextEditor = contextEditor;

				createCKEditorInstance(editor, scope, $compile);

				scope.$watch(attributes.ngModel, function(newValue){
					if(editor.html() !== newValue){
						editor.html($compile(newValue)(scope));
						//weird browser bug with audio tags
						editor.find('audio').each(function(index, item){
							var parent = $(item).parent();
							$(item)
								.attr("src", item.src)
								.detach()
								.appendTo(parent);
						});
					}
				});

				element.on('removed', function(){
					setTimeout(function(){
						ckeEditorFixedPositionning();
					}, 0);
				});

				$('body').on('click', '.cke_button__upload', function(){
					var resize = editor.width();
					if(workspace.thumbnails.indexOf(resize) === -1){
						workspace.thumbnails += '&thumbnail=' + resize + 'x0';
					}
					scope.selectFiles = true;
					scope.format = 'img';
					scope.$apply('selectFiles');
					scope.$apply('format');
				});

				$('body').on('click', '.cke_button__audio', function(){
					scope.selectFiles = true;
					scope.format = 'audio';
					scope.$apply('selectFiles');
					scope.$apply('format');
				});

				$('body').on('click', '.cke_button__linker', function(){
					scope.display.chooseLink = true;
					scope.$apply('chooseLink');
				});

                $('body').on('click', '.cke_button__video', function(){
                    scope.inputVideo = true;
                    scope.$apply('inputVideo');
                });

                scope.addVideoLink = function(htmlText){
                    //TODO : Escape dangerous html
                    contextEditor.insertHtml(htmlText);
                    scope.inputVideo = false
                };

				scope.updateContent = function(){
					scope.ngModel.assign(scope, editor.html());
				};

				scope.addContent = function(){
					scope.selected.files.forEach(function(file){
						if(!file._id){
							return;
						}

						if(scope.format === 'img'){
							var imageLink = contextEditor.document.createElement('a');
							imageLink.setAttribute('href', '/workspace/document/' + file._id + '?thumbnail=' + editor.width() + 'x0');
							imageLink.setAttribute('target', '_blank');
							var image = contextEditor.document.createElement('img');
							image.setAttribute('src', '/workspace/document/' + file._id + '?thumbnail=' + editor.width() + 'x0');
							imageLink.append(image);
							contextEditor.insertElement(imageLink);
						}
						if(scope.format === 'audio'){
							var sound = contextEditor.document.createElement('audio');

							sound.setAttribute('src', '/workspace/document/' + file._id);
							sound.setAttribute('controls', 'controls');

							contextEditor.insertElement(sound);
						}

						scope.updateContent();
					});
					scope.selectFiles = false;
				};

				if(!attributes.watchCollections){
					return;
				}

				scope.$eval(attributes.watchCollections).forEach(function(col){
					scope.$watchCollection(col, function(){
						setTimeout(ckeEditorFixedPositionning, 200);
					});
				});
			}
		}
	}
});

module.directive('htmlInlineEditor', function($compile){
    return {
        restrict: 'E',
        scope: {
            ngModel: '=',
            notify: '=',
            ngChange: '&'
        },
        template: '<div style="width: 100%;"><div contenteditable="true" style="width: 100%; min-height: 24px" class="contextual-editor"></div>' +
            '<linker editor="contextEditor" on-change="updateContent()"></linker>' +
            '<lightbox show="selectFiles" on-close="selectFiles = false;">' +
            '<media-library ng-model="selected.files" ng-change="addContent()" multiple="true" file-format="format">' +
            '</media-library></lightbox>' +
            '<lightbox show="inputVideo" on-close="inputVideo = false">' +
                '<p style="padding-bottom: 10px;">' +
                    'Au préalable, votre vidéo doit être enregistrée sur une plateforme de partage ' +
                    '(Youtube, Vimeo, ScolaWebTV, etc.). <br />Pour l\'insérer ici, copiez le le lien de partage "embed" et collez-le ci-dessous.' +
                '</p>' +
                '<input type="test" ng-model="videoText" style="border: 0; width: 99%; margin-bottom: 10px; height: 20px; border-bottom: 1px dashed black; border-top: 1px dashed black;"/>' +
                '<div style="text-align: center"><button type="button" ng-click="addVideoLink(videoText)">Valider</button></div>' +
            '</lightbox>' +
            '</div>',
        compile: function($element, $attributes, $transclude){
            CKEDITOR_BASEPATH = '/' + infraPrefix + '/public/ckeditor/';
            if(window.CKEDITOR === undefined){
                loader.syncLoad('ckeditor');
                CKEDITOR.plugins.basePath = '/' + infraPrefix + '/public/ckeditor/plugins/';
            }

            //// Link function ////
            return function($scope, $element, $attributes){
				if(!$scope.display){
					$scope.display = {};
				}
                $scope.selected = { files: [], link: '' };

                if(!$attributes.fileUploadPath){
                    $attributes.fileUploadPath = "'/workspace/document?application=' + appPrefix + '-stored-resources&protected=true'"
                }

                CKEDITOR.fileUploadPath = $scope.$eval($attributes.fileUploadPath);

                var editor = $element.find('[contenteditable=true]');
                var parentElement = $element.parents('grid-cell');
                if(parentElement.length === 0){
                    parentElement = editor.parent().parent();
                }
                var instance = CKEDITOR.inline(editor[0]);
                var contextEditor = instance;
                $scope.contextEditor = instance;

                //editor.html($scope.ngModel);
                CKEDITOR.on('instanceReady', function(ck){
                    editor.html($compile($scope.ngModel)($scope.$parent));
                });
                $scope.$watch('ngModel', function(newVal){
                    if(newVal !== editor.html()){
                        editor.html($compile($scope.ngModel)($scope.$parent));
                    }
                });

                editor.on('click', function(){
                    if(parentElement.data('resizing') || parentElement.data('dragging')){
                        return;
                    }
                    editor.focus();
                });
                $element.parent().on('startDrag', function(){
                    editor.blur();
                });

                editor.on('focus', function(){
                    $('.' + instance.id).width(editor.width());
                    parentElement.data('lock', true);
                    editor.css({ cursor: 'text' });
                });

                editor.on('blur', function(){
                    parentElement.data('lock', false);
                    editor.css({ cursor: '' });
                    $scope.ngModel = editor.html();
                    $scope.$apply('ngModel');
                    if($scope.ngChange){
                        $scope.ngChange();
                    }
                });

                $scope.updateContent = function(){
                    var content = editor.html();
                    if(content.indexOf(';base64,') !== -1){
                        $scope.notify.error('Une image est corrompue')
                    }
                    editor.find('img').each(function(index, item){
                        if($(item).attr('src').indexOf(';base64,') !== -1){
                            $(item).remove();
                        }
                    })

                    $scope.ngModel = editor.html();
                }

                $scope.addContent = function(){
                    $scope.selected.files.forEach(function(file){
                        if(!file._id){
                            return;
                        }

                        if($scope.format === 'img'){
                            var src = 'src = "/workspace/document/' + file._id + '?thumbnail=' + editor.width() + 'x0"';
							var image = contextEditor.document.createElement($compile('<img '+src+' resizable-element></img>')($scope)[0]);
                            contextEditor.insertElement(image);
                        }
                        if($scope.format === 'audio'){
                            var sound = contextEditor.document.createElement('audio');

                            sound.setAttribute('src', '/workspace/document/' + file._id);
                            sound.setAttribute('controls', 'controls');

                            contextEditor.insertElement(sound);
                        }

                        $scope.updateContent();
                    });
                    $scope.selectFiles = false;
                };

                $scope.addVideoLink = function(htmlText){
                    //TODO : Escape dangerous html
                    instance.insertHtml(htmlText)
                    $scope.inputVideo = false
                }

                $element.on('removed', function(){
                    for(var instance in CKEDITOR.instances){
                        if(CKEDITOR.instances[instance].element.$ === editor[0]){
                            CKEDITOR.instances[instance].destroy();
                        }
                    }
                });

                contextEditor.on('contentDom', function(ck){
                    $('#cke_'+ck.editor.name).on('click', '.cke_button__linker', function(){
                        $scope.display.chooseLink = true;
                        $scope.$apply('display');
                    });

                    $('#cke_'+ck.editor.name).on('click', '.cke_button__upload', function(){
                        var resize = editor.width();
                        if(workspace.thumbnails.indexOf(resize) === -1){
                            workspace.thumbnails += '&thumbnail=' + resize + 'x0';
                        }
                        $scope.selectFiles = true;
                        $scope.format = 'img';
                        $scope.$apply('selectFiles');
                        $scope.$apply('format');
                    });

                    $('#cke_'+ck.editor.name).on('click', '.cke_button__audio', function(){
                        $scope.selectFiles = true;
                        $scope.format = 'audio';
                        $scope.$apply('selectFiles');
                        $scope.$apply('format');
                    });

                    $('#cke_'+ck.editor.name).on('click', '.cke_button__video', function(){
                        $scope.inputVideo = true;
                        $scope.$apply('inputVideo');
                    });

                });
            }
        }
    }
})


module.directive('loadingIcon', function($compile){
	return {
		restrict: 'E',
		link: function($scope, $element, $attributes){
			var addImage = function(){
				var loadingIllustrationPath = $('#theme').attr('href').split('/theme.css')[0] + '/../img/icons/anim_loading_small.gif';
				$('<img>')
					.attr('src', loadingIllustrationPath)
					.attr('class', $attributes.class)
					.addClass('loading-icon')
					.appendTo($element);
			};
			if($attributes.default=== 'loading'){
				addImage();
			}
			http().bind('request-started.' + $attributes.request, function(e){
				$element.find('img').remove();
				addImage();
			});

            if($attributes.onlyLoadingIcon === undefined){
    			http().bind('request-ended.' + $attributes.request, function(e){
    				var loadingDonePath = $('#theme').attr('href').split('/theme.css')[0] + '/../img/icons/checkbox-checked.png';
    				$element.find('.loading-icon').remove();
    				$('<img>')
    					.attr('src', loadingDonePath)
    					.appendTo($element);
    			});
            } else {
                http().bind('request-ended.' + $attributes.request, function(e){
                    $element.find('img').remove();
                })
            }
		}
	}
})

module.directive('loadingPanel', function($compile){
	return {
		restrict: 'A',
		link: function($scope, $element, $attributes){
			$attributes.$observe('loadingPanel', function(val) {
				http().bind('request-started.' + $attributes.loadingPanel, function(e){
					var loadingIllustrationPath = $('#theme').attr('href').split('/theme.css')[0] + '/../img/illustrations/loading.gif';
					$element.append('<div class="loading-panel">' +
						'<h1>' + lang.translate('loading') + '</h1>' +
						'<img src="' + loadingIllustrationPath + '" />' +
						'</div>');

				})
				http().bind('request-ended.' + $attributes.loadingPanel, function(e){
					$element.find('.loading-panel').remove();
				})
			});
		}
	}
});

module.directive('workflow', function($compile){
	return {
		restrict: 'A',
		link: function($scope, $element, $attributes){
			var auth = $attributes.workflow.split('.');
			var right = model.me.workflow;
			auth.forEach(function(prop){
				right = right[prop];
			});
			var content = $element.children();
			if(!right){
				content.remove();
				$element.hide();
			}
			else{
				$element.show();
				$element.append(content);
			}
		}
	}
});

module.directive('tooltip', function($compile){
	return {
		restrict: 'A',
		link: function(scope, element, attributes){
			element.on('mouseover', function(){
				if(!attributes.tooltip || attributes.tooltip === 'undefined'){
					return;
				}
				var tip = $('<div />')
					.addClass('tooltip')
					.html($compile('<div class="arrow"></div><div class="content">' + lang.translate(attributes.tooltip) + '</div> ')(scope))
					.appendTo('body');
				scope.$apply();

				tip.offset({
					top: parseInt(element.offset().top + element.height()),
					left: parseInt(element.offset().left + element.width() / 2 - tip.width() / 2)
				});
				tip.fadeIn();
				element.one('mouseout', function(){
					tip.fadeOut(200, function(){
						tip.remove();
					})
				});
			});

		}
	}
});

module.directive('behaviour', function($compile){
	return {
		restrict: 'E',
		template: '<div ng-transclude></div>',
		replace: false,
		transclude: true,
		scope: {
			resource: '='
		},
		link: function($scope, $element, $attributes){
			if(!$attributes.name){
				throw "Behaviour name is required";
			}
			var content = $element.children('div');
			$scope.$watch('resource', function(newVal){
				var hide = ($scope.resource instanceof Array && _.find($scope.resource, function(resource){ return !resource.myRights || resource.myRights[$attributes.name] === undefined; }) !== undefined) ||
					($scope.resource instanceof Model && (!$scope.resource.myRights || !$scope.resource.myRights[$attributes.name]));

				if(hide){
					content.remove();
				}
				else{
					$element.append(content);
				}

			});
		}
	}
});

module.directive('bottomScroll', function($compile){
	return {
		restrict: 'A',
		link: function($scope, $element, $attributes){
			$(window).scroll(function(){
				var scrollHeight = window.scrollY || document.getElementsByTagName('html')[0].scrollTop;
				//adding ten pixels to account for system specific behaviours
				scrollHeight += 10;

				if($(document).height() - $(window).height() < scrollHeight){
					$scope.$eval($attributes.bottomScroll);
					if(!$scope.$$phase){
						$scope.$apply();
					}

				}
			})
		}
	}
});

module.directive('bottomScrollAction', function($compile){
    return {
        restrict: 'A',
        link: function($scope, $element, $attributes){
            $element[0].onscroll = function(){
                if(this.scrollHeight - this.scrollTop === this.clientHeight){
                    this.scrollTop = this.scrollTop - 1
                    $scope.$eval($attributes.bottomScrollAction);
                    if(!$scope.$$phase){
                        $scope.$apply();
                    }
                }
            }
        }
    }
});

module.directive('drawingZone', function(){
	return function($scope, $element, $attributes){
		$element.addClass('drawing-zone');
	};
});

module.directive('resizableElement', function(){
	return{
		restrict: 'A',
		link: function($scope, $element, $attributes){

			if($scope.disableResizableElement === true)
				return;

			//Disable drag'n'drop
			$element.on('dragstart', function(){
				return false;
			})

			//True if the left mouse button is pressed
			var clicked = false

			//Get mouse position on screen
			var mousePos = function(event){
				return {
					x: event.pageX,
					y: event.pageY
				}
			}

			//Get html element borders positions on screen
			var getElementBorders = function(){
				return {
					right   : $element.offset().left + $element.width(),
					left    : $element.offset().left,
					top     : $element.offset().top,
					bottom  : $element.offset().top + $element.height()
				}
			}

			//Acceptable delta
			var DELTA_BORDER = 5
			//Tests if the mouse is moving over a border
			var getMouseBorders = function(event){
				var borders = getElementBorders()
				var pos     = mousePos(event)

				return {
					left    : borders.left + DELTA_BORDER > pos.x && borders.left - DELTA_BORDER < pos.x,
					right   : borders.right + DELTA_BORDER > pos.x && borders.right - DELTA_BORDER < pos.x,
					top     : borders.top + DELTA_BORDER > pos.y && borders.top - DELTA_BORDER < pos.y,
					bottom  : borders.bottom + DELTA_BORDER > pos.y && borders.bottom - DELTA_BORDER < pos.y
				}

			}

			//Icon change
			var changeIcon = function(e){
				var resizeLimits = getMouseBorders(e)

				var orientations = {
					'ns': resizeLimits.top || resizeLimits.bottom,
					'ew': resizeLimits.left || resizeLimits.right,
					'nwse': (resizeLimits.bottom && resizeLimits.right) || (resizeLimits.top && resizeLimits.left),
					'nesw': (resizeLimits.bottom && resizeLimits.left) || (resizeLimits.top && resizeLimits.right)

				}

				var cursor = ''
				for(var orientation in orientations){
					if(orientations[orientation]){
						cursor = orientation;
					}
				}

				if(cursor){
					cursor = cursor + '-resize'
				} else
					cursor = 'auto'

				$element.css({ cursor: cursor })
			}

			//Element size backup
			var oldElement = {
				width : $element.width(),
				height : $element.height(),
				offset: $element.offset()
			}

			//Resize function
			var resizeElement = function(e){
				var pos = mousePos(e)

				if(clickBorder.bottom){
					$element.height(pos.y - oldElement.offset.top)
				} else if(clickBorder.top){
					$element.height(oldElement.height + (oldElement.offset.top - pos.y))
				}

				if(clickBorder.left){
					$element.width(oldElement.width + (oldElement.offset.left - pos.x))
				} else if(clickBorder.right){
					$element.width(pos.x - oldElement.offset.left)
				}
			}

			$element.on('mouseover', function(e){
				$element.on('mousemove', function(e){
					if(!clicked)
						changeIcon(e)
				})

				$element.on('mouseout', function(e){
					$element.unbind('mousemove')
					if(!clicked)
						$element.css({ cursor: 'auto' })
				})
			})

			$element.on('mousedown', function(e){
				clicked = true
				oldElement = {
					width : $element.width(),
					height : $element.height(),
					offset: $element.offset()
				}
				clickBorder = getMouseBorders(e)
				$(window).on('mousemove.resize.element', function(e){
					resizeElement(e)
				})
			})
			$(window).on('mouseup', function(e){
				clicked = false
				$element.css({ cursor: 'auto' })
				$(window).unbind('mousemove.resize.element')
			})

		}
	}
})

module.directive('resizable', function(){
	return {
		restrict: 'A',
		link: function(scope, element, attributes){
			$('body').css({
				'-webkit-user-select': 'none',
				'-moz-user-select': 'none',
				'user-select' : 'none'
			});

			//cursor styles to indicate resizing possibilities
			element.on('mouseover', function(e){
				element.on('mousemove', function(e){
					if(element.data('resizing') || element.data('lock')){
						return;
					}
					var mouse = { x: e.pageX, y: e.pageY };
					var resizeLimits = {
						horizontalRight:  element.offset().left + element.width() + 5 > mouse.x && mouse.x > element.offset().left + element.width() - 15 && element.attr('horizontal-resize-lock') === undefined,
						horizontalLeft: element.offset().left + 5 > mouse.x && mouse.x > element.offset().left - 15 && element.attr('horizontal-resize-lock') === undefined,
						verticalTop: element.offset().top + 5 > mouse.y && mouse.y > element.offset().top - 5 && element.attr('vertical-resize-lock') === undefined,
						verticalBottom: element.offset().top + element.height() + 5 > mouse.y && mouse.y > element.offset().top + element.height() - 5 && element.attr('vertical-resize-lock') === undefined
					};

					var orientations = {
						'ns': resizeLimits.verticalTop || resizeLimits.verticalBottom,
						'ew': resizeLimits.horizontalLeft || resizeLimits.horizontalRight,
						'nwse': (resizeLimits.verticalBottom && resizeLimits.horizontalRight) || (resizeLimits.verticalTop && resizeLimits.horizontalLeft),
						'nesw': (resizeLimits.verticalBottom && resizeLimits.horizontalLeft) || (resizeLimits.verticalTop && resizeLimits.horizontalRight)

					};

					var cursor = '';
					for(var orientation in orientations){
						if(orientations[orientation]){
							cursor = orientation;
						}
					}


					if(cursor){
						cursor = cursor + '-resize';
					}
					element.css({ cursor: cursor });
					element.find('[contenteditable]').css({ cursor: cursor });
				});
				element.on('mouseout', function(e){
					element.unbind('mousemove');
				});
			});

			//actual resize
			element.on('mousedown.resize', function(e){
				if(element.data('lock') === true || element.data('resizing') === true){
					return;
				}
				element.trigger('startResize');
				e.preventDefault();
				var interrupt = false;
				var mouse = { y: e.pageY, x: e.pageX };
				var resizeLimits = {
					horizontalRight:  element.offset().left + element.width() + 15 > mouse.x && mouse.x > element.offset().left + element.width() - 15 && element.attr('horizontal-resize-lock') === undefined,
					horizontalLeft: element.offset().left + 15 > mouse.x && mouse.x > element.offset().left - 15 && element.attr('horizontal-resize-lock') === undefined,
					verticalTop: element.offset().top + 5 > mouse.y && mouse.y > element.offset().top - 15 && element.attr('vertical-resize-lock') === undefined,
					verticalBottom: element.offset().top + element.height() + 5 > mouse.y && mouse.y > element.offset().top + element.height() - 5 && element.attr('vertical-resize-lock') === undefined
				};

				var initial = {
					pos: element.offset(),
					size: {
						width: element.width(),
						height: element.height()
					}
				};
				var parent = element.parents('.drawing-zone');
				var parentData = {
					pos: parent.offset(),
					size: {
						width: parent.width(),
						height: parent.height()
					}
				};

				if(resizeLimits.horizontalLeft || resizeLimits.horizontalRight ||resizeLimits.verticalTop || resizeLimits.verticalBottom){
					element.data('resizing', true);
					$('.main').css({
						'cursor': element.css('cursor')
					});
					$(window).unbind('mousemove.drag');
					$(window).on('mousemove.resize', function(e){
						element.unbind("click");
						mouse = {
							y: e.pageY,
							x: e.pageX
						};
					});

					//animation for resizing
					var resize = function(){
						var newWidth = 0; var newHeight = 0;
						if(resizeLimits.horizontalLeft || resizeLimits.horizontalRight){
							var p = element.offset();
							if(resizeLimits.horizontalLeft){
								var distance = initial.pos.left - mouse.x;
								if(initial.pos.left - distance < parentData.pos.left){
									distance = initial.pos.left - parentData.pos.left;
								}
								element.offset({
									left: initial.pos.left - distance,
									top: p.top
								});
								newWidth = initial.size.width + distance;
							}
							else{
								var distance = mouse.x - p.left;
								if(element.offset().left + distance > parentData.pos.left + parentData.size.width){
									distance = (parentData.pos.left + parentData.size.width) - element.offset().left - 2;
								}
								newWidth = distance;
							}
							if(newWidth > 0){
								element.width(newWidth);
							}
						}
						if(resizeLimits.verticalTop || resizeLimits.verticalBottom){
							var p = element.offset();
							if(resizeLimits.verticalTop){
								var distance = initial.pos.top - mouse.y;
								if(initial.pos.top - distance < parentData.pos.top){
									distance = initial.pos.top - parentData.pos.top;
								}
								element.offset({
									left: p.left,
									top: initial.pos.top - distance
								});
								newHeight = initial.size.height + distance;
							}
							else{
								var distance = mouse.y - p.top;
								if(element.offset().top + distance > parentData.pos.top + parent.height()){
									distance = (parentData.pos.top + parentData.size.height) - element.offset().top - 2;
								}
								newHeight = distance;
							}
							if(newHeight > 0){
								element.height(newHeight);
							}
						}
						element.trigger('resizing');
						if(!interrupt){
							requestAnimationFrame(resize);
						}
					};
					resize();

					$(window).on('mouseup.resize', function(){
						interrupt = true;
						setTimeout(function(){
							element.data('resizing', false);
							element.trigger('stopResize');
						}, 100);
						$(window).unbind('mousemove.resize');
						$('body').unbind('mouseup.resize');
						$('.main').css({'cursor': ''})
					});
				}
			});
		}
	}
});

module.directive('drawingGrid', function(){
	return function(scope, element, attributes){
		element.addClass('drawing-grid');
		element.on('click', function(e){
			element.parents('grid-cell').data('lock', true);

			$('body').on('click.lock', function(){
				element.parents('grid-cell').data('lock', false);
				$('body').unbind('click.lock')
			});
		});
	};
});

module.directive('gridRow', function($compile){
	return {
		restrict: 'E',
		transclude: true,
		replace: true,
		template: '<div class="row grid-row" ng-transclude></div>',
		scope: {
			index: '='
		},
		link: function(scope, element, attributes){
			element.addClass('row');
		}
	}
});

module.directive('gridCell', function($compile){
	return {
		restrict: 'E',
		scope: {
			w: '=',
			h: '=',
			index: '=',
			row: '=',
			className: '=',
			onIndexChange: '&',
			onRowChange: '&'
		},
		template: '<div class="media-wrapper"><div class="media-container" ng-class="className" ng-transclude></div></div>',
		transclude: true,
		link: function(scope, element, attributes){
			var cellSizes = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
			scope.$watch('w', function(newVal, oldVal){
				element.addClass(cellSizes[newVal]);
				if(newVal !== oldVal){
					element.removeClass(cellSizes[oldVal]);
				}
			});

			scope.$watch('h', function(newVal, oldVal){
				element.addClass('height-' + cellSizes[newVal]);
				if(newVal !== oldVal){
					element.removeClass('height-' + cellSizes[oldVal]);
				}
			});

			scope.$watch('className', function(newVal){
				newVal.forEach(function(cls){
					element.addClass(cls);
				});
			});
		}
	}
});

module.directive('gridResizable', function($compile){
	return {
		restrict: 'A',
		link: function(scope, element, attributes){
			$('body').css({
				'-webkit-user-select': 'none',
				'-moz-user-select': 'none',
				'user-select' : 'none'
			});

			var cellSizes = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
			var resizeLimits = {};
			var parent = element.parents('.drawing-grid');

			element.addClass('grid-media');

			var lock = {};

			//cursor styles to indicate resizing possibilities
			element.on('mouseover', function(e){
				element.on('mousemove', function(e){
					if(element.data('resizing') || element.data('lock')){
						return;
					}

					if(element.find('grid-cell, sniplet').length > 0){
						lock.vertical = true;
					}

					var mouse = { x: e.pageX, y: e.pageY };
					resizeLimits = {
						horizontal:  element.offset().left + element.width() + 5 > mouse.x && mouse.x > element.offset().left + element.width() - 15,
						vertical: (element.offset().top + (element.height() + parseInt(element.css('padding-bottom'))) +
							5 > mouse.y && mouse.y > element.offset().top + (element.height() + parseInt(element.css('padding-bottom'))) - 15) && !lock.vertical
					};

					var orientations = {
						'ns': resizeLimits.vertical,
						'ew': resizeLimits.horizontal,
						'nwse': resizeLimits.vertical && resizeLimits.horizontal

					};

					var cursor = '';
					for(var orientation in orientations){
						if(orientations[orientation]){
							cursor = orientation;
						}
					}

					if(cursor){
						cursor = cursor + '-resize';
					}

					element.css({ cursor: cursor });
					element.find('*').css({ cursor: cursor });
				});
				element.on('mouseout', function(e){
					element.unbind('mousemove');
				});
			});

			//actual resize
			element.on('mousedown.resize', function(e){
				if(element.data('lock') === true || element.data('resizing') === true || (!resizeLimits.horizontal && !resizeLimits.vertical)){
					return;
				}
				var mouse = { y: e.pageY, x: e.pageX };
				var cellWidth = parseInt(element.parent().width() / 12);
				var cells = element.parent().children('grid-cell');
				var interrupt = false;
				var parentData = {
					pos: element.parents('.grid-row').offset(),
					size: {
						width: element.parents('.grid-row').width(),
						height: element.parents('.grid-row').height()
					}
				};

				if(resizeLimits.horizontal || resizeLimits.vertical){
					cells.data('lock', true);
				}

				function findResizableNeighbour(cell, step){
					var neighbour = cell.next('grid-cell');
					if(neighbour.length < 1){
						return;
					}
					if(neighbour.width() - step <= cellWidth){
						return findResizableNeighbour(neighbour, step);
					}
					else{
						return neighbour;
					}
				}

				function parentRemainingSpace(diff){
					var rowWidth = element.parent().width();
					var childrenSize = 0;
					cells.each(function(index, cell){
						childrenSize += $(cell).width();
					});
					return  rowWidth - (childrenSize + diff + 2 * cells.length);
				}

				e.preventDefault();

				$(window).unbind('mousemove.drag');
				$(window).on('mousemove.resize', function(e){
					mouse = {
						y: e.pageY,
						x: e.pageX
					};

					if(element.data('resizing')){
						return;
					}

					cells.trigger('startResize');
					cells.removeClass('grid-media');

					//this makes sure the cursor doesn't change when we move the mouse outside the element
					$('.main').css({
						'cursor': element.css('cursor')
					});

					element.unbind("click");

					// the element height is converted in padding-bottom if vertical resize happens
					// this is done in order to keep it compatible with the grid, which is based on padding
					if(resizeLimits.vertical){
						element.css({ 'padding-bottom': element.height() + 'px' });
						element.height(0);
					}

					//animation for resizing
					var resize = function(){
						//current element resizing
						var newWidth = 0; var newHeight = 0;
						var p = element.offset();

						//horizontal resizing
						if(resizeLimits.horizontal){
							var distance = mouse.x - p.left;
							if(element.offset().left + distance > parentData.pos.left + parentData.size.width){
								distance = (parentData.pos.left + parentData.size.width) - element.offset().left - 2;
							}
							newWidth = distance;
							if (newWidth < cellWidth) {
								newWidth = cellWidth;
							}
							var diff = newWidth - element.width();

							//neighbour resizing
							var remainingSpace = parentRemainingSpace(diff);
							var neighbour = findResizableNeighbour(element, distance - element.width());

							if(neighbour || remainingSpace >= 0){
								if(neighbour && remainingSpace <= 0){
									var neighbourWidth = neighbour.width() + remainingSpace;
									if(neighbourWidth < cellWidth){
										newWidth -= cellWidth - neighbourWidth;
										neighbourWidth = cellWidth;
									}
									neighbour.width(neighbourWidth);
								}
								element.width(newWidth);
							}
						}

						//vertical resizing
						if(resizeLimits.vertical){
							var distance = mouse.y - p.top;
							newHeight = distance;
							element.css({ 'padding-bottom': newHeight });
						}

						if(!interrupt){
							requestAnimationFrame(resize);
						}
					};
					resize();
				});

				$(window).on('mouseup.resize', function(){
					cells.trigger('stopResize');
					interrupt = true;

					cells.each(function(index, cell){
						var width = $(cell).width();
						var height = parseInt($(cell).css('padding-bottom'));
						if(height < cellWidth / 2){
							height = 0;
						}
						var cellWIndex = Math.round(width * 12 / parentData.size.width);
						var cellHIndex = Math.round(height * 12 / parentData.size.width);
						var cellScope = angular.element(cell).scope();
						cellScope.w = cellWIndex;
						cellScope.h = cellHIndex;
						cellScope.$apply('w');
						cellScope.$apply('h');
					});

					setTimeout(function(){
						cells.data('resizing', false);
						cells.data('lock', false);
						cells.attr('style', '');
						cells.addClass('grid-media');
						element.find('*').css({ cursor: 'inherit' });
					}, 100);
					$(window).unbind('mousemove.resize');
					$(window).unbind('mouseup.resize');
					$('.main').css({'cursor': ''})
				});
			});
		}
	}
});

module.directive('gridDraggable', function($compile){
	return {
		restrict: 'A',
		link: function(scope, element, attributes){
			element.attr('draggable', false);
			element.on('mousedown', function(e){
				var parent = element.parents('.drawing-grid');
				if(element.data('lock') === true || parent.first().hasClass('blur-grid')){
					return;
				}

				var interrupt = false;
				var mouse = { y: e.clientY, x: e.clientX };
				var cellSizes = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
				var row = element.parent();
				var cells = row.children('grid-cell');
				var parentData = {
					width: element.parents('.row').width(),
					height: element.parents('.row').height(),
					left: parent.offset().left,
					top: parent.offset().top
				};
				var elementPos = {
					left: element.position().left,
					top: element.position().top,
					width: element.width(),
					height: element.height() + parseInt(element.css('padding-bottom'))
				};

				function rowFull(row){
					var cellsWidth = 0;
					row.children('grid-cell').each(function(index, item){
						cellsWidth += $(item).width();
					});

					return cellsWidth + elementPos.width > row.width();
				}

				$(window).on('mousemove.drag', function(e){
					if(e.clientX === mouse.x && e.clientY === mouse.y){
						return;
					}
					if(element.data('resizing') !== true && element.data('dragging') !== true){
						element.trigger('startDrag');

						var elementDistance = {
							y: mouse.y - element.offset().top,
							x: mouse.x - element.offset().left
						};

						$('body').css({
							'-webkit-user-select': 'none',
							'-moz-user-select': 'none',
							'user-select' : 'none'
						});

						element.parent().height(element.height() + parseInt(element.css('padding-bottom')));

						element.css({
							'position': 'absolute',
							'z-index': '900'
						});

						element.next({ 'margin-left': (element.width() - 2) + 'px' });

						element.unbind("click");
						element.find('img, button, div').css({ 'pointer-events': 'none' });
						element.data('dragging', true);

						moveElement(elementDistance);
					}
					mouse = {
						y: e.clientY,
						x: e.clientX
					};
				});

				$(window).on('mouseup.drag', function(e){
					element.trigger('stopDrag');
					$('body').css({
						'-webkit-user-select': 'initial',
						'-moz-user-select': 'initial',
						'user-select' : 'initial'
					});
					interrupt = true;
					$('body').unbind('mouseup.drag');
					$(window).unbind('mousemove.drag');

					if(element.data('dragging') === true){
						cells.removeClass('grid-media');
						elementPos.left = element.position().left;
						elementPos.top = element.offset().top;

						var row = element.parent();

						parent.find('.grid-row').each(function(index, item){
							if(elementPos.top + elementPos.height / 2 > $(item).offset().top && elementPos.top + elementPos.height / 2 < $(item).offset().top + $(item).prev().height()){
								if(!rowFull($(item))){
									setTimeout(function(){
										scope.row = angular.element(item).scope().index;
										scope.$apply('row');
										scope.onRowChange();
									}, 0);
								}
								row = $(item);
								cells = row.children('grid-cell');
								return false;
							}
						});

						var found = false;
						var cellI = 0;
						cells.each(function(index, item){
							if(item === element[0]){
								return;
							}
							if(parseInt($(item).css('margin-left')) > 0){
								if(scope.index !== cellI){
									scope.index = cellI;
									scope.$apply('index');
									if(row[0] === element.parent()[0]){
										scope.onIndexChange();
									}
								}
								found = true;
								return false;
							}
							cellI ++;
						});

						if(!found){
							var index = cells.length - 1;
							if(scope.index !== index){
								scope.index = index;
								scope.$apply('index');
								if(row[0] === element.parent()[0]){
									scope.onIndexChange();
								}
							}
						}
					}

					setTimeout(function(){
						parent.find('grid-cell').css({ 'margin-left': '0' });
						setTimeout(function(){
							cells.addClass('grid-media');
						}, 100);

						element.data('dragging', false);
						element.on('click', function(){
							scope.$parent.$eval(attributes.ngClick);
						});
						element.find('img, button, div').css({ 'pointer-events': 'all' });
						element.css({
							position: '',
							left: 'auto',
							top: 'auto'
						});
						element.parent().attr('style', ' ');

					}, 20);
				});

				var moveElement = function(elementDistance){
					var parent = element.parents('.drawing-grid');
					var newOffset = {
						top: mouse.y - elementDistance.y,
						left: mouse.x - elementDistance.x
					};

					element.offset(newOffset);

					//preview new cells order
					var row = element.parent();
					parent.find('.grid-row').each(function(index, item){
						if(newOffset.top + elementPos.height / 2 > $(item).offset().top && newOffset.top + elementPos.height / 2 < $(item).offset().top + $(item).prev().height()){
							row = $(item);
							return false;
						}
					});

					parent.find('grid-cell').css({ 'margin-left': '0' });

					cells = row.children('grid-cell');
					if(row[0] === element.parent()[0] || !rowFull(row)){
						var cumulatedWidth = row.offset().left;
						cells.each(function(index, item){
							if(item === element[0]){
								return;
							}
							cumulatedWidth += $(item).width();
							if(cumulatedWidth - $(item).width() / 2 > newOffset.left){
								$(item).css({ 'margin-left': (elementPos.width - 2) + 'px' });
								return false;
							}
						});
					}

					if(!interrupt){
						requestAnimationFrame(function(){
							moveElement(elementDistance);
						});
					}
				};
			});
		}
	}
});

module.directive('sniplet', function($parse, $timeout){
	return {
		restrict: 'E',
		controller: function($scope, $timeout){
			$timeout(function(){
				Behaviours.loadBehaviours($scope.application, function(behaviours){
					var snipletControllerExpansion = behaviours.sniplets[$scope.template].controller;
					for(var prop in snipletControllerExpansion){
						$scope[prop] = snipletControllerExpansion[prop];
					}
					if(typeof $scope.init === 'function'){
						$scope.init();
					}
				});
			}, 1);
		},
		template: "<div ng-include=\"'/' + application + '/public/template/behaviours/sniplet-' + template + '.html'\"></div>",
		link: function(scope, element, attributes){
			scope.application = attributes.application;
			scope.template = attributes.template;
			scope.source = scope.$eval(attributes.source);
		}
	}
});

module.directive('snipletSource', function($parse, $timeout){
	return {
		restrict: 'E',
		template: "<div ng-include=\"'/' + application + '/public/template/behaviours/sniplet-source-' + template + '.html'\"></div>",
		controller: function($scope, $timeout){
			$scope.setSnipletSource = function(source){
				$scope.ngModel.assign($scope, source);
				$scope.ngChange();
			};

			$timeout(function(){
				Behaviours.loadBehaviours($scope.application, function(behaviours){
					var snipletControllerExpansion = behaviours.sniplets[$scope.template].controller;
					for(var prop in snipletControllerExpansion){
						$scope[prop] = snipletControllerExpansion[prop];
					}

					if(typeof $scope.initSource === 'function'){
						$scope.initSource();
					}
				});
			}, 1);
		},
		link: function(scope, element, attributes){
			scope.application = attributes.application;
			scope.template = attributes.template;
			scope.ngModel = $parse(attributes.ngModel);
			scope.ngChange = function(){
				scope.$eval(attributes.ngChange);
			}
		}
	}
});

module.directive('placedBlock', function($compile){
	return {
		restrict: 'E',
		replace: true,
		transclude: true,
		scope: {
			x: '=',
			y: '=',
			z: '=',
			h: '=',
			w: '='
		},
		template: '<article ng-transclude ng-style="{\'z-index\': z }"></article>',
		link: function($scope, $element, $attributes){
			$element.css({ 'position': 'absolute' });
			$scope.$watch('x', function(newVal){
				$element.offset({
					top: $element.offset().top,
					left: parseInt(newVal) + $element.parent().offset().left
				});
			});

			$scope.$watch('y', function(newVal){
				$element.offset({
					left: $element.offset().left,
					top: parseInt(newVal) + $element.parent().offset().top
				});
			});

			var toTop = function(){
				$(':focus').blur();
				if($scope.z === undefined){
					return;
				}
				$element.parents('.drawing-zone').find('*').each(function(index, item){
					var zIndex = $(item).css('z-index');
					if(!$scope.z){
						$scope.z = 1;
					}
					if(parseInt(zIndex) && parseInt(zIndex) >= $scope.z){
						$scope.z = parseInt(zIndex) + 1;
					}
				});
				if($scope.z){
					$scope.$apply('z');
				}
			};

			$element.on('startDrag', toTop);
			$element.on('startResize', function(){
				$scope.w = $element.width();
				$scope.$apply('w');
				$scope.h = $element.height();
				$scope.$apply('h');
				toTop();
			});

			$element.on('stopDrag', function(){
				$scope.x = $element.position().left;
				$scope.$apply('x');
				$scope.y = $element.position().top;
				$scope.$apply('y');
			});

			$scope.$watch('z', function(newVal){
				$element.css({ 'z-index': $scope.z })
			});

			$scope.$watch('w', function(newVal){
				$element.width(newVal);
			});
			$element.on('stopResize', function(){
				$scope.w = $element.width();
				$scope.$apply('w');
				$scope.h = $element.height();
				$scope.$apply('h');
			});

			$scope.$watch('h', function(newVal){
				$element.height(newVal);
			});
		}
	}
});

module.directive('draggable', function($compile){
	return {
		restrict: 'A',
		link: function(scope, element, attributes){
			if(attributes.draggable == 'false' || attributes.native !== 'true'){
				return;
			}
			ui.extendElement.draggable(element, {
				mouseUp: function(){
					element.on('click', function(){
						scope.$parent.$eval(attributes.ngClick);
					});
				}
			});
		}
	}
});

module.directive('sharePanel', function($compile){
	return {
		scope: {
			resources: '=',
			appPrefix: '='
		},
		restrict: 'E',
		templateUrl: '/' + infraPrefix + '/public/template/share-panel.html',
		link: function($scope, $element, $attributes){

		}
	}
});

module.directive('sortableList', function($compile){
	return {
		restrict: 'A',
		controller: function(){},
		link: function(scope, element, attributes){
		}
	}
});

module.directive('sortableElement', function($compile){
	return {
		scope: {
			ngModel: '=',
			ngChange: '&'
		},
		require: '^sortableList',
		template: '<div ng-transclude></div>',
		transclude: true,
		link: function(scope, element, attributes){
			var sortables;
			ui.extendElement.draggable(element, {
				lock: {
					horizontal: true
				},
				mouseUp: function(){
					sortables.removeClass('animated');
					element.on('click', function(){
						scope.$parent.$eval(attributes.ngClick);
					});
					sortables.each(function(index, item){
						if(parseInt($(item).css('margin-top')) > 0){
							element.detach().insertBefore(item);
						}
					});

					if(element.offset().top > sortables.last().offset().top + sortables.last().height()){
						element.detach().insertAfter(sortables.last());
					}

					//get new elements order
					var changed = false;
					sortables = element.parents('[sortable-list]').find('[sortable-element]');
					sortables.each(function(index, item){
						var itemScope = angular.element(item).scope();
						if(index !== itemScope.ngModel){
							itemScope.ngModel = index;
							itemScope.$apply('ngModel');
							changed = true;
						}
					});

					if(typeof scope.ngChange === 'function' && changed){
						scope.ngChange();
					}

					sortables.css({ position: 'relative', top: 0, left: 0, 'margin-top': 0 });
				},
				mouseDown: function(){
					sortables = element.parents('[sortable-list]').find('[sortable-element]');
					sortables.attr('style', '');
					setTimeout(function(){
						sortables.addClass('animated');
					}, 20);
					element.css({ 'z-index': 1000 });
				},
				tick: function(){
					var moved = [];
					sortables.each(function(index, sortable){
						if(element[0] === sortable){
							return;
						}
						var sortableTopDistance = $(sortable).offset().top - parseInt($(sortable).css('margin-top'));
						if(element.offset().top + element.height() / 2 > sortableTopDistance &&
							element.offset().top + element.height() / 2 < sortableTopDistance + $(sortable).height()){
							$(sortable).css({ 'margin-top': element.height()});
							moved.push(sortable);
						}
						//first widget case
						if(element.offset().top + element.height() / 2 - 2 < sortableTopDistance && index === 0){
							$(sortable).css({ 'margin-top': element.height()});
							moved.push(sortable);
						}
					});
					sortables.each(function(index, sortable){
						if(moved.indexOf(sortable) === -1){
							$(sortable).css({ 'margin-top': 0 + 'px' });
						}
					})
				}
			});
		}
	};
});

module.directive('widgets', function($compile){
	return {
		scope: {
			list: '='
		},
		restrict: 'E',
		templateUrl: '/' + infraPrefix + '/public/template/widgets.html',
		link: function(scope, element, attributes){
			element.on('index-changed', '.widget-container', function(e){
				var widgetObj = angular.element(e.target).scope().widget;
				element.find('.widget-container').each(function(index, widget){
					if(e.target === widget){
						return;
					}
					if($(e.target).offset().top + ($(e.target).height() / 2) > $(widget).offset().top &&
						$(e.target).offset().top + ($(e.target).height() / 2) < $(widget).offset().top + $(widget).height()){
						widgetObj.setIndex(index);
						scope.$apply('widgets');
					}
					//last widget case
					if($(e.target).offset().top > $(widget).offset().top + $(widget).height() && index === element.find('.widget-container').length - 1){
						widgetObj.setIndex(index);
						scope.$apply('widgets');
					}
					//first widget case
					if($(e.target).offset().top + $(e.target).height() > $(widget).offset().top && index === 0){
						widgetObj.setIndex(index);
						scope.$apply('widgets');
					}
				});
				element.find('.widget-container').css({ position: 'relative', top: '0px', left: '0px' });
			});
			model.widgets.on('change', function(){
				if(element.find('.widget-container').length === 0){
					element
						.parents('.widgets')
						.next('.widgets-friend')
						.addClass('widgets-enemy');
					element.parents('.widgets').addClass('hidden');
				}
				else{
					element
						.parents('.widgets')
						.next('.widgets-friend')
						.removeClass('widgets-enemy');
					element.parents('.widgets').removeClass('hidden');
				}
			});
		}
	}
});

module.directive('progressBar', function($compile){
	return {
		restrict: 'E',
		scope: {
			max: '=',
			filled: '=',
			unit: '@'
		},
		template: '<div class="progress-bar"><div class="filled">[[filled]] [[unit]]</div>[[max]] [[unit]]</div>',
		link: function(scope, element, attributes){
			function updateBar(){
				var filledPercent = scope.filled * 100 / scope.max;
				element.find('.filled').width(filledPercent + '%');
				if(filledPercent < 10){
					element.find('.filled').addClass('small');
				}
				else{
					element.find('.filled').removeClass('small');
				}
			}

			scope.$watch('filled', function(newVal){
				updateBar();
			});

			scope.$watch('max', function(newVal){
				updateBar();
			});
		}
	}
})

module.directive('datePicker', function($compile){
	return {
		scope: {
			ngModel: '=',
			ngChange: '&'
		},
		transclude: true,
		replace: true,
		restrict: 'E',
		template: '<input ng-transclude type="text" data-date-format="dd/mm/yyyy"  />',
		link: function($scope, $element, $attributes){
			$scope.$watch('ngModel', function(newVal){
				$element.val(moment($scope.ngModel).format('DD/MM/YYYY'));
                if($element.datepicker)
                    $element.datepicker('setValue', moment($scope.ngModel).format('DD/MM/YYYY'));
			});
			loader.asyncLoad('/' + infraPrefix + '/public/js/bootstrap-datepicker.js', function(){
				$element.datepicker({
						dates: {
							months: moment.months(),
							monthsShort: moment.monthsShort(),
							days: moment.weekdays(),
							daysShort: moment.weekdaysShort(),
							daysMin: moment.weekdaysMin()
						},
						weekStart: 1
					})
					.on('changeDate', function(){
						setTimeout(function(){
							var date = $element.val().split('/');
							var temp = date[0];
							date[0] = date[1];
							date[1] = temp;
							date = date.join('/');
							$scope.ngModel = new Date(date);
							$scope.$apply('ngModel');
							$scope.$parent.$eval($scope.ngChange);
							$scope.$parent.$apply();
						}, 10);

						$(this).datepicker('hide');
					});
				$element.datepicker('hide');
			});

			$element.on('focus', function(){
				var that = this;
				$(this).parents('form').on('submit', function(){
					$(that).datepicker('hide');
				});
				$element.datepicker('show');
			});

			$element.on('change', function(){
				var date = $element.val().split('/');
				var temp = date[0];
				date[0] = date[1];
				date[1] = temp;
				date = date.join('/');
				$scope.ngModel = new Date(date);
				$scope.$apply('ngModel');
				$scope.$parent.$eval($scope.ngChange);
				$scope.$parent.$apply();
			});
		}
	}
});

module.directive('datePickerIcon', function($compile){
	return {
		scope: {
			ngModel: '=',
			ngChange: '&'
		},
		replace: true,
		restrict: 'E',
		template: '<div class="date-picker-icon"> <input type="text" class="hiddendatepickerform" style="visibility: hidden; width: 0px; height: 0px; float: inherit" data-date-format="dd/mm/yyyy"/> <a ng-click="openDatepicker()"><i class="calendar"/></a> </div>',
		link: function($scope, $element, $attributes){
			loader.asyncLoad('/' + infraPrefix + '/public/js/bootstrap-datepicker.js', function(){
				var input_element   = $element.find('.hiddendatepickerform')
				input_element.value = moment(new Date()).format('DD/MM/YYYY')

				input_element.datepicker({
					dates: {
						months: moment.months(),
						monthsShort: moment.monthsShort(),
						days: moment.weekdays(),
						daysShort: moment.weekdaysShort(),
						daysMin: moment.weekdaysMin()
					},
					weekStart: 1
				})
				.on('changeDate', function(event){
					$scope.ngModel = event.date
					$scope.$apply('ngModel')
					$(this).datepicker('hide');
					if(typeof $scope.ngChange === 'function'){
						$scope.ngChange();
					}
				});

				input_element.datepicker('hide')

				$scope.openDatepicker = function(){
					input_element.datepicker('show')
				}
			})

		}
	}
});

module.directive('filters', function(){
	return {
		restrict: 'E',
		template: '<div class="row line filters">' +
			'<div class="filters-icons">' +
					'<ul ng-transclude>' +
					'</ul></div>' +
				'</div><div class="row"></div> ',
		transclude: true,
		link: function(scope, element, attributes){
		}
	}
});

module.directive('alphabetical', function($compile, $parse){
	return {
		restrict: 'E',
		controller: function($scope){
			$scope.letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];
			$scope.matchingElements = {};
			$scope.matching = function(letter){
				return function(element){
					return element[$scope.title][0].toUpperCase() === letter || (letter === '#' && element[$scope.title][0].toLowerCase() === element[$scope.title][0].toUpperCase());
				}
			};

			$scope.updateElements = function(){
				$scope.letters.forEach(function(letter){
					$scope.matchingElements[letter] = _.filter($scope.collection($scope), function(element){
						return element[$scope.title][0].toUpperCase() === letter || (letter === '#' && element[$scope.title][0].toLowerCase() === element[$scope.title][0].toUpperCase());
					});
				});
			};

			if(!$scope.display){
				$scope.display = {};
			}
			$scope.display.pickLetter;
		},
		compile: function(element, attributes){
			var iterator = attributes.list;
			var iteratorContent = element.html();
			element.html('<lightbox class="letter-picker" show="display.pickLetter" on-close="display.pickLetter = false;">' +
				'<div ng-repeat="letter in letters"><h2 ng-click="viewLetter(letter)" class="cell" ng-class="{disabled: matchingElements[letter].length <= 0 }">[[letter]]</h2></div>' +
				'</lightbox>' +
				'<div ng-repeat="letter in letters">' +
				'<div ng-if="matchingElements[letter].length > 0" class="row">' +
				'<h1 class="letter-picker" ng-click="display.pickLetter = true;" id="alphabetical-[[letter]]">[[letter]]</h1><hr class="line" />' +
				'<div class="row"><div ng-repeat="' + iterator + ' |filter: matching(letter)">' + iteratorContent + '</div></div>' +
				'</div><div class="row"></div>' +
				'</div>');
			element.addClass('alphabetical');
			var match = iterator.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);
			var collection = match[2];
			return function(scope, element, attributes){
				scope.title = attributes.title || 'title';
				scope.collection = $parse(collection);
				scope.$watchCollection(collection, function(newVal){
					scope.updateElements();
				});
				scope.updateElements();
				scope.viewLetter = function(letter){
					document.getElementById('alphabetical-' + letter).scrollIntoView();
					scope.display.pickLetter = false;
				};
			}
		}
	}
});

module.directive('completeClick', function($parse){
	return {
		compile: function(selement, attributes){
			var fn = $parse(attributes.completeClick);
			return function(scope, element, attributes) {
				element.on('click', function(event) {
					scope.$apply(function() {
						fn(scope, {$event:event});
					});
				});
			};
		}
	}
});

$(document).ready(function(){
	setTimeout(function(){
		bootstrap(function(){
			model.build();
			model.sync();
			angular.bootstrap($('html'), ['app']);
		});
	}, 10);
});


function Account($scope){
	"use strict";

	$scope.nbNewMessages = 0;
	$scope.me = model.me;
	$scope.rand = Math.random();
	$scope.skin = skin;
	$scope.refreshAvatar = function(){
		http().get('/userbook/api/person').done(function(result){
			$scope.avatar = result.result['0'].photo;
			if(!$scope.avatar || $scope.avatar === 'no-avatar.jpg'){
				$scope.avatar = '/directory/public/img/no-avatar.jpg';
			}
			$scope.username = result.result['0'].displayName;
			$scope.$apply();
		});
	};

	http().get('/conversation/count/INBOX', { unread: true }).done(function(nbMessages){
		$scope.nbNewMessages = nbMessages.count;
		$scope.$apply('nbNewMessages');
	});

	skin.listThemes(function(themes){
		$scope.themes = themes;
		$scope.$apply('themes');
	});

	$scope.refreshAvatar();
	$scope.currentURL = window.location.href;
}

function Share($rootScope, $scope, ui, _, lang){
	if(!$scope.appPrefix){
		$scope.appPrefix = 'workspace';
	}
	if($scope.resources instanceof Model){
		$scope.resources = [$scope.resources];
	}

	$scope.sharing = {};
	$scope.found = [];
	$scope.maxResults = 5;

	$scope.editResources = [];
	$scope.sharingModel = {
		edited: []
	};

	$scope.addResults = function(){
		$scope.maxResults += 5;
	};

	var actionsConfiguration = {};

	http().get('/' + infraPrefix + '/public/json/sharing-rights.json').done(function(config){
		actionsConfiguration = config;
	});

	$scope.translate = lang.translate;

	function actionToRights(item, action){
		var actions = [];
		_.where($scope.actions, { displayName: action.displayName }).forEach(function(item){
			item.name.forEach(function(i){
				actions.push(i);
			});
		});

		return actions;
	}

	function rightsToActions(rights, http){
		var actions = {};

		rights.forEach(function(right){
			var action = _.find($scope.actions, function(action){
				return action.name.indexOf(right) !== -1
			});

			if(!action){
				return;
			}

			if(!actions[action.displayName]){
				actions[action.displayName] = true;
			}
		});

		return actions;
	}

	function setActions(actions){
		$scope.actions = actions;
		$scope.actions.forEach(function(action){
			var actionId = action.displayName.split('.')[1];
			if(actionsConfiguration[actionId]){
				action.priority = actionsConfiguration[actionId].priority;
				action.requires = actionsConfiguration[actionId].requires;
			}
		});
	}

	function dropRights(callback){
		function drop(resource, type){
			var done = 0;
			for(var element in resource[type].checked){
				var path = '/' + $scope.appPrefix + '/share/remove/' + resource._id;
				var data = {};
				if(type === 'users'){
					data.userId = element;
				}
				else{
					data.groupId = element;
				}
				http().put(path, http().serialize(data));
			}
		}
		$scope.editResources.forEach(function(resource){
			drop(resource, 'users');
			drop(resource, 'groups');
		});
		callback();
		$scope.varyingRights = false;
	}

	function differentRights(model1, model2){
		var result = false;
		function different(type){
			for(var element in model1[type].checked){
				if(!model2[type].checked[element]){
					return true;
				}

				model1[type].checked[element].forEach(function(right){
					result = result || model2[type].checked[element].indexOf(right) === -1
				});
			}

			return result;
		}

		return different('users') || different('groups');
	}

	var feedData = function(){
		var initModel = true;
		$scope.resources.forEach(function(resource){
			var id = resource._id;
			http().get('/' + $scope.appPrefix + '/share/json/' + id).done(function(data){
				if(initModel){
					$scope.sharingModel = data;
					$scope.sharingModel.edited = [];
				}

				data._id = resource._id;
				$scope.editResources.push(data);
				var editResource = $scope.editResources[$scope.editResources.length -1];
				if(!$scope.sharing.actions){
					setActions(data.actions);
				}

				function addToEdit(type){
					for(var element in editResource[type].checked){
						var rights = editResource[type].checked[element];

						var groupActions = rightsToActions(rights);
						var elementObj = _.findWhere(editResource[type].visibles, {
							id: element
						});
						elementObj.actions = groupActions;
						if(initModel){
							$scope.sharingModel.edited.push(elementObj);
						}

						elementObj.index = $scope.sharingModel.edited.length;
					}
				}

				addToEdit('groups');
				addToEdit('users');

				if(!initModel){
					if(differentRights(editResource, $scope.sharingModel) || differentRights($scope.sharingModel, editResource)){
						$scope.varyingRights = true;
						$scope.sharingModel.edited = [];
					}
				}
				initModel = false;

				$scope.$apply('sharingModel.edited');
			});
		})
	};

	$scope.$watch('resources', function(){
		$scope.actions = [];
		$scope.sharingModel.edited = [];
		$scope.search = '';
		$scope.found = [];
		$scope.varyingRights = false;
		feedData();
	})

	$scope.addEdit = function(item){
		item.actions = {};
		$scope.sharingModel.edited.push(item);
		item.index = $scope.sharingModel.edited.length;
		$scope.found = [];
		$scope.search = '';

		$scope.actions.forEach(function(action){
			var actionId = action.displayName.split('.')[1];
			if(actionsConfiguration[actionId].default){
				item.actions[action.displayName] = true;
				$scope.saveRights(item, action);
			}
		});
	};

	$scope.findUserOrGroup = function(){
		var searchTerm = lang.removeAccents($scope.search).toLowerCase();
		$scope.found = _.union(
			_.filter($scope.sharingModel.groups.visibles, function(group){
				var testName = lang.removeAccents(group.name).toLowerCase();
				return testName.indexOf(searchTerm) !== -1;
			}),
			_.filter($scope.sharingModel.users.visibles, function(user){
				var testName = lang.removeAccents(user.lastName + ' ' + user.firstName).toLowerCase();
				var testNameReversed = lang.removeAccents(user.firstName + ' ' + user.lastName).toLowerCase();
				return testName.indexOf(searchTerm) !== -1 || testNameReversed.indexOf(searchTerm) !== -1;
			})
		);
		$scope.found = _.filter($scope.found, function(element){
			return $scope.sharingModel.edited.indexOf(element) === -1;
		})
	};

	$scope.remove = function(element){
		var data;
		if(element.login !== undefined){
			data = {
				userId: element.id
			}
		}
		else{
			data = {
				groupId: element.id
			}
		}

		$scope.sharingModel.edited = _.reject($scope.sharingModel.edited, function(item){
			return item.id === element.id;
		});

		$scope.resources.forEach(function(resource){
			var path = '/' + $scope.appPrefix + '/share/remove/' + resource._id;
			http().put(path, http().serialize(data)).done(function(){
				$rootScope.$broadcast('share-updated');
			});
		})
	}

	$scope.maxEdit = 3;

	$scope.displayMore = function(){
		var displayMoreInc = 5;
		$scope.maxEdit += displayMoreInc;
	}

	function applyRights(element, action){
		var data;
		if(element.login !== undefined){
			data = { userId: element.id }
		}
		else{
			data = { groupId: element.id }
		}
		data.actions = actionToRights(element, action);

		var setPath = 'json';
		if(!element.actions[action.displayName]){
			setPath = 'remove';
			_.filter($scope.actions, function(item){
				return _.find(item.requires, function(dependency){
					return action.displayName.split('.')[1].indexOf(dependency) !== -1;
				}) !== undefined
			})
			.forEach(function(item){
				if(item){
					element.actions[item.displayName] = false;
					data.actions = data.actions.concat(actionToRights(element, item));
				}
			})
		}
		else{
			action.requires.forEach(function(required){
				var action = _.find($scope.actions, function(action){
					return action.displayName.split('.')[1].indexOf(required) !== -1;
				});
				if(action){
					element.actions[action.displayName] = true;
					data.actions = data.actions.concat(actionToRights(element, action));
				}
			});
		}

		$scope.resources.forEach(function(resource){
			http().put('/' + $scope.appPrefix + '/share/' + setPath + '/' + resource._id, http().serialize(data)).done(function(){
				if(setPath === 'remove'){
					$rootScope.$broadcast('share-updated', { removed: { groupId: data.groupId, userId: data.userId, actions: rightsToActions(data.actions) } });
				}
				else{
					$rootScope.$broadcast('share-updated', { added: { groupId: data.groupId, userId: data.userId, actions: rightsToActions(data.actions) } });
				}

			});
		});
	}

	$scope.saveRights = function(element, action){
		if($scope.varyingRights){
			dropRights(function(){
				applyRights(element, action)
			});
		}
		else{
			applyRights(element, action);
		}
	};
}

function Admin($scope){
	$scope.urls = [];
	http().get('/admin-urls').done(function(urls){
		$scope.urls = urls;
		$scope.$apply('urls');
	});
    $scope.getHighlight = function(url){
        return window.location.href.indexOf(url.url) >= 0
    }
    $scope.orderUrls = function(url){
        return !$scope.getHighlight(url) ? 1 : 0
    }
    $scope.filterUrls = function(url){
        return !url.allowed || !url.allowed instanceof Array ? true : _.find(model.me.functions, function(f){ return _.contains(url.allowed, f.code) })
    }

	$scope.scrollUp = ui.scrollToTop;
}

function Widget(){}

Widget.prototype.switchHide = function(){
	if(!this.hide){
		this.hide = false;
	}
	this.hide = !this.hide;
	this.trigger('change');
	model.widgets.trigger('change');
	model.widgets.savePreferences();
}

function WidgetModel(){
	model.makeModels([Widget]);
	model.collection(Widget, {
		preferences: {},
		savePreferences: function(){
			var that = this;
			this.forEach(function(widget){
				that.preferences[widget.name].hide = widget.hide;
				that.preferences[widget.name].index = widget.index;
			});
			http().putJson('/userbook/preference/widgets', this.preferences);
		},
		sync: function(){
			var that = this;

			http().get('/widgets').done(function(data){
				http().get('/userbook/preference/widgets').done(function(pref){
					if(!pref.preference){
						this.preferences = {};
					}
					else{
						this.preferences = JSON.parse(pref.preference);
					}


					data = data.map(function(widget, i){
						if(!that.preferences[widget.name]){
							that.preferences[widget.name] = { index: i, show: true };
						}
						widget.index = that.preferences[widget.name].index;
						widget.hide = that.preferences[widget.name].hide;
						return widget;
					});

					that.load(data, function(widget){
						if(skin.templateMapping.widgets && skin.templateMapping.widgets.indexOf(widget.name) !== -1){
							widget.path = '/assets/themes/' + skin.skin + '/template/widgets/' + widget.name + '.html';
						}
						if(widget.i18n){
							lang.addBundle(widget.i18n, function(){
								loader.loadFile(widget.js);
							})
						}
						else{
							loader.loadFile(widget.js);
						}
					});
				}.bind(this))
			}.bind(this));
		},
		findWidget: function(name){
			return this.findWhere({name: name});
		},
		apply: function(){
			model.trigger('widgets.change');
		}
	});
}

function Widgets($scope, model, lang, date){
	if(!model.widgets){
		WidgetModel();
	}
	model.widgets.sync();
	$scope.widgets = model.widgets;

	$scope.allowedWidget = function(widget){
		return (!$scope.list || $scope.list.indexOf(widget.name) !== -1) && !widget.hide;
	}

	model.on('widgets.change', function(){
		if(!$scope.$$phase){
			$scope.$apply('widgets');
		}
	});

	$scope.translate = lang.translate;
	$scope.switchHide = function(widget, $event){
		widget.switchHide();
		$event.stopPropagation();
	}
}

var workspace = {
	thumbnails: "thumbnail=120x120&thumbnail=150x150&thumbnail=100x100&thumbnail=290x290&thumbnail=48x48&thumbnail=82x82&thumbnail=381x381",
	Document: function(data){
		if(data.metadata){
			var dotSplit = data.metadata.filename.split('.');
			if(dotSplit.length > 1){
				dotSplit.length = dotSplit.length - 1;
			}
			this.title = dotSplit.join('.');
		}

		if(data.created){
			this.created = moment(data.created.split('.')[0]);
		}

		this.protectedDuplicate = function(callback){
			Behaviours.applicationsBehaviours.workspace.protectedDuplicate(this, function(data){
				callback(new workspace.Document(data))
			});
		};

		this.role = function(){
			var types = {
				'doc': function(type){
					return type.indexOf('document') !== -1 && type.indexOf('wordprocessing') !== -1;
				},
				'xls': function(type){
					return (type.indexOf('document') !== -1 && type.indexOf('spreadsheet') !== -1) || (type.indexOf('ms-excel') !== -1);
				},
				'img': function(type){
					return type.indexOf('image') !== -1;
				},
				'pdf': function(type){
					return type.indexOf('pdf') !== -1;
				},
				'ppt': function(type){
					return (type.indexOf('document') !== -1 && type.indexOf('presentation') !== -1) || type.indexOf('powerpoint') !== -1;
				},
				'video': function(type){
					return type.indexOf('video') !== -1;
				},
				'audio': function(type){
					return type.indexOf('audio') !== -1;
				}
			};

			for(var type in types){
				if(types[type](this.metadata['content-type'])){
					return type;
				}
			}

			return 'unknown';
		}
	},
	Folder: function(data){
		this.updateData(data);

		this.collection(workspace.Folder, {
			sync: function(){
				this.load(_.filter(model.mediaLibrary.myDocuments.folders.list, function(folder){
					return folder.folder.indexOf(data.folder + '_') !== -1;
				}));
			}
		});

		this.collection(workspace.Document,  {
			sync: function(){
				http().get('/workspace/documents/' + data.folder, { filter: 'owner', hierarchical: true }).done(function(documents){
					this.load(documents);
				}.bind(this));
			}
		});

		this.closeFolder = function(){
			this.folders.all = [];
		};

		this.on('documents.sync', function(){
			this.trigger('sync');
		}.bind(this));
	},
	MyDocuments: function(){
		this.collection(workspace.Folder, {
			sync: function(){
				if(model.me.workflow.workspace.documents.create){
					http().get('/workspace/folders/list', { filter: 'owner' }).done(function(data){
						this.list = data;
						this.load(_.filter(data, function(folder){
							return folder.folder.indexOf('_') === -1;
						}))
					}.bind(this));
				}
			},
			list: []
		});

		this.collection(workspace.Document,  {
			sync: function(){
				http().get('/workspace/documents', { filter: 'owner', hierarchical: true }).done(function(documents){
					this.load(documents);
				}.bind(this))
			}
		});

		this.on('folders.sync, documents.sync', function(){
			this.trigger('sync');
		}.bind(this));
	},
	SharedDocuments: function(){
		this.collection(workspace.Document,  {
			sync: function(){
				if(model.me.workflow.workspace.documents.list){
					http().get('/workspace/documents', { filter: 'shared' }).done(function(documents){
						this.load(documents);
					}.bind(this));
				}
			}
		});
		this.on('documents.sync', function(){
			this.trigger('sync');
		}.bind(this));
	},
	AppDocuments: function(){
		this.collection(workspace.Document, {
			sync: function(){
				http().get('/workspace/documents', { filter: 'protected' }).done(function(documents){
					this.load(_.filter(documents, function(doc){
						return doc.folder !== 'Trash';
					}));
				}.bind(this))
			}
		});
		this.on('documents.sync', function(){
			this.trigger('sync');
		}.bind(this));
	}
};

workspace.Document.prototype.upload = function(file, requestName, callback){
	var formData = new FormData();
	formData.append('file', file, file.name);
	http().postFile('/workspace/document?protected=true&application=media-library&' + workspace.thumbnails, formData, { requestName: requestName }).done(function(data){
		if(typeof callback === 'function'){
			callback(data);
		}
	});
};

function MediaLibrary($scope){
	if(!model.mediaLibrary){
		model.makeModels(workspace);
		model.mediaLibrary = new Model();
		model.mediaLibrary.myDocuments = new workspace.MyDocuments();
		model.mediaLibrary.sharedDocuments = new workspace.SharedDocuments();
		model.mediaLibrary.appDocuments = new workspace.AppDocuments();

		model.me.workflow.load(['workspace']);
	}

	$scope.myDocuments = model.mediaLibrary.myDocuments;

	$scope.display = {
		show: 'browse',
		listFrom: 'appDocuments',
		search: ''
	};

	$scope.show = function(tab){
		$scope.display.show = tab;
		$scope.upload.loading = [];
	};

	$scope.listFrom = function(listName){
		$scope.display.listFrom = listName;
		model.mediaLibrary[listName].sync();
	};

	$scope.openFolder = function(folder){
		if($scope.openedFolder.closeFolder && folder.folder.indexOf($scope.openedFolder.folder + '_') === -1){
			$scope.openedFolder.closeFolder();
		}

		$scope.openedFolder = folder;
		folder.sync();
		folder.on('sync', function(){
			$scope.documents = filteredDocuments(folder);
			$scope.folders = folder.folders.all;
			$scope.$apply('documents');
			$scope.$apply('folders');
		});
	};

	$scope.$watch('fileFormat', function(newVal){
		if(!newVal){
			return;
		}

		if(model.me.workflow.workspace.documents.create){
			$scope.listFrom('appDocuments')
		}
		else if(model.me.workflow.workspace.documents.list){
			$scope.listFrom('sharedDocuments')
		}
	});

	function filteredDocuments(source){
		return source.documents.filter(function(doc){
			return doc.role() === $scope.fileFormat &&
				lang.removeAccents(doc.metadata.filename.toLowerCase()).indexOf(lang.removeAccents($scope.display.search.toLowerCase())) !== -1;
		});
	}

	model.mediaLibrary.on('myDocuments.sync, sharedDocuments.sync, appDocuments.sync', function(){
		$scope.documents = filteredDocuments(model.mediaLibrary[$scope.display.listFrom]);
		if(model.mediaLibrary[$scope.display.listFrom].folders){
			$scope.folders = model.mediaLibrary[$scope.display.listFrom].folders.filter(function(folder){
				return lang.removeAccents(folder.name.toLowerCase()).indexOf(lang.removeAccents($scope.display.search.toLowerCase())) !== -1;
			});
			$scope.$apply('folders');
		}

		$scope.folder = model.mediaLibrary[$scope.display.listFrom];
		$scope.openedFolder = $scope.folder;
		$scope.$apply('documents');
	});

	$scope.selectDocument = function(document){
		if($scope.folder === model.mediaLibrary.appDocuments){
			if($scope.multiple){
				$scope.$parent.ngModel = [document];
			}
			else{
				$scope.$parent.ngModel = document;
			}
		}
		else{
			document.protectedDuplicate(function(newFile){

				if($scope.multiple){
					$scope.$parent.ngModel = [newFile];
					$scope.$parent.$apply('ngModel');
				}
				else{
					$scope.$parent.ngModel = newFile;
					$scope.$parent.$apply('ngModel');
				}
			});
		}
	};

	$scope.selectDocuments = function(){
		var selectedDocuments = _.where($scope.documents, { selected: true });
		if($scope.folder === model.mediaLibrary.appDocuments){
			$scope.$parent.ngModel = selectedDocuments;
		}
		else{
			var duplicateDocuments = [];
			var documentsCount = 0;
			selectedDocuments.forEach(function(doc){
				doc.protectedDuplicate(function(newFile){
					duplicateDocuments.push(newFile);
					documentsCount++;
					if(documentsCount === selectedDocuments.length){
						$scope.$parent.ngModel = duplicateDocuments;
						$scope.$parent.$apply('ngModel');
					}
				})
			})
		}
	};

	$scope.setFilesName = function(){
		$scope.upload.names = '';
		for(var i = 0; i < $scope.upload.files.length; i++){
			if(i > 0){
				$scope.upload.names += ', '
			}
			$scope.upload.names += $scope.upload.files[i].name;
		}
	};

	$scope.importFiles = function(){
		var waitNumber = $scope.upload.files.length;
		for(var i = 0; i < $scope.upload.files.length; i++){
			$scope.upload.loading.push($scope.upload.files[i]);
			workspace.Document.prototype.upload($scope.upload.files[i], 'file-upload-' + $scope.upload.files[i].name + '-' + i, function(){
				waitNumber--;
				model.mediaLibrary.appDocuments.documents.sync();
				if(!waitNumber){
					$scope.display.show = 'browse';
					$scope.listFrom('appDocuments');
				}
				$scope.$apply('display');
			});
		}
		$scope.upload.files = undefined;
		$scope.upload.names = '';
	};

	$scope.updateSearch = function(){
		$scope.documents = filteredDocuments($scope.openedFolder);
	}
}
