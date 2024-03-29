db.documents.createIndex({ "owner" : 1 }, { background: true });
db.documents.createIndex({ name: "text", ownerName: "text", nameSearch:"text" }, { background: true,name:"idx_document_text" });
db.documentsRevisions.createIndex({ name: "text", ownerName: "text" }, { background: true,name:"idx_revision_text" });
db.documents.createIndex({eParent:1},{background: true,name:"idx_eparent"});
db.documents.createIndex({"inheritedShares.userId":1},{background: true,name:"idx_inherited_userid"});
db.documents.createIndex({"inheritedShares.groupId":1},{background: true,name:"idx_inherited_groupid"});
db.events.ensureIndex({ "resource" : 1 });
db.events.ensureIndex({ "event-type" : 1 });
db.events.ensureIndex({ "module" : 1 });
db.events.ensureIndex({ "date" : 1 });
db.events.ensureIndex({ "userId" : 1 });
db.events.ensureIndex({ "profil" : 1 });
db.events.ensureIndex({ "structures" : 1 });
db.events.ensureIndex({ "classes" : 1 });
db.events.ensureIndex({ "groups" : 1 });
db.events.ensureIndex({ "referer" : 1 });
db.events.ensureIndex({ "sessionId" : 1 });
db.documentsRevisions.ensureIndex({ "documentId" : 1 }, { background: true });
