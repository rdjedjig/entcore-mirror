/* Copyright © WebServices pour l'Éducation, 2014
 *
 * This file is part of ENT Core. ENT Core is a versatile ENT engine based on the JVM.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation (version 3 of the License).
 *
 * For the sake of explanation, any module that communicate over native
 * Web protocols, such as HTTP, with ENT Core is outside the scope of this
 * license and could be license under its own terms. This is merely considered
 * normal use of ENT Core, and does not fall under the heading of "covered work".
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

package org.entcore.common.share;

import fr.wseduc.webutils.Either;
import io.vertx.core.Handler;
import io.vertx.core.json.JsonObject;

import java.util.List;

public interface ShareService {

	void shareInfos(String userId, String resourceId, String acceptLanguage, String search,
					Handler<Either<String, JsonObject>> handler);

	void groupShare(String userId, String groupShareId, String resourceId, List<String> actions,
			Handler<Either<String, JsonObject>> handler);

	void userShare(String userId, String userShareId, String resourceId, List<String> actions,
			Handler<Either<String, JsonObject>> handler);

	void removeGroupShare(String groupId, String resourceId, List<String> actions,
			Handler<Either<String, JsonObject>> handler);

	void removeUserShare(String userId, String resourceId, List<String> actions,
			Handler<Either<String, JsonObject>> handler);

	void share(String userId, String resourceId, JsonObject share, Handler<Either<String, JsonObject>> handler);

}
