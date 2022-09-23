package org.entcore.common.http.filter;

import fr.wseduc.webutils.http.Renders;
import fr.wseduc.webutils.request.filter.Filter;
import fr.wseduc.webutils.security.SecureHttpServerRequest;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.http.HttpServerRequest;

import org.entcore.common.emailstate.EmailState;
import org.entcore.common.http.response.DefaultPages;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;
import org.entcore.common.utils.StringUtils;

import static org.entcore.common.user.SessionAttributes.*;

import java.util.Map;

/**
 * This filter checks if the user needs to be redirected to must perform some mandatory validation before processing.
 * For example :
 * - validate Terms of Use     => redirect to /auth/revalidate-terms
 * - validate an email address => redirect to /auth/validate-mail
 */
public class MandatoryUserValidationFilter implements Filter {
    private final EventBus eventBus;
    
    private final static int    TERMS_OF_USE_IDX  = 0;
    private final static int    EMAIL_ADDRESS_IDX = 1;
    private final static String[][] whiteListedUrlsByStep = {
        {"/auth/revalidate-terms"},
        {"/auth/validate-mail", "/internal/userinfo", "/oauth2/userinfo", "/directory/user/mailstate"}
    };

    private final static String REDIRECT_TO_KEY = "MandatoryUserValidationFilterRedirectsTo";

    public MandatoryUserValidationFilter(EventBus eventBus) {
        this.eventBus = eventBus;
    }

    @Override
    public void canAccess(HttpServerRequest request, Handler<Boolean> handler) {
        // Ajax requests are not redirected (useless)
        if ("XMLHttpRequest".equals(request.headers().get("X-Requested-With"))){
            handler.handle(true);
            return;
        }
        final boolean isGET = request.method().name().equalsIgnoreCase("GET");
        UserUtils.getUserInfos(this.eventBus, request, userInfos -> {
            if (userInfos == null) {
                // Mandatory validations for deconnected users :
                // - none !
                handler.handle(true);
            } else {
                if (!(request instanceof SecureHttpServerRequest)) {
                    // Only @SecuredAction annotated methods can be filtered !
                    // But well-known public URL requiring user validation should be blacklisted here.
                    handler.handle(true);
                    return;
                }
                final SecureHttpServerRequest sreq = (SecureHttpServerRequest) request;
                // Chained mandatory validations for connected users.
                // A failure will deny the filter and then cause a redirection.
                Future.succeededFuture()
                .compose( ignored -> {
                    return checkTermsOfUse(sreq, userInfos, isGET);
                })
                .compose( ignored -> {
                    return checkEmailAddress(sreq, userInfos, isGET);
                })
                .onComplete( ar -> {
                    if( ar.succeeded() ) {
                        handler.handle(true);
                    } else {
                        // Memorize where to redirect this request
                        sreq.setAttribute(REDIRECT_TO_KEY, ar.cause().getMessage());
                        handler.handle(false);
                    }
                });
            }
        });
    }

    private boolean isInWhiteList(final String path, final int step) {
        // At every step we must also whitelist the previous steps URLs, to avoid deadlocks between filters.
        for( int i=0; i<=step; i++ ) {
            final String[] whiteList = whiteListedUrlsByStep[i];
            for( int j=0; j<whiteList.length; j++ ) {
                if( path.contains(whiteList[j]) ){
                    return true;
                }
            }
        }
        return false;
    }

    private Future<Void> checkTermsOfUse(final SecureHttpServerRequest request, UserInfos userInfos, final boolean isGET) {
        if( isGET && isInWhiteList(request.path(), TERMS_OF_USE_IDX) ) {
            return Future.succeededFuture(); // white-listed url
        }
        return checkTermsOfUse(request, userInfos);
    }

    private Future<Void> checkEmailAddress(final SecureHttpServerRequest request, UserInfos userInfos, final boolean isGET) {
        if( isGET && isInWhiteList(request.path(), EMAIL_ADDRESS_IDX) ) {
            return Future.succeededFuture(); // white-listed url
        }
        return checkEmailAddress(request, userInfos);
    }

    /** 
     * Connected users with a truthy "needRevalidateTerms" attributes are required to validate the Terms of use.
     */
    private Future<Void> checkTermsOfUse(SecureHttpServerRequest request, UserInfos userInfos) {
        Promise<Void> promise = Promise.promise();
        if (!request.headers().contains("Authorization")) {
            boolean needRevalidateTerms = false;
            //check whether user has validate terms in current session
            final Object needRevalidateTermsFromSession = userInfos.getAttribute(NEED_REVALIDATE_TERMS);
            if (needRevalidateTermsFromSession != null) {
                needRevalidateTerms = Boolean.valueOf(needRevalidateTermsFromSession.toString());
            } else {
                //check whether he has validated previously
                final Map<String, Object> otherProperties = userInfos.getOtherProperties();
                if (otherProperties != null && otherProperties.get(NEED_REVALIDATE_TERMS) != null) {
                    needRevalidateTerms = (Boolean) otherProperties.get(NEED_REVALIDATE_TERMS);
                } else {
                    needRevalidateTerms = true;
                }
            }
            if( needRevalidateTerms ) {
                promise.fail("/auth/revalidate-terms"); // Where to redirect. Must be white-listed...
            } else {
                promise.complete();
            }
        } else {
            promise.complete();
        }
        return promise.future();
    }

    /**
     * Only ADMLs are currently required to validate their email address.
     */
    private Future<Void> checkEmailAddress(SecureHttpServerRequest request, UserInfos userInfos) {
        if (userInfos.isADML()) {
            Promise<Void> promise = Promise.promise();
            EmailState.isValid(eventBus, userInfos.getUserId())
            .onSuccess( emailState -> {
                if( "valid".equals(emailState.getString("state")) ) {
                    promise.complete();
                } else {
                    promise.fail("/auth/validate-mail"); // Where to redirect. Must be white-listed...
                }
            })
            .onFailure( e -> {promise.fail("");});
            return promise.future();
        } else {
            return Future.succeededFuture();
        }
    }

    @Override
    public void deny(HttpServerRequest request) {
		if (!(request instanceof SecureHttpServerRequest)) {
			request.response().setStatusCode(401).setStatusMessage("Unauthorized")
				.putHeader("content-type", "text/html").end(DefaultPages.UNAUTHORIZED.getPage());
		} else {
            final SecureHttpServerRequest sreq = (SecureHttpServerRequest) request;
            String to = sreq.getAttribute(REDIRECT_TO_KEY);
            if( StringUtils.isEmpty(to) ) {
                request.response().setStatusCode(401).setStatusMessage("Unauthorized")
				.putHeader("content-type", "text/html").end(DefaultPages.UNAUTHORIZED.getPage());
            }
            Renders.redirect(request, to);
        }
    }
}
