package edu.one.core.conversation.controllers;

import com.github.mustachejava.MustacheException;
import edu.one.core.common.notification.TimelineHelper;
import edu.one.core.common.user.UserInfos;
import edu.one.core.conversation.Conversation;
import edu.one.core.conversation.service.ConversationService;
import edu.one.core.conversation.service.impl.DefaultConversationService;
import edu.one.core.infra.Controller;
import edu.one.core.infra.Either;
import edu.one.core.infra.Utils;
import edu.one.core.security.ActionType;
import edu.one.core.security.SecuredAction;
import org.vertx.java.core.Handler;
import org.vertx.java.core.Vertx;
import org.vertx.java.core.http.HttpServerRequest;
import org.vertx.java.core.http.RouteMatcher;
import org.vertx.java.core.json.JsonArray;
import org.vertx.java.core.json.JsonObject;
import org.vertx.java.platform.Container;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static edu.one.core.common.http.response.DefaultResponseHandler.arrayResponseHandler;
import static edu.one.core.infra.request.RequestUtils.bodyToJson;
import static edu.one.core.common.http.response.DefaultResponseHandler.defaultResponseHandler;
import static edu.one.core.common.user.UserUtils.getUserInfos;

public class ConversationController extends Controller {

	private final ConversationService conversationService;
	private final TimelineHelper notification;

	public ConversationController(Vertx vertx, Container container, RouteMatcher rm,
			Map<String, edu.one.core.infra.security.SecuredAction> securedActions) {
		super(vertx, container, rm, securedActions);
		this.conversationService = new DefaultConversationService(vertx,
				container.config().getString("app-name", Conversation.class.getSimpleName()));
		notification = new TimelineHelper(vertx, eb, container);
	}

	@SecuredAction("conversation.view")
	public void view(HttpServerRequest request) {
		renderView(request);
	}

	@SecuredAction("conversation.create.draft")
	public void createDraft(final HttpServerRequest request) {
		getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if (user != null) {
					final String parentMessageId = request.params().get("In-Reply-To");
					bodyToJson(request, new Handler<JsonObject>() {
						@Override
						public void handle(JsonObject message) {
							conversationService.saveDraft(parentMessageId, message, user, defaultResponseHandler(request, 201));
						}
					});
				} else {
					unauthorized(request);
				}
			}
		});
	}

	@SecuredAction(value = "conversation.create.draft", type = ActionType.AUTHENTICATED)
	public void updateDraft(final HttpServerRequest request) {
		final String messageId = request.params().get("id");
		if (messageId == null || messageId.trim().isEmpty()) {
			badRequest(request);
			return;
		}
		getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if (user != null) {
					bodyToJson(request, new Handler<JsonObject>() {
						@Override
						public void handle(JsonObject message) {
							conversationService.updateDraft(messageId, message, user,
									defaultResponseHandler(request));
						}
					});
				} else {
					unauthorized(request);
				}
			}
		});
	}

	@SecuredAction("conversation.send")
	public void send(final HttpServerRequest request) {
		final String messageId = request.params().get("id");
		getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if (user != null) {
					final String parentMessageId = request.params().get("In-Reply-To");
					bodyToJson(request, new Handler<JsonObject>() {
						@Override
						public void handle(JsonObject message) {
							conversationService.send(parentMessageId, messageId, message, user,
									new Handler<Either<String, JsonObject>>() {
										@Override
										public void handle(Either<String, JsonObject> event) {
											if (event.isRight()) {
												timelineNotification(request, event.right().getValue(), user);
												renderJson(request, event.right().getValue());
											} else {
												JsonObject error = new JsonObject()
														.putString("error", event.left().getValue());
												renderJson(request, error, 400);
											}
										}
									});
						}
					});
				} else {
					unauthorized(request);
				}
			}
		});
	}

	private void timelineNotification(HttpServerRequest request, JsonObject sentMessage, UserInfos user) {
		log.debug(sentMessage.encode());
		JsonArray r = sentMessage.getArray("sentIds");
		String id = sentMessage.getString("id");
		String subject = sentMessage.getString("subject", "<span translate key=\"timeline.no.subject\"></span>");
		sentMessage.removeField("sentIds");
		sentMessage.removeField("id");
		sentMessage.removeField("subject");
		if (r == null || id == null || user == null) {
			return;
		}
		final JsonObject params = new JsonObject()
				.putString("uri", container.config().getString("userbook-host") +
						"/userbook/annuaire#" + user.getUserId() + "#" + user.getType())
				.putString("username", user.getUsername())
				.putString("subject", subject)
				.putString("messageUri", container.config().getString("host", "http://localhost:8019") +
						pathPrefix + "/conversation#/read-mail/" + id);
		String type = container.config().getString("app-name", Conversation.class.getSimpleName()).toUpperCase();
		List<String> recipients = new ArrayList<>();
		for (Object o : r) {
			if (!(o instanceof String)) continue;
			recipients.add((String) o);
		}
		try {
			notification.notifyTimeline(request, user, type, type + "_SENT",
					recipients, id, "notification/notify-send-message.html", params);
		} catch (IOException | MustacheException e) {
			log.error("Error sending conversation notification.", e);
		}
	}

	@SecuredAction(value = "conversation.list", type = ActionType.AUTHENTICATED)
	public void list(final HttpServerRequest request) {
		final String folder = request.params().get("folder");
		final String p = Utils.getOrElse(request.params().get("page"), "0", false);
		if (folder == null || folder.trim().isEmpty()) {
			badRequest(request);
			return;
		}
		getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if (user != null) {
					int page;
					try {
						page = Integer.parseInt(p);
					} catch (NumberFormatException e) { page = 0; }
					conversationService.list(folder, user, page, arrayResponseHandler(request));
				} else {
					unauthorized(request);
				}
			}
		});
	}

	@SecuredAction(value = "conversation.count", type = ActionType.AUTHENTICATED)
	public void count(final HttpServerRequest request) {
		final String folder = request.params().get("folder");
		final String unread = request.params().get("unread");
		if (folder == null || folder.trim().isEmpty()) {
			badRequest(request);
			return;
		}
		getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if (user != null) {
					Boolean b = null;
					if (unread != null && !unread.isEmpty()) {
						b = Boolean.valueOf(unread);
					}
					conversationService.count(folder, b, user, defaultResponseHandler(request));
				} else {
					unauthorized(request);
				}
			}
		});
	}

	@SecuredAction(value = "conversation.visible", type = ActionType.AUTHENTICATED)
	public void visible(final HttpServerRequest request) {
		getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if (user != null) {
					String parentMessageId = request.params().get("In-Reply-To");
					conversationService.findVisibleRecipients(parentMessageId, user,
							defaultResponseHandler(request));
				} else {
					unauthorized(request);
				}
			}
		});
	}

	@SecuredAction(value = "conversation.get", type = ActionType.AUTHENTICATED)
	public void getMessage(final HttpServerRequest request) {
		final String id = request.params().get("id");
		if (id == null || id.trim().isEmpty()) {
			badRequest(request);
			return;
		}
		getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if (user != null) {
					conversationService.get(id, user, defaultResponseHandler(request));
				} else {
					unauthorized(request);
				}
			}
		});
	}

	@SecuredAction(value = "conversation.trash", type = ActionType.AUTHENTICATED)
	public void trash(final HttpServerRequest request) {
		final List<String> ids = request.params().getAll("id");
		if (ids == null || ids.isEmpty()) {
			badRequest(request);
			return;
		}
		getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if (user != null) {
					conversationService.trash(ids, user, defaultResponseHandler(request));
				} else {
					unauthorized(request);
				}
			}
		});
	}

	@SecuredAction(value = "conversation.restore", type = ActionType.AUTHENTICATED)
	public void restore(final HttpServerRequest request) {
		final List<String> ids = request.params().getAll("id");
		if (ids == null || ids.isEmpty()) {
			badRequest(request);
			return;
		}
		getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if (user != null) {
					conversationService.restore(ids, user, defaultResponseHandler(request));
				} else {
					unauthorized(request);
				}
			}
		});
	}

	@SecuredAction(value = "conversation.delete", type = ActionType.AUTHENTICATED)
	public void delete(final HttpServerRequest request) {
		final List<String> ids = request.params().getAll("id");
		if (ids == null || ids.isEmpty()) {
			badRequest(request);
			return;
		}
		getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if (user != null) {
					conversationService.delete(ids, user, defaultResponseHandler(request, 204));
				} else {
					unauthorized(request);
				}
			}
		});
	}

}
