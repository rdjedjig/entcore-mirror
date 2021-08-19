package org.entcore.common.notification.impl;

import fr.wseduc.webutils.Either;
import io.vertx.core.Handler;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.notification.NotificationService;
import org.entcore.common.notification.NotificationUtils;

import static org.entcore.common.neo4j.Neo4jResult.validUniqueResultHandler;

public class NotificationServiceDefault implements NotificationService {

    @Override
    public void getUsersFcmToken(final EventBus eb, final JsonArray userIds, final Handler<JsonArray> handler) {
        this.getUsersPreferences(eb, userIds, "tokens: uac.fcmTokens", handler);
    }

    @Override
    public void putFcmToken(final String userId, final String fcmToken, final Handler<Either<String, JsonObject>> handler) {
        final JsonObject params = new JsonObject().put("userId", userId).put("fcmToken", fcmToken);
        final String query = "MATCH (u:User {id: {userId}}) MERGE (u)-[:PREFERS]->(uac:UserAppConf)" +
                "ON CREATE SET uac.fcmTokens = [{fcmToken}] " +
                "ON MATCH SET uac.fcmTokens = FILTER(token IN coalesce(uac.fcmTokens, []) WHERE token <> {fcmToken}) + {fcmToken}";
        Neo4j.getInstance().execute(query, params, validUniqueResultHandler(handler));
    }

    @Override
    public void getFcmTokensByUser(final String userId, final Handler<Either<String, JsonArray>> handler) {
        final JsonObject params = new JsonObject().put("userId", userId);
        final String query = "MATCH (u:User {id:{userId}})-[:PREFERS]->(uac:UserAppConf)"
                +" RETURN uac.fcmTokens AS tokens, u.id as userid";
        Neo4j.getInstance().execute(query, params, validUniqueResultHandler(new Handler<Either<String, JsonObject>>() {
            @Override
            public void handle(Either<String, JsonObject> event) {
                if(event.isRight()){
                    JsonArray result = event.right().getValue().getJsonArray("tokens");
                    if (result == null)
                        result = new JsonArray();
                    handler.handle(new Either.Right<String, JsonArray>(result));
                }else {
                    handler.handle(new Either.Left<String, JsonArray>(event.left().getValue()));
                }
            }
        }));
    }

    @Override
    public void deleteFcmToken(final String userId, final String fcmToken, final Handler<Either<String, JsonObject>> handler) {
        final JsonObject params = new JsonObject().put("userId", userId).put("fcmToken", fcmToken);
        final String query = "MATCH (u:User {id: {userId}}) MERGE (u)-[:PREFERS]->(uac:UserAppConf)" +
                "ON CREATE SET uac.fcmTokens = [{fcmToken}] " +
                "ON MATCH SET uac.fcmTokens = FILTER(token IN coalesce(uac.fcmTokens, []) WHERE token <> {fcmToken})";
        Neo4j.getInstance().execute(query, params, validUniqueResultHandler(handler));
    }

    @Override
    public void getFcmTokensByUsers(final JsonArray userIds, final Handler<Either<String, JsonArray>> handler) {
        final JsonObject params = new JsonObject().put("userIds", userIds);
        final String query = "MATCH (u:User)-[:PREFERS]->(uac:UserAppConf) WHERE u.id IN {userIds} " +
                " UNWIND(uac.fcmTokens) as token WITH DISTINCT token RETURN collect(token) as tokens, u.id as userid";

        Neo4j.getInstance().execute(query, params, validUniqueResultHandler(new Handler<Either<String, JsonObject>>() {
            @Override
            public void handle(Either<String, JsonObject> event) {
                if(event.isRight()){
                    JsonArray result = event.right().getValue().getJsonArray("tokens");
                    if (result == null)
                        result = new JsonArray();
                    handler.handle(new Either.Right<String, JsonArray>(result));
                }else {
                    handler.handle(new Either.Left<String, JsonArray>(event.left().getValue()));
                }
            }
        }));
    }
}
