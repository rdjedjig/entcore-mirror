/*
 * Copyright © "Open Digital Education", 2018
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

package org.entcore.common.notification;

import fr.wseduc.webutils.Either;
import io.vertx.core.Vertx;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.Message;
import org.entcore.common.cache.CacheService;
import org.entcore.common.neo4j.Neo4j;
import io.vertx.core.Handler;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.notification.impl.NotificationServiceCache;
import org.entcore.common.notification.impl.NotificationServiceDefault;
import org.entcore.common.utils.HtmlUtils;


import static fr.wseduc.webutils.Utils.handlerToAsyncHandler;
import static org.entcore.common.neo4j.Neo4jResult.validUniqueResultHandler;

public class NotificationUtils {
    private static int DEFAULT_TTL_SECONDS = 3600;
    private static final String USERBOOK_ADDRESS = "userbook.preferences";
    private static NotificationService service = new NotificationServiceDefault();

    public static void setCache(final Vertx vertx, final JsonObject config){
        final int ttl = config.getInteger("ttlSeconds", DEFAULT_TTL_SECONDS);
        service = new NotificationServiceCache(CacheService.create(vertx), service, ttl);
    }

    public static void getUsersFcmToken(final EventBus eb, final JsonArray userIds, final Handler<JsonArray> handler){
        service.getUsersFcmToken(eb, userIds, handler);
    }

    public static void getUsersPreferences(final EventBus eb, final JsonArray userIds, final String fields, final Handler<JsonArray> handler){
        service.getUsersPreferences(eb, userIds, fields, handler);
    }

    public static void putFcmToken(final String userId, final String fcmToken, final Handler<Either<String, JsonObject>> handler){
        service.putFcmToken(userId, fcmToken, handler);
    }

    public static void getFcmTokensByUser(final String userId, final Handler<Either<String, JsonArray>> handler){
        service.getFcmTokensByUser(userId, handler);
    }

    public static void deleteFcmToken(final String userId, final String fcmToken, final Handler<Either<String, JsonObject>> handler){
        service.deleteFcmToken(userId, fcmToken, handler);
    }

    public static void getFcmTokensByUsers(final JsonArray userIds, final Handler<Either<String, JsonArray>> handler){
        service.getFcmTokensByUsers(userIds, handler);
    }

    public static JsonObject htmlContentToPreview(String htmlContent){
        JsonObject preview =  new JsonObject();
        String text = HtmlUtils.extractFormatText(htmlContent, 4, 150);
        if(text.length() > 146)
            text = text.substring(0, 146) + "...";
        preview.put("text", text);
        preview.put("images", HtmlUtils.getAllImagesSrc(htmlContent)); // retro-compatibility for ode-mobile-framework < 1.2
        preview.put("medias", HtmlUtils.extractMedias(htmlContent));
        return preview;
    }
}
