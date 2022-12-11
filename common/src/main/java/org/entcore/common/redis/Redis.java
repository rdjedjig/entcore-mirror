/*
 * Copyright © "Open Digital Education", 2020
 *
 * This program is published by "Open Digital Education".
 * You must indicate the name of the software and the company in any production /contribution
 * using the software and indicate on the home page of the software industry in question,
 * "powered by Open Digital Education" with a reference to the website: https://opendigitaleducation.com/.
 *
 * This program is free software, licensed under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3 of the License.
 *
 * You can redistribute this application and/or modify it since you respect the terms of the GNU Affero General Public License.
 * If you modify the source code and then use this modified source code in your creation, you must make available the source code of your modifications.
 *
 * You should have received a copy of the GNU Affero General Public License along with the software.
 * If not, please see : <http://www.gnu.org/licenses/>. Full compliance requires reading the terms of this license and following its directives.

 */

package org.entcore.common.redis;

import fr.wseduc.webutils.Utils;
import io.vertx.core.AsyncResult;
import io.vertx.core.Handler;
import io.vertx.core.Vertx;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.redis.RedisClient;
import io.vertx.redis.RedisOptions;
import io.vertx.redis.client.RedisAPI;
import io.vertx.redis.client.RedisConnection;

public class Redis {

    private static final int MAX_RECONNECT_RETRIES = 16;
    private static final Logger log = LoggerFactory.getLogger(Redis.class);

    private Vertx vertx;
    private RedisClient redisClient;
    private RedisOptions redisOptions;
    private io.vertx.redis.client.RedisOptions newRedisOptions;
    private RedisConnection redisConnection;

    private Redis() {
    }

    private static class RedisHolder {
        private static final Redis instance = new Redis();
    }

    public static Redis getInstance() {
        return RedisHolder.instance;
    }

    public void init(Vertx vertx, JsonObject redisConfig) {
        this.vertx = vertx;
        this.redisOptions = new RedisOptions()
                .setHost(redisConfig.getString("host"))
                .setPort(redisConfig.getInteger("port"))
                .setSelect(redisConfig.getInteger("select", 0));
        if(redisConfig.containsKey("auth")){
            this.redisOptions.setAuth(redisConfig.getString("auth"));
        }
        if (Utils.getOrElse(redisConfig.getBoolean("legacy-client"), true)) {
            this.redisClient = RedisClient.create(vertx, redisOptions);
        }
        if (Utils.getOrElse(redisConfig.getBoolean("reconnect-client"), false)) {
            this.newRedisOptions = new io.vertx.redis.client.RedisOptions()
                .setConnectionString(formatConnectionString(redisConfig));
            createRedisClient(ar -> {
                if (ar.failed()) {
                    attemptReconnect(0);
                    log.error("error creating redis client", ar.cause());
                }
            });
        }
    }

    private final String formatConnectionString(JsonObject redisConfig) {
        final String auth = Utils.isNotEmpty(redisConfig.getString("auth")) ? ":" + redisConfig.getString("auth") + "@" : "";
        return "redis://" + auth + redisConfig.getString("host") + ":" + redisConfig.getInteger("port") + "/" + redisConfig.getInteger("select", 0);
    }

    public RedisClient getRedisClient() {
        return this.redisClient;
    }

    public RedisAPI getRedisAPI() {
        return RedisAPI.api(redisConnection);
    }

    public RedisOptions getRedisOptions() {
        return this.redisOptions;
    }

    public static RedisClient getClient() {
        return getInstance().getRedisClient();
    }

    public static RedisClient createClientForDb(Vertx vertx, Integer db) {
        if(db.equals(getInstance().redisOptions.getSelect())){
            return getInstance().getRedisClient();
        }
        final RedisOptions options = getInstance().getRedisOptions();
        return RedisClient.create(vertx, new RedisOptions()
                                                .setHost(options.getHost())
                                                .setPort(options.getPort())
                                                .setSelect(db));
    }

    private void createRedisClient(Handler<AsyncResult<RedisConnection>> handler) {
        io.vertx.redis.client.Redis.createClient(vertx, newRedisOptions).connect(onConnect -> {
            if (onConnect.succeeded()) {
                this.redisConnection = onConnect.result();
                this.redisConnection.exceptionHandler(e -> {
                    log.error("Redis connection exception", e);
                    attemptReconnect(0);
                });
            }
            handler.handle(onConnect);
        });
    }

    private void attemptReconnect(int retry) {
        log.warn("Redis reconnect retry number : " + retry);
        if (retry > MAX_RECONNECT_RETRIES) {
          log.error("Redis reconnect error : max retries");
        } else {
            final long backoff = (long) (Math.pow(2, Math.min(retry, 10)) * 10);

            vertx.setTimer(backoff, timer -> createRedisClient(onReconnect -> {
                if (onReconnect.failed()) {
                    attemptReconnect(retry + 1);
                }
            }));
        }
    }

}
