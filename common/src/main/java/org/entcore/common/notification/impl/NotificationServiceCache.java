package org.entcore.common.notification.impl;

import fr.wseduc.webutils.Either;
import io.vertx.core.Handler;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.cache.CacheService;
import org.entcore.common.notification.NotificationService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class NotificationServiceCache implements NotificationService {
    private static Logger log = LoggerFactory.getLogger(NotificationServiceCache.class);
    private final CacheService cacheService;
    private final NotificationService service;
    private final int ttlSeconds;

    private static String getUserIdFromKey(String key){
        return  key.replace("notification:fcm:", "");
    }

    private static String getKey(String userId){
        return "notification:fcm:" + userId;
    }

    public NotificationServiceCache(final CacheService cacheService, final NotificationService service, final int ttl) {
        this.ttlSeconds = ttl;
        this.service = service;
        this.cacheService = cacheService;
    }

    @Override
    public void getUsersFcmToken(final EventBus eb, final JsonArray userIds, final Handler<JsonArray> handler) {
        Set<String> ids = userIds.stream().map(e-> getKey(e.toString())).collect(Collectors.toSet());
        this.cacheService.getAll(ids, cached -> {
            final JsonArray userIdsUnCached = new JsonArray().addAll(userIds);
            if(cached.succeeded()){
                final List<JsonObject> preferenceList = new ArrayList<>();
                final Map<String, String> map = cached.result();
                for(final Map.Entry<String, String> entry : map.entrySet()){
                    try {
                        final String key = entry.getKey();
                        final String value = entry.getValue();
                        final JsonObject preferences = new JsonObject(value);
                        final String userId = getUserIdFromKey(key);
                        userIdsUnCached.remove(userId);
                        preferenceList.add(preferences);
                    } catch (Exception e) {
                        log.error("could not parse cached fcm", e);
                    }
                }
                if(userIdsUnCached.isEmpty()){
                    //finish
                    handler.handle(new JsonArray(preferenceList));
                }else{
                    //query uncached userid
                    this.service.getUsersFcmToken(eb, userIdsUnCached, uncached ->{
                        for(final Object o : uncached){
                            final JsonObject json  = (JsonObject) o;
                            final String userid = json.getString("userId");
                            this.cacheService.upsert(getKey(userid), json.toString(),ttlSeconds, e -> {});
                            preferenceList.add(json);
                        }
                        //finish
                        handler.handle(new JsonArray(preferenceList));
                    });
                }
            }
        });
    }

    @Override
    public void putFcmToken(String userId, String fcmToken, Handler<Either<String, JsonObject>> handler) {
        this.cacheService.remove(getKey(userId), e->{
            this.service.putFcmToken(userId, fcmToken, handler);
        });
    }

    @Override
    public void getFcmTokensByUser(String userId, Handler<Either<String, JsonArray>> handler) {
        //dont cache => used only by api
        this.service.getFcmTokensByUser(userId, handler);
    }

    @Override
    public void deleteFcmToken(String userId, String fcmToken, Handler<Either<String, JsonObject>> handler) {
        this.cacheService.remove(getKey(userId), e->{
            this.service.deleteFcmToken(userId, fcmToken, handler);
        });
    }

    @Override
    public void getFcmTokensByUsers(JsonArray userIds, Handler<Either<String, JsonArray>> handler) {
        //dont cache => used only by api
        this.service.getFcmTokensByUsers(userIds, handler);
    }
}
