/*
 * Copyright © WebServices pour l'Éducation, 2016
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
 */

package org.entcore.cas.services;

import fr.wseduc.cas.entities.User;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class LabomepRegisteredService extends AbstractCas20ExtensionRegisteredService {

	private static final Logger log = LoggerFactory.getLogger(LabomepRegisteredService.class);

	@Override
	public void configure(io.vertx.core.eventbus.EventBus eb, Map<String,Object> conf) {
		super.configure(eb, conf);
		this.directoryAction = "getUserInfos";
	};

	@Override
	protected void prepareUserCas20(User user, String userId, String service, JsonObject data, Document doc, List<Element> additionnalAttributes) {
		user.setUser(data.getString(principalAttributeName));

		try {
			// Uid
			if (data.containsKey("externalId")) {
				additionnalAttributes.add(createTextElement("uid", data.getString("externalId"), doc));
			}

			// administratives Structures first
			final List<String> uaiList = new ArrayList<>();

			for (Object o : data.getJsonArray("administratives", new JsonArray())) {
				JsonObject structure = (JsonObject) o;
				final String uai = structure.getString("UAI");
				if (!StringUtils.isEmpty(uai)) {
					uaiList.add(uai);
					additionnalAttributes.add(createTextElement("structures", uai, doc));
				}
			}

			// Structures
			for (Object o : data.getJsonArray("structures", new fr.wseduc.webutils.collections.JsonArray())) {
				JsonObject structure = (JsonObject) o;
				final String uai = structure.getString("UAI");
				if (!StringUtils.isEmpty(uai) && !uaiList.contains(uai)) {
					additionnalAttributes.add(createTextElement("structures", uai, doc));
				}
			}

			// classes
			for (Object o : data.getJsonArray("classes", new fr.wseduc.webutils.collections.JsonArray())) {
				JsonObject classe = (JsonObject) o;
				additionnalAttributes.add(createTextElement("classes", classe.getString("name"), doc));
			}

			// Profile
			switch(data.getString("type")) {
				case "Student" :
					additionnalAttributes.add(createTextElement("profile", "National_1", doc));
					break;
				case "Teacher" :
					additionnalAttributes.add(createTextElement("profile", "National_3", doc));
					break;
				case "Relative" :
					additionnalAttributes.add(createTextElement("profile", "National_2", doc));
					break;
				case "Personnel" :
					additionnalAttributes.add(createTextElement("profile", "National_4", doc));
					break;
			}

			// Lastname
			if (data.containsKey("lastName")) {
				additionnalAttributes.add(createTextElement("nom", data.getString("lastName"), doc));
			}

			// Firstname
			if (data.containsKey("firstName")) {
				additionnalAttributes.add(createTextElement("prenom", data.getString("firstName"), doc));
			}

			// Email
			if (data.containsKey("email")) {
				additionnalAttributes.add(createTextElement("email", data.getString("email"), doc));
			}

		} catch (Exception e) {
			log.error("Failed to extract user's attributes for Labomep", e);
		}
	}

}
