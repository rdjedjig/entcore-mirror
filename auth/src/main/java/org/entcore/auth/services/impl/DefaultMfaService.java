package org.entcore.auth.services.impl;

import fr.wseduc.webutils.Server;
import fr.wseduc.webutils.http.Renders;
import io.vertx.core.Future;
import io.vertx.core.Vertx;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.auth.services.MfaService;
import org.entcore.common.datavalidation.UserValidation;
import org.entcore.common.datavalidation.impl.AbstractDataValidationService;
import org.entcore.common.datavalidation.metrics.DataValidationMetricsFactory;
import org.entcore.common.datavalidation.utils.DataStateUtils;
import org.entcore.common.events.EventStore;
import org.entcore.common.sms.SmsSender;
import org.entcore.common.sms.SmsSenderFactory;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;
import org.entcore.common.utils.Mfa;
import org.entcore.common.utils.StringUtils;

import static fr.wseduc.webutils.Utils.getOrElse;
import static org.entcore.common.datavalidation.utils.DataStateUtils.*;



public class DefaultMfaService implements MfaService {
    static Logger logger = LoggerFactory.getLogger(DefaultMfaService.class);

    /** Inner service to manage field "mfaState" */
    //---------------------------------------------------------------
    private class MfaField extends AbstractDataValidationService {
    //---------------------------------------------------------------
        private SmsSender sms;
        public EventStore eventStore;

        MfaField(io.vertx.core.Vertx vertx, io.vertx.core.json.JsonObject config) {
            super(
                Mfa.withSms() ? "mobile" : "email", // used for reading only
                "mfaState", 
                vertx, 
                config
            );
        }

        /** 
         * @return MFA field metadata : state, names, target email or phone number
         * { state: JsonObject|null, firstName:string, lastName:string, displayName:string, target:string }
         */
        public Future<JsonObject> getCurrentMfaState(final String userId) {
            return retrieveFullState(userId)
            .compose( j -> {
                JsonObject state = j.getJsonObject(stateField);
    
                // Check business rules
                do {
                    if( state == null ) {
                        state = new JsonObject();
                        setState(state, OUTDATED);
                        j.put(stateField, state);
                        break;
                    }
                    // A MFA is never validated in the database ! Only in memory.
                    if( getState(state) == VALID ) {
                        // should never happen
                        setState(state, OUTDATED);
                        break;
                    }
                    // if TTL or max tries reached => outdated code
                    if (getState(state) == OUTDATED) {
                        break;
                    }
                    // Check time to live
                    Long ttl = getTtl(state);
                    if( ttl==null || ttl.compareTo(System.currentTimeMillis()) < 0 ) {
                        // TTL reached
                        setState(state, OUTDATED);
                        break;
                    }
                    // Check remaining tries
                    Integer tries = getTries(state);
                    if( tries==null || tries <= 0 ) {
                        setState(state, OUTDATED);
                        break;
                    }
                    // Otherwise, current code is still pending.
                } while(false);
                j.put("state", j.remove(stateField) );
                j.put("target", j.remove(Mfa.withSms() ? "mobile" : "email") );
                return Future.succeededFuture(j);
            });
        }

        public JsonObject formatAsResponse(final int state, final Integer tries, final Long ttl) {
            return formatAsResponse(state, null, tries, ttl);
        }

        @Override
        public Future<JsonObject> startUpdate(String userId, String unused, final long validDurationS, final int triesLimit) {
            // A new code is needed.
            final JsonObject state = new JsonObject();
            setState(state, PENDING);
            setKey(state, generateRandomCode());
            setTtl(state, System.currentTimeMillis() + validDurationS * 1000l);
            setTries(state, triesLimit);
            return updateState(userId, state);
        }

        public Future<JsonObject> outdateCode(final String userId, final JsonObject state) {
            setState(state, OUTDATED);
            setTtl(state, System.currentTimeMillis());
            return updateState(userId, state);
        }

        @Override
        public Future<JsonObject> tryValidate(String userId, String code) {
            return getCurrentMfaState(userId)
            .map( j -> {
                return j.getJsonObject("state");
            })
            .compose( state -> {
                // Check business rules
                do {
                    if( state == null ) {
                        // Code is outdated
                        state = new JsonObject();
                        setState(state, OUTDATED);
                        break;
                    }
                    // if TTL or max tries reached, then don't check code
                    if (getState(state) == OUTDATED) {
                        break;
                    }
                    // Check code
                    String key = StringUtils.trimToNull( getKey(state) );
                    if( key == null || !key.equals(StringUtils.trimToNull(code)) ) {
                        // Invalid
                        Integer tries = getTries(state);
                        if(tries==null) {
                            tries = 0;
                        } else {
                            tries = Math.max(0, tries.intValue() - 1 );
                        }
                        if( tries <= 0 ) {
                            setState(state, OUTDATED);
                        }
                        setTries(state, tries);
                        break;
                    }

                    // ---Validation succeeded---
                    // Clean data in neo4j, and remember an MFA was done successfully.
                    return updateState(userId, null)
                    .map( unused -> {
                        return formatAsResponse(VALID, null, null);
                    });
                } while(false);

                // ---Validation results---
                return updateState(userId, state)
                .map( newState -> {
                    return formatAsResponse(getState(newState), getTries(newState), getTtl(newState));
                });
            });
        }

        @Override
        public Future<JsonObject> hasValid(String userId) {
            return Future.failedFuture("No data to check");
        }

        @Override
        public Future<String> sendValidationMessage( final HttpServerRequest request, String target, JsonObject templateParams ) {
            if( StringUtils.isEmpty(target) ) {
                logger.info("[2FA] Cannot send a code through sms or email, since target is empty !");
                return Future.failedFuture("empty.target");
            }

            if( Mfa.withSms() ) {
                return sms.sendUnique(request, target, "phone/mfaCode.txt", templateParams, "MFA");
            }
            
            // if( Mfa.withEmail() ) {
            //     return Future.failedFuture("not implemented yet");
            // }

            return Future.failedFuture("not.implemented.yet");
        }
    }

    //---------------------------------------------------------------
    private MfaField mfaField = null;
    private EventBus eb = null;

    public DefaultMfaService(final Vertx vertx, final io.vertx.core.json.JsonObject config) {
        mfaField = new MfaField(vertx, config);
        eb = Server.getEventBus(vertx);
        DataValidationMetricsFactory.init(vertx, config);
    }

    public Future<JsonObject> startMfaWorkflow(final HttpServerRequest request, final JsonObject session, final UserInfos userInfos) {
        if( Mfa.isNotActivatedForUser(userInfos) ) {
            // Mfa deactivated => error
            return Future.failedFuture("not.active");
        }

        // Retrieve metadata, since target email address or phone number is needed
        return mfaField.getCurrentMfaState(userInfos.getUserId())
        .compose( j -> {
            // Generate a new code
            return mfaField.startUpdate(
                userInfos.getUserId(), 
                null, 
                UserValidation.getDefaultTtlInSeconds(), 
                UserValidation.getDefaultRetryNumber()
            ).compose( mfaState -> {
                if( getState(mfaState) != PENDING ) {
                    return Future.succeededFuture(mfaState);
                } else {
                    final Long expires = getOrElse(getTtl(mfaState), UserValidation.getDefaultWaitInSeconds()*1000l);

                    JsonObject templateParams = new JsonObject()
                    .put("scheme", Renders.getScheme(request))
                    .put("host", Renders.getHost(request))
                    .put("userId", userInfos.getUserId())
                    .put("firstName", userInfos.getFirstName())
                    .put("lastName", userInfos.getLastName())
                    .put("userName", userInfos.getUsername())
                    .put("duration", Math.round(DataStateUtils.ttlToRemainingSeconds(expires) / 60f))
                    .put("code", DataStateUtils.getKey(mfaState));

                    return mfaField.sendValidationMessage(request, j.getString("target"), templateParams)
                    .onFailure( t -> {
                        // Code was not sent => consider it is outdated
                        logger.error(t);
                        mfaField.outdateCode(userInfos.getUserId(), mfaState);
                    })
                    .map( msgId -> {
                        // Code was sent => this is a metric to follow
                        DataValidationMetricsFactory.getRecorder().onMfaCodeGenerated();
                        return mfaState;
                    });
                }
            });
        })
        .map( state -> {
            return mfaField.formatAsResponse(getState(state), getTries(state), getTtl(state));
        });
    }

    public Future<JsonObject> tryCode(final HttpServerRequest request, final UserInfos userInfos, final String key) {
        if( Mfa.isNotActivatedForUser(userInfos) ) {
            // Mfa deactivated => error
            return Future.failedFuture("validate-mfa.error.not.active");
        }
        return mfaField
        .tryValidate( userInfos.getUserId(), key )
        .map( result -> {
            if( result !=null && "valid".equalsIgnoreCase(result.getString("state")) ) {
                UserValidation.setIsMFA(eb, UserUtils.getSessionId(request).get(), true);
                // Code was consumed => this is a metric to follow
                DataValidationMetricsFactory.getRecorder().onMfaCodeConsumed();
            }
            return result;
        });
    }

	public DefaultMfaService setEventStore(EventStore eventStore) {
		this.mfaField.eventStore = eventStore;
        this.mfaField.sms = SmsSenderFactory.getInstance().newInstance(eventStore );
        return this;
	}
}