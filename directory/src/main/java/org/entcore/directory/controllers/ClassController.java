/*
 * Copyright. Tous droits réservés. WebServices pour l’Education.
 */

package org.entcore.directory.controllers;

import fr.wseduc.webutils.Controller;
import fr.wseduc.webutils.Either;
import fr.wseduc.webutils.NotificationHelper;
import fr.wseduc.webutils.Server;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import org.entcore.common.appregistry.ApplicationUtils;
import org.entcore.common.neo4j.Neo;
import org.entcore.common.notification.ConversationNotification;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;
import org.entcore.directory.services.ClassService;
import org.entcore.directory.services.SchoolService;
import org.entcore.directory.services.UserService;
import org.entcore.directory.services.impl.DefaultClassService;
import org.entcore.directory.services.impl.DefaultSchoolService;
import org.entcore.directory.services.impl.DefaultUserService;
import org.vertx.java.core.Handler;
import org.vertx.java.core.Vertx;
import org.vertx.java.core.buffer.Buffer;
import org.vertx.java.core.eventbus.Message;
import org.vertx.java.core.http.HttpServerFileUpload;
import org.vertx.java.core.http.HttpServerRequest;
import org.vertx.java.core.http.RouteMatcher;
import org.vertx.java.core.json.JsonArray;
import org.vertx.java.core.json.JsonObject;
import org.vertx.java.platform.Container;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static fr.wseduc.webutils.request.RequestUtils.bodyToJson;
import static org.entcore.common.http.response.DefaultResponseHandler.arrayResponseHandler;
import static org.entcore.common.http.response.DefaultResponseHandler.defaultResponseHandler;
import static org.entcore.common.http.response.DefaultResponseHandler.notEmptyResponseHandler;

public class ClassController extends Controller {

	private final ClassService classService;
	private final UserService userService;
	private final SchoolService schoolService;
	private final ConversationNotification conversationNotification;
	private static final List<String> csvMimeTypes = Arrays.asList("text/comma-separated-values", "text/csv",
			"application/csv", "application/excel", "application/vnd.ms-excel", "application/vnd.msexcel",
			"text/anytext", "text/plain");

	public ClassController(Vertx vertx, Container container, RouteMatcher rm,
			Map<String, fr.wseduc.webutils.security.SecuredAction> securedActions) {
		super(vertx, container, rm, securedActions);
		Neo neo = new Neo(eb,log);
		NotificationHelper notification = new NotificationHelper(vertx, eb, container);
		this.classService = new DefaultClassService(neo, eb);
		this.userService = new DefaultUserService(neo, notification, eb);
		schoolService = new DefaultSchoolService(neo, eb);
		this.conversationNotification = new ConversationNotification(vertx, eb, container);
	}

	@SecuredAction(value = "class.get", type = ActionType.RESOURCE)
	public void get(final HttpServerRequest request) {
		String classId = request.params().get("classId");
		classService.get(classId, notEmptyResponseHandler(request));
	}

	@SecuredAction(value = "class.update", type = ActionType.RESOURCE)
	public void update(final HttpServerRequest request) {
		bodyToJson(request, new Handler<JsonObject>() {
			@Override
			public void handle(JsonObject body) {
				String classId = request.params().get("classId");
				classService.update(classId, body, defaultResponseHandler(request));
			}
		});
	}

	@SecuredAction(value = "class.user.create", type = ActionType.RESOURCE)
	public void createUser(final HttpServerRequest request) {
		bodyToJson(request, new Handler<JsonObject>() {
			@Override
			public void handle(JsonObject body) {
				final String classId = request.params().get("classId");
				userService.createInClass(classId, body, new Handler<Either<String, JsonObject>>() {
					@Override
					public void handle(Either<String, JsonObject> r) {
						if (r.isRight()) {
							final String userId = r.right().getValue().getString("id");
							boolean notify = container.config().getBoolean("createdUserEmail", false) &&
									request.params().contains("sendCreatedUserEmail");
							initPostCreate(classId, new JsonArray().add(userId), notify, request);
							if (notify) {
								userService.sendUserCreatedEmail(request, userId,
										new Handler<Either<String, Boolean>>() {
									@Override
									public void handle(Either<String, Boolean> e) {
										if (e.isRight()) {
											log.info("User " + userId + " created email sent.");
										} else {
											log.error("Error sending user " + userId + " created email : " +
											e.left().getValue());
										}
									}
								});
							}
							renderJson(request, r.right().getValue(), 201);
						} else {
							renderJson(request, new JsonObject().putString("error", r.left().getValue()), 400);
						}
					}
				});
			}
		});
	}

	@SecuredAction(value = "class.user.find", type = ActionType.RESOURCE)
	public void findUsers(final HttpServerRequest request) {
		final String classId = request.params().get("classId");
		JsonArray types = new JsonArray(request.params().getAll("type").toArray());
	 	Handler<Either<String, JsonArray>> handler;
		if ("csv".equals(request.params().get("format"))) {
			handler = new Handler<Either<String, JsonArray>>() {
				@Override
				public void handle(Either<String, JsonArray> r) {
					if (r.isRight()) {
						processTemplate(request, "text/export.txt",
								new JsonObject().putArray("list", r.right().getValue()), new Handler<String>() {
							@Override
							public void handle(final String export) {
								if (export != null) {
									classService.get(classId, new Handler<Either<String, JsonObject>>() {
										@Override
										public void handle(Either<String, JsonObject> c) {
											String name = classId;
											if (c.isRight()) {
												name = c.right().getValue().getString("name", name)
														.replaceAll("\\s+", "_");
											}
											request.response().putHeader("Content-Type", "application/csv");
											request.response().putHeader("Content-Disposition",
													"attachment; filename=" + name + ".csv");
											request.response().end(export);
										}
									});
								} else {
									renderError(request);
								}
							}
						});
					} else {
						renderJson(request, new JsonObject().putString("error", r.left().getValue()), 400);
					}
				}
			};
		} else {
			handler = arrayResponseHandler(request);
		}
		classService.findUsers(classId, types, handler);
	}

	@SecuredAction(value = "class.csv", type = ActionType.RESOURCE)
	public void csv(final HttpServerRequest request) {
		request.expectMultiPart(true);
		final String classId = request.params().get("classId");
		final String userType = request.params().get("userType");
		if (classId == null || classId.trim().isEmpty() ||
				(!"Student".equalsIgnoreCase(userType) && !"Relative".equalsIgnoreCase(userType))) {
			badRequest(request);
			return;
		}
		request.uploadHandler(new Handler<HttpServerFileUpload>() {
			@Override
			public void handle(final HttpServerFileUpload event) {
				final Buffer buff = new Buffer();
				if (!csvMimeTypes.contains(event.contentType())) {
					renderJson(request, new JsonObject().putString("message", "invalid.file"), 400);
					return;
				}
				event.dataHandler(new Handler<Buffer>() {
					@Override
					public void handle(Buffer event) {
						buff.appendBuffer(event);
					}
				});
				event.endHandler(new Handler<Void>() {
					@Override
					public void handle(Void end) {
						JsonObject j = new JsonObject()
								.putString("action", "manual-csv-class-" + userType.toLowerCase())
								.putString("classId", classId)
								.putString("csv", buff.toString("ISO-8859-1"));
						Server.getEventBus(vertx).send(container.config().getString("feeder",
								"entcore.feeder"), j, new Handler<Message<JsonObject>>() {
							@Override
							public void handle(Message<JsonObject> message) {
								JsonArray r = message.body().getArray("results");
								if ("ok".equals(message.body().getString("status")) && r != null) {
									JsonArray users = new JsonArray();
									for (int i = 0; i < r.size(); i++) {
										JsonArray s = r.get(i);
										if (s != null && s.size() == 1) {
											String u = ((JsonObject) s.get(0)).getString("id");
											if (u != null) {
												users.addString(u);
											}
										}
									}
									if (users.size() > 0) {
										ClassController.this.initPostCreate(classId, users);
										request.response().end();
									} else {
										renderJson(request, new JsonObject()
												.putString("message", "import.invalid." + userType.toLowerCase()), 400);
									}
								} else {
									renderJson(request, message.body(), 400);
								}
							}
						});
					}
				});
			}
		});
	}

	@SecuredAction(value = "class.add.user", type = ActionType.RESOURCE)
	public void addUser(final HttpServerRequest request) {
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(UserInfos user) {
				if (user != null) {
					final String classId = request.params().get("classId");
					final String userId = request.params().get("userId");
					classService.addUser(classId, userId, user, new Handler<Either<String, JsonObject>>() {
						@Override
						public void handle(Either<String, JsonObject> res) {
							if (res.isRight()) {
								String schoolId = res.right().getValue().getString("schoolId");
								JsonObject j = new JsonObject()
										.putString("action", "setDefaultCommunicationRules")
										.putString("schoolId", schoolId);
								eb.send("wse.communication", j);
								JsonArray a = new JsonArray().addString(userId);
								ApplicationUtils.publishModifiedUserGroup(eb, a);
								renderJson(request, res.right().getValue());
							} else {
								renderJson(request, new JsonObject().putString("error", res.left().getValue()), 400);
							}
						}
					});
				} else {
					unauthorized(request);
				}
			}
		});
	}

	@SecuredAction(value = "class.apply.rules", type = ActionType.RESOURCE)
	public void applyComRulesAndRegistryEvent(final HttpServerRequest request) {
		bodyToJson(request, new Handler<JsonObject>() {
			@Override
			public void handle(JsonObject body) {
				final String classId = request.params().get("classId");
				JsonArray userIds = body.getArray("userIds");
				if (userIds != null) {
					ClassController.this.initPostCreate(classId, userIds);
					request.response().end();
				} else {
					badRequest(request);
				}
			}
		});
	}

	private void initPostCreate(String classId, JsonArray userIds) {
		initPostCreate(classId, userIds, false, null);
	}

	private void initPostCreate(String classId, final JsonArray userIds, boolean welcomeMessage,
			final HttpServerRequest request) {
		schoolService.getByClassId(classId, new Handler<Either<String, JsonObject>>() {
			@Override
			public void handle(Either<String, JsonObject> s) {
				if (s.isRight()) {
					JsonObject j = new JsonObject()
							.putString("action", "setDefaultCommunicationRules")
							.putString("schoolId", s.right().getValue().getString("id"));
					eb.send("wse.communication", j);
				}
			}
		});
		if (welcomeMessage) {
			ApplicationUtils.sendModifiedUserGroup(eb, userIds, new Handler<Message<JsonObject>>() {
				@Override
				public void handle(Message<JsonObject> message) {
					JsonObject params = new JsonObject().putString("host", conversationNotification.getHost());
					conversationNotification.notify(request, "", userIds, null,
							"welcome.subject", "email/welcome.html", params,
							new Handler<Either<String, JsonObject>>() {

								@Override
								public void handle(Either<String, JsonObject> r) {
									if (r.isLeft()) {
										log.error(r.left().getValue());
									}
								}
							});
				}
			});
		} else {
			ApplicationUtils.publishModifiedUserGroup(eb, userIds);
		}
	}

	@SecuredAction("class.link.user")
	public void linkUser(final HttpServerRequest request) {
		final String userId = request.params().get("userId");
		final String classId = request.params().get("classId");
		classService.link(classId, userId, new Handler<Either<String, JsonObject>>() {
			@Override
			public void handle(Either<String, JsonObject> r) {
				if (r.isRight()) {
					if (r.right().getValue() != null && r.right().getValue().size() > 0) {
						initPostCreate(classId, new JsonArray().add(userId));
						renderJson(request, r.right().getValue(), 200);
					} else {
						notFound(request);
					}
				} else {
					renderJson(request, new JsonObject().putString("error", r.left().getValue()), 400);
				}
			}
		});
	}

	@SecuredAction("class.unlink.user")
	public void unlinkUser(final HttpServerRequest request) {
		final String classId = request.params().get("classId");
		final String userId = request.params().get("userId");
		classService.unlink(classId, userId, notEmptyResponseHandler(request));
	}

}
