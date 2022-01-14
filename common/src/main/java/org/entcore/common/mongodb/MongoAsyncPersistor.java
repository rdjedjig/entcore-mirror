/*
 * Copyright 2011-2012 the original author or authors.
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

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.ArrayList;

import io.vertx.core.Vertx;
import io.vertx.core.Handler;
import io.vertx.core.AsyncResult;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;

import io.vertx.ext.mongo.MongoClient;
import io.vertx.ext.mongo.WriteOption;
import io.vertx.ext.mongo.FindOptions;
import io.vertx.ext.mongo.UpdateOptions;
import io.vertx.ext.mongo.AggregateOptions;
import io.vertx.ext.mongo.BulkOperation;
import io.vertx.ext.mongo.BulkWriteOptions;
import io.vertx.ext.mongo.MongoClientBulkWriteResult;
import io.vertx.ext.mongo.MongoClientDeleteResult;
import io.vertx.ext.mongo.MongoClientUpdateResult;


public class MongoAsyncPersistor
{
  private MongoClient client;
  private WriteOption writeOption;

  protected static final Logger log = LoggerFactory.getLogger(MongoAsyncPersistor.class);
  private static final Handler<Throwable> DEFAULT_ERROR_HANDLER = new Handler<Throwable>()
  {
    @Override
    public void handle(Throwable t)
    {
      log.error(t.getMessage());
    }
  };

  public MongoAsyncPersistor(Vertx vertx, JsonObject config)
  {
    this.client = MongoClient.createShared(vertx, this.convertOldConfToNew(config), "");

    String writeOptionStr = config.getString("writeConcern", config.getString("write_concern", ""));
    try
    {
        this.writeOption = WriteOption.valueOf(writeOptionStr);
    }
    catch(IllegalArgumentException e)
    {
        if(writeOptionStr.equals("") == false)
            log.error("Unknown mongodb write concern " + writeOptionStr);
        this.writeOption = WriteOption.UNACKNOWLEDGED;
    }
  }

  private JsonObject convertOldConfToNew(JsonObject conf)
  {
    conf.put("host", conf.getString("host", "localhost"));
    conf.put("port", conf.getInteger("port", 27017));
    conf.put("db_name", conf.getString("db_name", "default_db"));
    conf.put("authSource", conf.getString("db_auth", "default_db"));
    conf.put("readPreference", conf.getString("read_preference", "primary"));
    conf.put("minPoolSize", conf.getInteger("pool_size", 10));
    conf.put("maxPoolSize", conf.getInteger("pool_size", 10));
    conf.put("socketTimeoutMS", conf.getInteger("socket_timeout", 60000));
    conf.put("ssl", conf.getBoolean("use_ssl", false));
    conf.put("hosts", conf.getJsonArray("seeds"));
    System.out.println("MONGO CONF >>> " + conf);
    return conf;
  }

  @Override
  public void finalize() {
    if (this.client != null) {
      this.client.close();
    }
  }

  // ============================================ IMPLEM ============================================

  public void save(String collection, JsonObject document, Handler<String> success)
  {
    this.save(collection, document, success, DEFAULT_ERROR_HANDLER);
  }
  public void save(String collection, JsonObject document, Handler<String> success, Handler<Throwable> error)
  {
    this.save(collection, document, this.writeOption, success, error);
  }
  public void save(String collection, JsonObject document, WriteOption writeOption, Handler<String> success, Handler<Throwable> error)
  {
    if (collection == null || document == null)
    {
        error.handle(new NullPointerException());
        return;
    }

    this.client.saveWithOptions(collection, document, writeOption, new Handler<AsyncResult<String>>()
    {
        @Override
        public void handle(AsyncResult<String> result)
        {
            if(result.succeeded() == true)
                success.handle(result.result());
            else
                error.handle(result.cause());
        }
    });
  }

  public void insert(String collection, JsonObject document, Handler<String> success)
  {
    this.insert(collection, document, success, DEFAULT_ERROR_HANDLER);
  }
  public void insert(String collection, JsonObject document, Handler<String> success, Handler<Throwable> error)
  {
    if (collection == null || document == null)
    {
        error.handle(new NullPointerException());
        return;
    }

    WriteOption wOption = WriteOption.FSYNCED; // Write option was forced in old persistor too
    this.client.insertWithOptions(collection, document, wOption, new Handler<AsyncResult<String>>()
    {
      @Override
      public void handle(AsyncResult<String> res)
      {
        if(res.succeeded() == true)
          success.handle(res.result());
        else
          error.handle(res.cause());
      }
    });
  }
  public void insert(String collection, JsonArray documents, Handler<List<String>> success)
  {
    this.insert(collection, documents, success, DEFAULT_ERROR_HANDLER);
  }
  public void insert(String collection, JsonArray documents, Handler<List<String>> success, Handler<Throwable> error)
  {
    if (collection == null || documents == null)
    {
        error.handle(new NullPointerException());
        return;
    }
    else if(documents.size() == 0)
    {
      success.handle(new ArrayList<String>());
    }

    AtomicInteger nbInserts = new AtomicInteger(documents.size());
    List<String> insertIds = new ArrayList<String>(documents.size());
    for(int i = documents.size(); i-- > 0;)
    {
      insertIds.add(null);
      try
      {
        final int ix = i;
        this.insert(collection, documents.getJsonObject(i), new Handler<String>()
        {
          @Override
          public void handle(String id)
          {
            insertIds.set(ix, id);
            if(nbInserts.decrementAndGet() == 0)
              success.handle(insertIds);
          }
        }, error);
      } catch(Exception e)
      {
        log.error("insert multiple into " + collection + " exception: " + e.getMessage());
        if(nbInserts.decrementAndGet() == 0)
          success.handle(insertIds);
      }
    }
  }

  public void update(String collection, JsonObject query, JsonObject update, boolean multi, boolean upsert, Handler<Long> success)
  {
      this.update(collection, query, update, multi, upsert, success, DEFAULT_ERROR_HANDLER);
  }
  public void update(String collection, JsonObject query, JsonObject update, boolean multi, boolean upsert, Handler<Long> success, Handler<Throwable> error)
  {
    this.update(collection, query, update, multi, upsert, this.writeOption, success, error);
  }
  public void update(String collection, JsonObject query, JsonObject update, boolean multi, boolean upsert, WriteOption writeOption,
                      Handler<Long> success, Handler<Throwable> error)
  {
    if (collection == null || query == null || update == null)
    {
        error.handle(new NullPointerException());
        return;
    }

    UpdateOptions options = new UpdateOptions().setMulti(multi).setUpsert(upsert).setWriteOption(writeOption).setReturningNewDocument(true);
    this.client.updateCollectionWithOptions(collection, query, update, options, new Handler<AsyncResult<MongoClientUpdateResult>>()
    {
        @Override
        public void handle(AsyncResult<MongoClientUpdateResult> result)
        {
            if(result.succeeded() == true)
            {
              MongoClientUpdateResult res = result.result();
              if(res == null) // Happens sometimes smh
                success.handle(null);
              else
                success.handle(new Long(result.result().getDocModified()));
            }
            else
                error.handle(result.cause());
        }
    });
  }

  public void bulk(String collection, JsonArray commands, Handler<JsonObject> handler, Handler<Throwable> error)
  {
    this.bulk(collection, commands, this.writeOption, handler, error);
  }
  public void bulk(String collection, JsonArray commands, WriteOption writeOption, Handler<JsonObject> handler, Handler<Throwable> error)
  {
    if (collection == null || commands == null) {
      error.handle(new NullPointerException());
      return;
    }
    else if(commands.size() < 1)
    {
      error.handle(new IllegalArgumentException());
      return;
    }

    List bulks = new ArrayList<BulkOperation>();
    for(int i = 0; i < commands.size(); ++i)
    {
      JsonObject command = commands.getJsonObject(i);
      if(command == null)
        continue;

      String commandName = command.getString("operation");
      JsonObject document = command.getJsonObject("documents");
      JsonObject query = command.getJsonObject("criteria");

      switch(commandName)
      {
        case "insert":
          if(document != null)
            bulks.add(BulkOperation.createInsert(document));
          break;
        case "update":
          if(document != null && query != null)
            bulks.add(BulkOperation.createUpdate(query, document, false, true));
          break;
        case "updateOne":
          if(document != null && query != null)
            bulks.add(BulkOperation.createUpdate(query, document, false, false));
          break;
        case "upsert":
          if(document != null && query != null)
            bulks.add(BulkOperation.createUpdate(query, document, true, true));
          break;
        case "upsertOne":
          if(document != null && query != null)
            bulks.add(BulkOperation.createUpdate(query, document, true, false));
          break;
        case "remove":
          if(query != null)
            bulks.add(BulkOperation.createDelete(query).setMulti(true));
          break;
          case "removeOne":
            if(query != null)
              bulks.add(BulkOperation.createDelete(query).setMulti(false));
            break;
      }
    }

    if(bulks.size() == 0)
    {
      error.handle(new IllegalArgumentException());
      return;
    }

    BulkWriteOptions options = new BulkWriteOptions().setOrdered(true).setWriteOption(writeOption);
    this.client.bulkWriteWithOptions(collection, bulks, options, new Handler<AsyncResult<MongoClientBulkWriteResult>>()
    {
      @Override
      public void handle(AsyncResult<MongoClientBulkWriteResult> res)
      {
        if(res.succeeded() == true)
        {
          MongoClientBulkWriteResult bulkRes = res.result();
          JsonObject report = new JsonObject()
                                  .put("inserted", bulkRes.getInsertedCount())
                                  .put("matched", bulkRes.getMatchedCount())
                                  .put("modified", bulkRes.getModifiedCount())
                                  .put("removed", bulkRes.getDeletedCount());
          handler.handle(report);
        }
        else
          error.handle(res.cause());
      }
    });
  }

  public void find(String collection, JsonObject query, Handler<List<JsonObject>> allHandler)
  {
    this.find(collection, query, null, allHandler, DEFAULT_ERROR_HANDLER);
  }
  public void find(String collection, JsonObject query, Handler<List<JsonObject>> allHandler, Handler<Throwable> error)
  {
    this.find(collection, query, null, allHandler, error);
  }
  public void find(String collection, JsonObject query, Handler<JsonObject> documentHandler, Handler<List<JsonObject>> allHandler, Handler<Throwable> error)
  {
    this.find(collection, query, null, null, -1, 0, null, 100, documentHandler, allHandler, error);
  }
  public void find(String collection, JsonObject query, JsonObject fields, JsonObject sort,
                      Handler<JsonObject> documentHandler, Handler<List<JsonObject>> allHandler, Handler<Throwable> error)
  {
    this.find(collection, query, fields, sort, -1, 0, null, 100, documentHandler, allHandler, error);
  }
  public void find(String collection, JsonObject query, JsonObject fields, JsonObject sort, int limit, int skip, String hint, int batchSize,
                        Handler<JsonObject> documentHandler, Handler<List<JsonObject>> allHandler, Handler<Throwable> error)
  {
    if (collection == null)
    {
        error.handle(new NullPointerException());
        return;
    }

    FindOptions options = new FindOptions()
                            .setBatchSize(batchSize)
                            .setFields(fields)
                            //.setHint(hint) // Will be available later
                            .setLimit(limit)
                            .setSkip(skip)
                            .setSort(sort);

    List<JsonObject> results = new ArrayList<JsonObject>();
    this.client.findBatchWithOptions(collection, query, options).exceptionHandler(error).handler(new Handler<JsonObject>()
    {
        @Override
        public void handle(JsonObject o)
        {
            if(documentHandler != null)
                documentHandler.handle(o);
            if(allHandler != null)
                results.add(o);
        }
    }).endHandler(new Handler<Void>()
    {
        @Override
        public void handle(Void v)
        {
            if(allHandler != null)
                allHandler.handle(results);
        }
    });
  }

  public void findOne(String collection, JsonObject query, Handler<JsonObject> documentHandler)
  {
    this.findOne(collection, query, documentHandler, DEFAULT_ERROR_HANDLER);
  }
  public void findOne(String collection, JsonObject query, Handler<JsonObject> documentHandler, Handler<Throwable> error)
  {
    this.findOne(collection, query, null, null, documentHandler, error);
  }
  public void findOne(String collection, JsonObject query, JsonObject fields, Handler<JsonObject> documentHandler)
  {
    this.findOne(collection, query, fields, documentHandler, DEFAULT_ERROR_HANDLER);
  }
  public void findOne(String collection, JsonObject query, JsonObject fields, Handler<JsonObject> documentHandler, Handler<Throwable> error)
  {
    this.findOne(collection, query, fields, null, documentHandler, error);
  }
  public void findOne(String collection, JsonObject query, JsonObject fields, JsonArray joins, Handler<JsonObject> documentHandler)
  {
    this.findOne(collection, query, fields, joins, documentHandler, DEFAULT_ERROR_HANDLER);
  }
  public void findOne(String collection, JsonObject query, JsonObject fields, JsonArray joins, Handler<JsonObject> documentHandler, Handler<Throwable> error)
  {
    this.find(collection, query, fields, null, 1, 0, null, 1, new Handler<JsonObject>()
    {
      @Override
      public void handle(JsonObject doc)
      {
        if(joins != null && joins.size() > 0)
        {
          AtomicInteger nbJoins = new AtomicInteger(joins.size());
          for(int i = joins.size(); i-- > 0;)
          {
            try {
            String joinKey = joins.getString(i);

            if(joinKey != null)
            {
              JsonObject joinRef = doc.getJsonObject(joinKey);

              if(joinRef != null)
              {
                String joinCollection = joinRef.getString("$ref");
                String joinId = joinRef.getString("$id");

                if(joinCollection != null && joinId != null)
                {
                  findOne(joinCollection, new JsonObject().put("_id", joinId), null, null, new Handler<JsonObject>()
                  {
                    @Override
                    public void handle(JsonObject joinDoc)
                    {
                      doc.put(joinKey, joinDoc);
                      if(nbJoins.decrementAndGet() == 0)
                        documentHandler.handle(doc);
                    }
                  }, error);
                }
                else if(nbJoins.decrementAndGet() == 0)
                  documentHandler.handle(doc);
              }
              else if(nbJoins.decrementAndGet() == 0)
                documentHandler.handle(doc);
            }
            else if(nbJoins.decrementAndGet() == 0)
              documentHandler.handle(doc);
          } catch(Exception e)
          {
            log.error("findOne join on collection " + collection + " exception: " + e.getMessage());
            if(nbJoins.decrementAndGet() == 0)
              documentHandler.handle(doc);
          }
          }
        }
        else
          documentHandler.handle(doc);
      }
    }, null, error);
  }

  public void findAndModify(String collection, JsonObject query, JsonObject update, JsonObject fields, JsonObject sort, boolean remove, boolean returnNew, boolean upsert,
                                Handler<List<JsonObject>> handler, Handler<Throwable> error)
  {
    if(returnNew == false || remove == true)
    {
      this.find(collection, query, fields, sort, null, new Handler<List<JsonObject>>()
      {
        @Override
        public void handle(List<JsonObject> documents)
        {
          if(remove == true)
            delete(collection, query, new Handler<Long>()
            {
              @Override
              public void handle(Long nbDeleted)
              {
                handler.handle(documents);
              }
            }, error);
          else
            update(collection, query, update, true, upsert, new Handler<Long>()
            {
              @Override
              public void handle(Long s)
              {
                handler.handle(documents);
              }
            }, error);
        }
      }, error);
    }
    else if(remove == true)
    {
      this.delete(collection, query, new Handler<Long>()
      {
        @Override
        public void handle(Long nbDeleted)
        {
          find(collection, query, fields, sort, null, handler, error);
        }
      }, error);
    }
    else
    {
      this.update(collection, query, update, true, upsert, new Handler<Long>()
      {
        @Override
        public void handle(Long s)
        {
          find(collection, query, fields, sort, null, handler, error);
        }
      }, error);
    }
  }

  public void count(String collection, JsonObject query, Handler<Long> handler)
  {
    this.count(collection, query, handler, DEFAULT_ERROR_HANDLER);
  }
  public void count(String collection, JsonObject query, Handler<Long> handler, Handler<Throwable> error)
  {
    if (collection == null)
    {
        error.handle(new NullPointerException());
        return;
    }
    if(query == null)
      query = new JsonObject();

    this.client.count(collection, query, new Handler<AsyncResult<Long>>()
    {
      @Override
      public void handle(AsyncResult<Long> res)
      {
        if(res.succeeded() == true)
          handler.handle(res.result());
        else
          error.handle(res.cause());
      }
    });
  }

  public void distinct(String collection, String fieldName, JsonObject query, Class returnType, Handler<JsonArray> handler)
  {
    this.distinct(collection, fieldName, query, returnType, handler, DEFAULT_ERROR_HANDLER);
  }
  public void distinct(String collection, String fieldName, JsonObject query, Class returnType, Handler<JsonArray> handler, Handler<Throwable> error)
  {
    if (collection == null || fieldName == null)
    {
        error.handle(new NullPointerException());
        return;
    }
    if(query == null)
      query = new JsonObject();

    this.client.distinctWithQuery(collection, fieldName, returnType.getName(), query, new Handler<AsyncResult<JsonArray>>()
    {
      @Override
      public void handle(AsyncResult<JsonArray> res)
      {
        if(res.succeeded() == true)
          handler.handle(res.result());
        else
          error.handle(res.cause());
      }
    });
  }

  public void delete(String collection, JsonObject query, Handler<Long> handler)
  {
    this.delete(collection, query, handler, DEFAULT_ERROR_HANDLER);
  }
  public void delete(String collection, JsonObject query, Handler<Long> handler, Handler<Throwable> error)
  {
    this.delete(collection, query, this.writeOption, handler, error);
  }
  public void delete(String collection, JsonObject query, WriteOption writeOption, Handler<Long> handler, Handler<Throwable> error)
  {
    if (collection == null || query == null)
    {
        error.handle(new NullPointerException());
        return;
    }

    this.client.removeDocumentsWithOptions(collection, query, writeOption, new Handler<AsyncResult<MongoClientDeleteResult>>()
    {
      @Override
      public void handle(AsyncResult<MongoClientDeleteResult> res)
      {
        if(res.succeeded() == true)
          handler.handle(new Long(res.result().getRemovedCount()));
        else
          error.handle(res.cause());
      }
    });
  }

  public void getCollections(Handler<List<String>> handler)
  {
    this.getCollections(handler, DEFAULT_ERROR_HANDLER);
  }
  public void getCollections(Handler<List<String>> handler, Handler<Throwable> error)
  {
    this.client.getCollections(new Handler<AsyncResult<List<String>>>()
    {
      @Override
      public void handle(AsyncResult<List<String>> res)
      {
        if(res.succeeded() == true)
          handler.handle(res.result());
        else
          error.handle(res.cause());
      }
    });
  }

  public void dropCollection(String collection, Handler<Void> handler)
  {
    this.dropCollection(collection, handler, DEFAULT_ERROR_HANDLER);
  }
  public void dropCollection(String collection, Handler<Void> handler, Handler<Throwable> error)
  {
    this.client.dropCollection(collection, new Handler<AsyncResult<Void>>()
    {
      @Override
      public void handle(AsyncResult<Void> res)
      {
        if(res.succeeded() == true)
          handler.handle(null);
        else
          error.handle(res.cause());
      }
    });
  }

  public void getCollectionStats(String collection, Handler<JsonObject> handler)
  {
    this.getCollectionStats(collection, handler, DEFAULT_ERROR_HANDLER);
  }
  public void getCollectionStats(String collection, Handler<JsonObject> handler, Handler<Throwable> error)
  {
    this.getCollectionStats(collection, 1, handler, error);
  }
  public void getCollectionStats(String collection, int scale, Handler<JsonObject> handler)
  {
    this.getCollectionStats(collection, handler, DEFAULT_ERROR_HANDLER);
  }
  public void getCollectionStats(String collection, int scale, Handler<JsonObject> handler, Handler<Throwable> error)
  {
    if (collection == null)
    {
        error.handle(new NullPointerException());
        return;
    }

    this.client.runCommand("collStats", new JsonObject().put("collStats", collection).put("scale", scale), new Handler<AsyncResult<JsonObject>>()
    {
      @Override
      public void handle(AsyncResult<JsonObject> res)
      {
        if(res.succeeded() == true)
          handler.handle(res.result());
        else
          error.handle(res.cause());
      }
    });
  }

  public void aggregation(String collection, JsonArray pipeline, Handler<JsonObject> documentHandler, Handler<List<JsonObject>> allHandler)
  {
    this.aggregation(collection, pipeline, documentHandler, allHandler, DEFAULT_ERROR_HANDLER);
  }
  public void aggregation(String collection, JsonArray pipeline,
                              Handler<JsonObject> documentHandler, Handler<List<JsonObject>> allHandler, Handler<Throwable> error)
  {
    if (collection == null || pipeline == null)
    {
        error.handle(new NullPointerException());
        return;
    }
    if(pipeline.size() == 0)
    {
      error.handle(new IllegalArgumentException());
      return;
    }

    List<JsonObject> results = new ArrayList<JsonObject>();
    this.client.aggregateWithOptions(collection, pipeline, new AggregateOptions()).exceptionHandler(error).handler(new Handler<JsonObject>()
    {
      @Override
      public void handle(JsonObject o)
      {
        if(documentHandler != null)
          documentHandler.handle(o);
        if(allHandler != null)
          results.add(o);
      }
    }).endHandler(new Handler<Void>()
    {
      @Override
      public void handle(Void v)
      {
        if(allHandler != null)
          allHandler.handle(results);
      }
    });
  }

  public void runCommand(String commandName, JsonObject command, Handler<JsonObject> handler)
  {
    this.runCommand(commandName, command, handler, DEFAULT_ERROR_HANDLER);
  }
  public void runCommand(String commandName, JsonObject command, Handler<JsonObject> handler, Handler<Throwable> error)
  {
    if (commandName == null || command == null)
    {
      error.handle(new NullPointerException());
      return;
    }

    this.client.runCommand(commandName, command, new Handler<AsyncResult<JsonObject>>()
    {
      @Override
      public void handle(AsyncResult<JsonObject> res)
      {
        if(res.succeeded() == true)
          handler.handle(res.result());
        else
          error.handle(res.cause());
      }
    });
  }
}

