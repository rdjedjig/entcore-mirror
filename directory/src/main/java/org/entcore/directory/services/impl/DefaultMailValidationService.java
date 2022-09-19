/* Copyright © "Open Digital Education", 2014
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

 *
 */

package org.entcore.directory.services.impl;

import fr.wseduc.webutils.Either;

import org.entcore.common.neo4j.Neo4j;
import static org.entcore.common.neo4j.Neo4jResult.*;
import org.entcore.common.utils.StringUtils;
import org.entcore.directory.services.MailValidationService;
import org.entcore.directory.utils.EmailStateUtils;

import static org.entcore.directory.utils.EmailStateUtils.*;

import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonObject;

public class DefaultMailValidationService implements MailValidationService {
	private final Neo4j neo = Neo4j.getInstance();

	public DefaultMailValidationService() {
	}

	/** 
	 * @return { email: String|null, emailState: JsonObject|null }
	 */
	private Future<JsonObject> retrieveFullMailState(String userId) {
		final Promise<JsonObject> promise = Promise.promise();
		String query =
				"MATCH (u:`User` { id : {id}}) " +
				"RETURN u.email as email, COALESCE(u.emailState, null) as emailState ";
		JsonObject params = new JsonObject().put("id", userId);
		neo.execute(query, params, m -> {
			Either<String, JsonObject> r = validUniqueResult(m);
			if (r.isRight()) {
				final JsonObject result = r.right().getValue();
				result.put("emailState", fromRaw(result.getString("emailState")));
				promise.complete( result );
			} else {
				promise.fail(r.left().getValue());
			}
		});
		return promise.future();
	}

	/**
	 * @return emailState
	 */
	private Future<JsonObject> updateMailState(String userId, final JsonObject emailState) {
		final Promise<JsonObject> promise = Promise.promise();
		StringBuilder query = new StringBuilder(
			"MATCH (u:`User` { id : {id}}) " +
			"SET u.emailState = {state} "
		);
		JsonObject params = new JsonObject()
			.put("id", userId)
			.put("state", toRaw(emailState));
		if( EmailStateUtils.getState(emailState) == EmailStateUtils.VALID 
				&& !StringUtils.isEmpty(EmailStateUtils.getValid(emailState)) ) {
			query.append(", u.email = {email}, u.emailSearchField = LOWER({email}) ");
			params.put("email", EmailStateUtils.getValid(emailState));
		}
		neo.execute(query.toString(), params, m -> {
			Either<String, JsonObject> r = validEmpty(m);
			if (r.isRight()) {
				promise.complete(emailState);
			} else {
				promise.fail(r.left().getValue());
			}
		});
		return promise.future();
	}

    /**
     * Since Neo4j does not allow JSON objects to be node properties,
     * User.emailState is stored as a JSON string
	 * => serialize it
     * @param emailState as JSON object
     * @return emailState as JSON string
     */
    private String toRaw(final JsonObject emailState) {
        if( emailState==null ) return null;
        return emailState.encode();
    }

    /**
     * Since Neo4j does not allow JSON objects to be node properties,
     * User.emailState is stored as a JSON string
	 * => deserialize it
     * @param emailState as JSON string
     * @return emailState as JSON object
     */
    private JsonObject fromRaw(final String emailState) {
        if( emailState==null ) return null;
        return new JsonObject(emailState);
    }

	/** Generate a pseudo-random code of 6 digits length. */
	private String generateRandomCode() {
		return String.format("%06d", Math.round(Math.random()*999999D));
	}

	private JsonObject formatAsResponse(final int state, final Integer tries, final Long ttl) {
		JsonObject o = new JsonObject();
		switch( state ) {
			case VALID: {
				return o.put("state", "valid");
			}
			case PENDING: {
				o.put("state", "pending");
				break;
			}
			case OUTDATED: {
				o.put("state", "outdated"); 
				break;
			}
			case UNCHECKED: {
				return o.put("state", "unchecked");
			}
		}
		if(tries!=null) o.put("tries", tries);
		if(ttl!=null) o.put("ttl", Math.max(0, Math.round((ttl.longValue()-System.currentTimeMillis()) / 1000l) ));

		return o;
	}

	@Override
	public Future<JsonObject> setPendingMail(String userId, String email, final long validDurationS, final int triesLimit) {
		return retrieveFullMailState(userId)
		.compose( j -> {
			// Reset the mailState to a pending state
			final JsonObject originalState = j.getJsonObject("emailState", new JsonObject());
			setState(originalState, PENDING);
			// Valid mail must stay unchanged if not null, otherwise initialize to an empty string.
			if( getValid(originalState) == null ) {
				setValid(originalState, "");
			}
			setPending(originalState, email);
			setKey(originalState, generateRandomCode());
			setTtl(originalState, System.currentTimeMillis() + validDurationS * 1000l);
			setTries(originalState, triesLimit);

			return updateMailState(userId, originalState);
		});
	}

	@Override
	public Future<JsonObject> hasValidMail(String userId) {
		return retrieveFullMailState(userId)
		.map( j -> {
			Integer state = null;
			String email = j.getString("email");
			JsonObject emailState = j.getJsonObject("emailState");

			if (email == null || emailState == null) {
				state = UNCHECKED;
			} else if( !email.equalsIgnoreCase( getValid(emailState) )) {
				// Case where the email was first validated and then changed.
				state = getState(emailState);
				if( state == VALID ) {
					state = UNCHECKED;
				}
			} else {
				state = VALID;
			}
			return formatAsResponse(state, null, null);
		});
	}

	@Override
	public Future<JsonObject> tryValidateMail(String userId, String code) {
		return retrieveFullMailState(userId)
		.compose( j -> {
			JsonObject emailState = j.getJsonObject("emailState");

			// Check business rules
			do {
				if( emailState == null ) {
					// Unexpected data, should never happen
					emailState = new JsonObject();
					j.put("emailState", emailState);
					setState(emailState, OUTDATED);
					break;
				}
				// Check code
				String key = StringUtils.trimToNull( getKey(emailState) );
				if( key == null || !key.equals(StringUtils.trimToNull(code)) ) {
					// Invalid
					Integer tries = getTries(emailState);
					if(tries==null) {
						tries = 0;
						setState(emailState, OUTDATED);
					} else {
						tries = Math.max(0, tries.intValue() - 1 );
					}
					setTries(emailState, tries);
					break;
				}
				// Check time to live
				Long ttl = getTtl(emailState);
				if( ttl==null || ttl.compareTo(System.currentTimeMillis()) < 0 ) {
					// TTL reached
					setState(emailState, OUTDATED);
					setTries(emailState, 0);
					break;
				}
				// Check pending mail address
				String pending = StringUtils.trimToNull( getPending(emailState) );
				if( pending == null) {
					// This should never happen, but treat it like TTL was reached
					setState(emailState, OUTDATED);
					setTries(emailState, 0);
					break;
				}
				// ---Validation succeeded---
				setState(emailState, VALID);
				setValid(emailState, pending);
				setPending(emailState, null);
				setKey(emailState, null);
				setTtl(emailState, null);
				setTries(emailState, null);
			} while(false);

			// ---Validation results---
			return updateMailState(userId, emailState)
			.map( newState -> {
				return formatAsResponse(getState(newState), getTries(newState), getTtl(newState));
			});
		});
	}

	@Override
	public Future<JsonObject> getMailState(String userId) {
		return retrieveFullMailState(userId);
	}

}
