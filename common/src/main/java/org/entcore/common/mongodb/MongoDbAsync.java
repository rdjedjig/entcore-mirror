/*
 * Copyright © WebServices pour l'Éducation, 2014
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.entcore.common.mongodb;

import fr.wseduc.mongodb.MongoDbAPI;

import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

import javax.xml.bind.DatatypeConverter;

import io.vertx.core.Vertx;
import io.vertx.core.AsyncResult;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.eventbus.DeliveryOptions;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.Message;
import io.vertx.core.eventbus.impl.MessageImpl;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import io.vertx.ext.mongo.WriteOption;

import org.entcore.common.mongodb.MongoAsyncPersistor;

public class MongoDbAsync implements MongoDbAPI {

    private MongoAsyncPersistor persistor;

    private WriteOption writeConcernConverter(WriteConcern wc)
    {
        switch(wc)
        {
            default:
                return null;
        }
    }

    private Handler<Throwable> errorHandler(Handler<Message<JsonObject>> callback)
    {
        return new Handler<Throwable>()
        {
            @Override
            public void handle(Throwable t)
            {
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.fail(-1, t.getMessage());
                callback.handle(fake);
            }
        };
    }

    private Handler<String> idHandler(Handler<Message<JsonObject>> callback)
    {
        return new Handler<String>()
        {
            @Override
            public void handle(String id)
            {
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(new JsonObject().put("_id", id));
                callback.handle(fake);
            }
        };
    }

    private Handler<Long> longHandler(Handler<Message<JsonObject>> callback)
    {
        return new Handler<Long>()
        {
            @Override
            public void handle(Long nb)
            {
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(new JsonObject().put("number", nb));
                callback.handle(fake);
            }
        };
    }

    private Handler<JsonObject> documentHandler(Handler<Message<JsonObject>> callback)
    {
        return new Handler<JsonObject>()
        {
            @Override
            public void handle(JsonObject doc)
            {
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(new JsonObject().put("result", doc));
                callback.handle(fake);
            }
        };
    }

	private MongoDbAsync(Vertx vertx, JsonObject config)
    {
        this.persistor = new MongoAsyncPersistor(vertx, config);
	}

	private static class MongoDbAsyncHolder {
		private static final Map<Vertx, MongoDbAsync> instances = new HashMap<Vertx, MongoDbAsync>();

        public static MongoDbAsync getInstance(Vertx vertx, JsonObject config)
        {
            MongoDbAsync db = instances.get(vertx);
            if(db == null)
            {
                db = new MongoDbAsync(vertx, config);
                instances.put(vertx, db);
            }
            return db;
        }
	}

	public static MongoDbAsync getInstance(Vertx vertx) {
		return MongoDbAsyncHolder.getInstance(vertx, new JsonObject());
	}
	public static MongoDbAsync getInstance(Vertx vertx, JsonObject config) {
		return MongoDbAsyncHolder.getInstance(vertx, config);
	}

	public void init(EventBus eb, String address)
    {
        // Nothing to do
	}

	public void save(String collection, JsonObject document, WriteConcern writeConcern,
			final Handler<Message<JsonObject>> callback) {
		save(collection, document, writeConcern, null, callback);
	}

	public void save(String collection, JsonObject document, WriteConcern writeConcern,
			DeliveryOptions deliveryOptions, final Handler<Message<JsonObject>> callback)
    {
        System.out.println("SAVE");
        this.persistor.save(collection, document, this.writeConcernConverter(writeConcern), idHandler(callback), errorHandler(callback));
	}

	public void save(String collection, JsonObject document, Handler<Message<JsonObject>> callback) {
		save(collection, document, null, callback);
	}

	public void save(String collection, JsonObject document) {
		save(collection, document, null, null);
	}

	public void insert(String collection, JsonArray documents, WriteConcern writeConcern,
			Handler<Message<JsonObject>> callback) {
		insert(collection, documents, writeConcern, null, callback);
	}

	public void insert(String collection, JsonArray documents, WriteConcern writeConcern,
			DeliveryOptions deliveryOptions, Handler<Message<JsonObject>> callback)
    {
        System.out.println("INSERT");
		this.persistor.insert(collection, documents, new Handler<List<String>>()
        {
            @Override
            public void handle(List<String> ids)
            {
                JsonObject res = new JsonObject().put("number", ids.size()).put("_id", ids.size() > 0 ? ids.get(0) : null);

                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(res);
                callback.handle(fake);
            }
        }, errorHandler(callback));
	}

	public void insert(String collection, JsonArray documents, Handler<Message<JsonObject>> callback) {
		insert(collection, documents, null, callback);
	}

	public void insert(String collection, JsonObject document, Handler<Message<JsonObject>> callback) {
		insert(collection, new JsonArray().add(document), null, callback);
	}

	public void insert(String collection, JsonArray documents) {
		insert(collection, documents, null, null);
	}

	public void insert(String collection, JsonObject document) {
		insert(collection, new JsonArray().add(document), null, null);
	}

	public void update(String collection, JsonObject criteria, JsonObject objNew, boolean upsert, boolean multi,
			WriteConcern writeConcern, Handler<Message<JsonObject>> callback) {
		update(collection, criteria, objNew, upsert, multi, writeConcern, null, callback);
	}

	public void update(String collection, JsonObject criteria, JsonObject objNew, boolean upsert, boolean multi,
			WriteConcern writeConcern, DeliveryOptions deliveryOptions, Handler<Message<JsonObject>> callback)
    {
        System.out.println("UPDATE");
        this.persistor.update(collection, criteria, objNew, multi, upsert, this.writeConcernConverter(writeConcern), longHandler(callback), errorHandler(callback));
	}

	public void update(String collection, JsonObject criteria, JsonObject objNew, boolean upsert, boolean multi,
			Handler<Message<JsonObject>> callback) {
		update(collection, criteria, objNew, upsert, multi, null, callback);
	}

	public void update(String collection, JsonObject criteria, JsonObject objNew, boolean upsert, boolean multi) {
		update(collection, criteria, objNew, upsert, multi, null, null);
	}

	public void update(String collection, JsonObject criteria, JsonObject objNew) {
		update(collection, criteria, objNew, false, false, null, null);
	}

	public void update(String collection, JsonObject criteria, JsonObject objNew,
			Handler<Message<JsonObject>> callback) {
		update(collection, criteria, objNew, false, false, null, callback);
	}

	public void find(String collection, JsonObject matcher, JsonObject sort, JsonObject keys, int skip,
			int limit, int batchSize, Handler<Message<JsonObject>> callback) {
		find(collection, matcher, sort, keys, skip, limit, batchSize, null, callback);
	}

	public void find(String collection, JsonObject matcher, JsonObject sort, JsonObject keys, int skip,
			int limit, int batchSize, DeliveryOptions deliveryOptions, Handler<Message<JsonObject>> callback)
    {
        this.persistor.find(collection, matcher, keys, sort, limit, skip, null, batchSize, null, new Handler<List<JsonObject>>()
        {
            @Override
            public void handle(List<JsonObject> matched)
            {
                JsonObject res = new JsonObject().put("results", new JsonArray(matched)).put("status", "ok").put("number", matched.size());

                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(res);
                callback.handle(fake);
            }
        }, errorHandler(callback));
	}

	public void find(String collection, JsonObject matcher, JsonObject sort, JsonObject keys,
			Handler<Message<JsonObject>> callback) {
		find(collection, matcher, sort, keys, -1, -1, Integer.MAX_VALUE, callback);
	}

	public void find(String collection, JsonObject matcher, Handler<Message<JsonObject>> callback) {
		find(collection, matcher, null, null, -1, -1, Integer.MAX_VALUE, callback);
	}

	public void findOne(String collection, JsonObject matcher, JsonObject keys, JsonArray fetch,
			Handler<Message<JsonObject>> callback) {
		findOne(collection, matcher, keys, fetch, null, callback);
	}

	public void findOne(String collection, JsonObject matcher, JsonObject keys, JsonArray fetch,
			DeliveryOptions deliveryOptions, Handler<Message<JsonObject>> callback)
    {
		this.persistor.findOne(collection, matcher, keys, fetch, documentHandler(callback), errorHandler(callback));
	}

	public void findOne(String collection, JsonObject matcher, JsonObject keys, Handler<Message<JsonObject>> callback) {
		findOne(collection, matcher, keys, null, callback);
	}

	public void findOne(String collection, JsonObject matcher, Handler<Message<JsonObject>> callback) {
		findOne(collection, matcher, null, callback);
	}

	public void findAndModify(String collection, JsonObject matcher, JsonObject update, JsonObject sort,
			JsonObject fields, Handler<Message<JsonObject>> callback) {
		findAndModify(collection, matcher, update, sort, fields, false, false, false, callback);
	}

	public void findAndModify(String collection, JsonObject matcher, JsonObject update, JsonObject sort,
			JsonObject fields, boolean remove, boolean returnNew, boolean upsert,
			Handler<Message<JsonObject>> callback) {
		findAndModify(collection, matcher, update, sort, fields, remove, returnNew, upsert, null, callback);
	}

	public void findAndModify(String collection, JsonObject matcher, JsonObject update, JsonObject sort,
			JsonObject fields, boolean remove, boolean returnNew, boolean upsert,
			DeliveryOptions deliveryOptions, Handler<Message<JsonObject>> callback)
    {
        System.out.println("FAM");
        this.persistor.findAndModify(collection, matcher, update, fields, sort, remove, returnNew, upsert, new Handler<List<JsonObject>>()
        {
            @Override
            public void handle(List<JsonObject> docs)
            {
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(new JsonObject().put("result", docs.size() == 0 ? null : docs.get(0)));
                callback.handle(fake);
            }
        }, errorHandler(callback));
	}

	public void count(String collection, JsonObject matcher, Handler<Message<JsonObject>> callback)
    {
        this.persistor.count(collection, matcher, new Handler<Long>()
        {
            @Override
            public void handle(Long nb)
            {
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(new JsonObject().put("count", nb));
                callback.handle(fake);
            }
        }, errorHandler(callback));
	}

	public void distinct(String collection, String key, JsonObject matcher, Handler<Message<JsonObject>> callback)
    {
        this.persistor.distinct(collection, key, matcher, String.class, new Handler<JsonArray>()
        {
            @Override
            public void handle(JsonArray distincts)
            {
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(new JsonObject().put("values", distincts));
                callback.handle(fake);
            }
        }, errorHandler(callback));
	}

	public void distinct(String collection, String key, Handler<Message<JsonObject>> callback) {
		distinct(collection, key, null, callback);
	}

	public void delete(String collection, JsonObject matcher, WriteConcern writeConcern,
			Handler<Message<JsonObject>> callback) {
		delete(collection, matcher, writeConcern, null, callback);
	}

	public void delete(String collection, JsonObject matcher, WriteConcern writeConcern,
			DeliveryOptions deliveryOptions, Handler<Message<JsonObject>> callback)
    {
        this.persistor.delete(collection, matcher, this.writeConcernConverter(writeConcern), longHandler(callback), errorHandler(callback));
	}

	public void delete(String collection, JsonObject matcher, Handler<Message<JsonObject>> callback) {
		delete(collection, matcher, null, callback);
	}

	public void delete(String collection, JsonObject matcher) {
		delete(collection, matcher, null, null);
	}

	public void bulk(String collection, JsonArray commands, Handler<Message<JsonObject>> callback) {
		bulk(collection, commands, null, callback);
	}

	public void bulk(String collection, JsonArray commands, WriteConcern writeConcern,
			Handler<Message<JsonObject>> callback) {
		bulk(collection, commands, writeConcern, null, callback);
	}

	public void bulk(String collection, JsonArray commands, WriteConcern writeConcern, DeliveryOptions deliveryOptions, Handler<Message<JsonObject>> callback)
    {
        System.out.println("BULK");
        this.persistor.bulk(collection, commands, writeConcernConverter(writeConcern), new Handler<JsonObject>()
        {
            @Override
            public void handle(JsonObject result)
            {
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(result);
                callback.handle(fake);
            }
        }, errorHandler(callback));
	}

	public void command(String command, Handler<Message<JsonObject>> callback) {
		command(command, null, callback);
	}

	public void command(String command, DeliveryOptions deliveryOptions, Handler<Message<JsonObject>> callback)
    {
        this.persistor.runCommand(command, new JsonObject(), documentHandler(callback), errorHandler(callback));
	}

	public void aggregate(JsonObject command, final Handler<Message<JsonObject>> handler) {
		this.command(command.toString(), handler);
	}

	static boolean isOk(JsonObject body) {
		return "ok".equals(body.getString("status"));
	}

	public void aggregateBatched(String collection, JsonObject command, int maxBatch, final Handler<Message<JsonObject>> handler)
    {
        //this.persistor.aggregation(collection, command, null, new Handler<List<JsonObject>>()
        this.persistor.aggregation(collection, new JsonArray(), null, new Handler<List<JsonObject>>()
        {
            @Override
            public void handle(List<JsonObject> results)
            {
                JsonObject result = new JsonObject().put("result", new JsonObject().put("cursor", new JsonObject().put("firstBatch", new JsonArray(results))));
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(result);
                handler.handle(fake);
            }
        }, errorHandler(handler));
	}

	public void command(String command) {
		command(command, null);
	}

	public void getCollections(Handler<Message<JsonObject>> callback)
    {
        this.persistor.getCollections(new Handler<List<String>>()
        {
            @Override
            public void handle(List<String> colls)
            {
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(new JsonObject().put("collections", colls));
                callback.handle(fake);
            }
        }, errorHandler(callback));
	}

	public void getCollectionStats(String collection, Handler<Message<JsonObject>> callback)
    {
        this.persistor.getCollectionStats(collection, new Handler<JsonObject>()
        {
            @Override
            public void handle(JsonObject stats)
            {
                Message<JsonObject> fake = new MessageImpl<JsonObject,JsonObject>(null);
                fake.reply(new JsonObject().put("stats", stats));
                callback.handle(fake);
            }
        }, errorHandler(callback));
	}

	public static String formatDate(Date date) {
		DateFormat df = new SimpleDateFormat(ISO_DATE_FORMAT);
		return df.format(date);
	}

	public static Date parseDate(String date) throws ParseException {
		DateFormat df = new SimpleDateFormat(ISO_DATE_FORMAT);
		return df.parse(date);
	}

	public static JsonObject now() {
		return new JsonObject().put("$date", System.currentTimeMillis());
	}

	public static JsonObject offsetFromNow(long offsetInSeconds)
	{
		return new JsonObject().put("$date", System.currentTimeMillis() + (offsetInSeconds * 1000));
	}

	public static Date parseIsoDate(JsonObject date) {
		Object d = date.getValue("$date");
		if (d instanceof Long) {
			return new Date((Long) d);
		} else {
			Calendar c = DatatypeConverter.parseDateTime((String) d);
			return c.getTime();
		}
	}

}
