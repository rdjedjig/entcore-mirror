package org.entcore.directory.utils;

import io.vertx.core.Handler;
import io.vertx.core.eventbus.Message;
import io.vertx.core.json.JsonObject;

import static fr.wseduc.webutils.Utils.getOrElse;

import org.entcore.directory.services.MailValidationService;

/**
 * @see {@link EmailState} utility class for easier use
 */
public class EmailStateHandler implements Handler<Message<JsonObject>> {
    private MailValidationService validationSvc = null;
    private int ttlInSeconds     = 600;  // Validation codes are valid 10 minutes by default
    private int retryNumber      = 5;    // Validation code can be typed in 5 times by default
    private int waitInSeconds    = 10;   // Email is awaited 10 seconds by default (it's a front-side parameter)

    public EmailStateHandler(final JsonObject params, final MailValidationService svc) {
        if( params != null ) {
            ttlInSeconds    = params.getInteger("ttlInSeconds", 600);
            retryNumber     = params.getInteger("retryNumber",  5);
            waitInSeconds   = params.getInteger("waitInSeconds", 10);
        }
        validationSvc = svc;
    }

    private void replyWithOk(final Message<JsonObject> message, Object result) {
        JsonObject reply = new JsonObject().put("status", "ok");
        if( result != null) {
            reply.put("result", result);
        }
        message.reply( reply );
    }

    private void replyWithError(final Message<JsonObject> message, String error) {
        JsonObject reply = new JsonObject().put("status", "error");
        if( error != null) {
            reply.put("message", error);
        }
        message.reply( reply );
    }

    @Override
    public void handle(final Message<JsonObject> message) {
		String action = getOrElse(message.body().getString("action"), "");
		switch (action) {
			case "set-pending" : {
                validationSvc.setPendingMail(
                    message.body().getString("userId"), 
                    message.body().getString("email"), 
                    ttlInSeconds, 
                    retryNumber
                )
                .onSuccess( t -> { replyWithOk(message, t); })
                .onFailure( e -> { replyWithError(message, e.getMessage()); });
				break;
            }
            case "is-valid" : {
                validationSvc.hasValidMail(message.body().getString("userId"))
                .onSuccess( t -> { replyWithOk(message, t); })
                .onFailure( e -> { replyWithError(message, e.getMessage()); });
                break;
            }
            case "try-validate" : {
                validationSvc.tryValidateMail(
                    message.body().getString("userId"), 
                    message.body().getString("code")
                )
                .onSuccess( t -> { replyWithOk(message, t); })
                .onFailure( e -> { replyWithError(message, e.getMessage()); });
                break;
            }
            case "get-details" : {
                validationSvc.getMailState(message.body().getString("userId"))
                .onSuccess( t -> {
                    // Add missing data
                    t.put("waitInSeconds", waitInSeconds);
                    replyWithOk(message, t); 
                })
                .onFailure( e -> { replyWithError(message, e.getMessage()); });
                break;
            }
			default:
                message.reply( new JsonObject().put("status", "error").put("message", "[EmailStateHandler] Unknown action "+action) );
        }
    }
}
