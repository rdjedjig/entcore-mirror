package org.entcore.common.notification;

import fr.wseduc.webutils.Either;
import io.vertx.core.Handler;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.Message;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import static fr.wseduc.webutils.Utils.handlerToAsyncHandler;

public interface NotificationService {
    String USERBOOK_ADDRESS = "userbook.preferences";

    default void getUsersPreferences(EventBus eb, JsonArray userIds, String fields, final Handler<JsonArray> handler) {
        eb.send(USERBOOK_ADDRESS, new JsonObject()
                .put("action", "get.userlist")
                .put("application", "timeline")
                .put("additionalMatch", ", u-[:IN]->(g:Group)-[:AUTHORIZED]->(r:Role)-[:AUTHORIZE]->(act:WorkflowAction) ")
                .put("additionalWhere", "AND act.name = \"org.entcore.timeline.controllers.TimelineController|mixinConfig\" ")
                .put("additionalCollectFields", ", " + fields)
                .put("userIds", userIds), handlerToAsyncHandler(new Handler<Message<JsonObject>>() {
            public void handle(Message<JsonObject> event) {
                if (!"error".equals(event.body().getString("status"))) {
                    handler.handle(event.body().getJsonArray("results"));
                } else {
                    handler.handle(null);
                }
            }
        }));
    }

    void getUsersFcmToken(final EventBus eb, final JsonArray userIds, final Handler<JsonArray> handler);

    void putFcmToken(String userId, String fcmToken, Handler<Either<String, JsonObject>> handler);

    void getFcmTokensByUser(String userId, final Handler<Either<String, JsonArray>> handler);

    void deleteFcmToken(String userId, String fcmToken, Handler<Either<String, JsonObject>> handler);

    void getFcmTokensByUsers(JsonArray userIds,final Handler<Either<String, JsonArray>> handler);

}