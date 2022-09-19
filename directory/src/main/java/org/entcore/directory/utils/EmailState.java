package org.entcore.directory.utils;

import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.Message;
import io.vertx.core.json.JsonObject;

import static fr.wseduc.webutils.Utils.handlerToAsyncHandler;

public class EmailState {
    static public String BUS_ADDRESS = "mail.state";

	/**
	 * Start a new mail validation workflow.
	 * @param userId user ID
	 * @param email the mail address to be checked
	 * @return the new emailState
	 */
    static public Future<JsonObject> setPending(EventBus eb, String userId, String email) {
        Promise<JsonObject> promise = Promise.promise();
		JsonObject action = new JsonObject()
            .put("action", "set-pending")
            .put("userId", userId)
            .put("email", email);
		eb.request(BUS_ADDRESS, action, handlerToAsyncHandler( reply -> {
            completePromise(reply, promise);
        }));
        return promise.future();
    }

	/**
	 * Check if a user has a verified email address
	 * @param userId user ID
	 * @return { state: "unchecked"|"pending"|"outdated"|"valid" }
	 */
    static public Future<JsonObject> isValid(EventBus eb, String userId) {
        Promise<JsonObject> promise = Promise.promise();
		JsonObject action = new JsonObject()
            .put("action", "is-valid")
            .put("userId", userId);
		eb.request(BUS_ADDRESS, action, handlerToAsyncHandler( reply -> {
            completePromise(reply, promise);
        }));
        return promise.future();
    }

	/**
	 * Verify a pending email address of a user, by checking a code.
	 * @param userId user ID
	 * @param code validation code to check
	 * @return { 
	 * 	state: "unchecked"|"pending"|"outdated"|"valid", 
	 * 	tries?: number of remaining retries,
	 *  ttl: number of seconds remaining before expiration of the code
	 * }
	 */
    static public Future<JsonObject> tryValidate(EventBus eb, String userId, String code) {
        Promise<JsonObject> promise = Promise.promise();
		JsonObject action = new JsonObject()
            .put("action", "try-validate")
            .put("userId", userId)
            .put("code", code);
		eb.request(BUS_ADDRESS, action, handlerToAsyncHandler( reply -> {
            completePromise(reply, promise);
        }));
        return promise.future();
    }

	/**
	 * Get current mail validation details.
	 * @param userId user ID
	 * @return {email:string, emailState:object|null, waitInSeconds:number}
	 */
    static public Future<JsonObject> getDetails(EventBus eb, String userId) {
        Promise<JsonObject> promise = Promise.promise();
		JsonObject action = new JsonObject()
            .put("action", "get-details")
            .put("userId", userId);
		eb.request(BUS_ADDRESS, action, handlerToAsyncHandler( reply -> {
            completePromise(reply, promise);
        }));
        return promise.future();
    }

	private static void completePromise(Message<JsonObject> res, Promise<JsonObject> promise) {
		if ("ok".equals(res.body().getString("status"))) {
			JsonObject r = res.body().getJsonObject("result", new JsonObject());
            promise.complete( r );
		} else {
            promise.fail( res.body().getString("message", "") );
		}
	}
}
