package org.entcore.common.events.impl;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.entcore.common.redis.Redis;
import org.entcore.common.validation.ValidationException;

import fr.wseduc.webutils.Either;
import io.vertx.core.AsyncResult;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.json.JsonObject;
import io.vertx.redis.client.RedisAPI;

public class RedisEventStore extends GenericEventStore {

    private final Redis redis = Redis.getInstance();
    private String platform;

    public void init() {
		init(ar -> {
			if (ar.failed()) {
				logger.error("Error init RedisEventStore", ar.cause());
			}
		});
    }

    public void init(Handler<AsyncResult<Void>> handler) {
		final String eventStoreConf = (String) vertx.sharedData().getLocalMap("server").get("event-store");
		if (eventStoreConf != null) {
			final JsonObject eventStoreConfig = new JsonObject(eventStoreConf);
            this.platform = eventStoreConfig.getString("platform");
            handler.handle(Future.succeededFuture());
        } else {
			handler.handle(Future.failedFuture(new ValidationException("Missing event store config.")));
		}
    }

    @Override
    protected void storeEvent(JsonObject event, Handler<Either<String, Void>> handler) {
        RedisAPI redisAPI = redis.getRedisAPI();
        final List<String> e = eventToStringList(event);
        if (e.size() > 4) {
            redisAPI.xadd(e, ar -> {
                if (ar.succeeded()) {
                    handler.handle(new Either.Right<>(null));
                } else {
                    logger.error("Error persisting events on redis stream : " + event.encode(), ar.cause());
                    handler.handle(new Either.Left<>(
                                "Error : " + ar.cause().getMessage() + ", Event : " + event.encode()));
                }
            });
        }
    }

    private String removeProxyIp(String ip) {
		if (ip != null) {
			final int idxComma = ip.indexOf(',');
			if (idxComma > 0) {
				logger.warn("Remove proxy ip part in ip : " + ip);
				return ip.substring(0, idxComma);
			}
        }
        return ip;
    }

    private List<String> eventToStringList(JsonObject event) {
        final List<String> l = new ArrayList<>();
        l.add("eventsstream");
        l.add("*");
        l.add("platform_id");
        l.add(platform);
        for (String attr: event.fieldNames()) {
            Object value = event.getValue(attr);
            if (value == null) continue;

            String key = attr;
            if ("_id".equals(key)) {
                key = "id";
            } else if ("profil".equals(key)) {
                key = "profile";
            } else if ("event-type".equals(key)) {
                key = "event_type";
            } else if ("userId".equals(key)) {
                key = "user_id";
            } else if ("resource-type".equals(key)) {
                key = "resource_type";
            }
            l.add(key);
            if ("ip".equals(key)) {
                l.add(removeProxyIp(value.toString()));
            } else if ("date".equals(key)) {
                l.add(formatDate(value));
            } else {
                l.add(valueToString(value));
            }
        }
        return l;
    }

    private String formatDate(Object date) {
        return Instant.ofEpochMilli((long) date).atZone(ZoneId.systemDefault()).toLocalDateTime().toString();
    }

    private String valueToString(Object value) {
        final String v;
        if (value instanceof JsonObject) {
            v = ((JsonObject)value).encode();
        } else if (value instanceof Long) {
            v = value.toString();
        } else {
            v = value.toString();
        }
        return v;
    }

}
