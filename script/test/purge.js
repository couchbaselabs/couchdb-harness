// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

couchTests.purge = function(debug) {
  var db = new CouchDB("test_suite_db", {"X-Couch-Full-Commit":"false"});
  db.deleteDb();
  db.createDb();
  if (debug) debugger;

  /*
   purge is not to be confused with a document deletion.  It removes the
   document and all edit history from the local instance of the database.
  */

  var numDocs = 10;

  var designDoc = {
    _id:"_design/test",
    language: "javascript",
    views: {
      all_docs_twice: {map: "function(doc) { emit(doc.integer, null); emit(doc.integer, null) }"},
      single_doc: {map: "function(doc) { if (doc._id == \"1\") { emit(1, null) }}"}
    }
  };

  T(db.save(designDoc).ok);

  db.bulkSave(makeDocs(1, numDocs + 1));

  // go ahead and validate the views before purging
  var rows = db.view("test/all_docs_twice").rows;
  for (var i = 0; i < numDocs; i++) {
    TEquals(i+1, rows[2*i].key)
    TEquals(i+1, rows[(2*i)+1].key)
  }
  TEquals(1, db.view("test/single_doc").total_rows)

  var info = db.info();
  var doc1 = db.open("1");
  var doc2 = db.open("2");

  // purge the documents
  var xhr = CouchDB.request("POST", "/test_suite_db/_purge", {
    body: JSON.stringify({"1":[doc1._rev], "2":[doc2._rev]})
  });
  TEquals(200, xhr.status)

  var result = JSON.parse(xhr.responseText);
  var newInfo = db.info();
  
  // purging increments the update sequence
  TEquals(newInfo.update_seq, info.update_seq+1)
  // and it increments the purge_seq
  TEquals(newInfo.purge_seq, info.purge_seq+1)
  TEquals(newInfo.purge_seq, result.purge_seq)

  TEquals(doc1._rev, result.purged["1"][0])
  TEquals(doc2._rev, result.purged["2"][0])

  TIsnull(db.open("1"))
  TIsnull(db.open("2"))

  var rows = db.view("test/all_docs_twice").rows;
  for (var i = 2; i < numDocs; i++) {
    TEquals(i+1, rows[2*(i-2)].key)
    TEquals(i+1, rows[(2*(i-2))+1].key)
  }
  TEquals(0, db.view("test/single_doc").total_rows)

  // purge sequences are preserved after compaction (COUCHDB-1021)
  T(db.compact().ok);
  TEquals(202, db.last_req.status)
  // compaction isn't instantaneous, loop until done
  while (db.info().compact_running) {};
  var compactInfo = db.info();
  TEquals(newInfo.purge_seq, compactInfo.purge_seq)

  // purge documents twice in a row without loading views
  // (causes full view rebuilds)

  var doc3 = db.open("3");
  var doc4 = db.open("4");

  xhr = CouchDB.request("POST", "/test_suite_db/_purge", {
    body: JSON.stringify({"3":[doc3._rev]})
  });

  TEquals(200, xhr.status)

  xhr = CouchDB.request("POST", "/test_suite_db/_purge", {
    body: JSON.stringify({"4":[doc4._rev]})
  });

  TEquals(200, xhr.status)
  result = JSON.parse(xhr.responseText);
  TEquals(db.info().purge_seq, result.purge_seq)

  var rows = db.view("test/all_docs_twice").rows;
  for (var i = 4; i < numDocs; i++) {
    TEquals(i+1, rows[2*(i-4)].key)
    TEquals(i+1, rows[(2*(i-4))+1].key)
  }
  TEquals(0, db.view("test/single_doc").total_rows)

  // COUCHDB-1065
  var dbA = new CouchDB("test_suite_db_a");
  var dbB = new CouchDB("test_suite_db_b");
  dbA.deleteDb();
  dbA.createDb();
  dbB.deleteDb();
  dbB.createDb();
  var docA = {_id:"test", a:1};
  var docB = {_id:"test", a:2};
  dbA.save(docA);
  dbB.save(docB);
  CouchDB.replicate(dbA.name, dbB.name);
  var xhr = CouchDB.request("POST", "/" + dbB.name + "/_purge", {
    body: JSON.stringify({"test":[docA._rev]})
  });
  TEquals(200, xhr.status, "single rev purge after replication succeeds");

  var xhr = CouchDB.request("GET", "/" + dbB.name + "/test?rev=" + docA._rev);
  TEquals(404, xhr.status, "single rev purge removes revision");

  var xhr = CouchDB.request("POST", "/" + dbB.name + "/_purge", {
    body: JSON.stringify({"test":[docB._rev]})
  });
  TEquals(200, xhr.status, "single rev purge after replication succeeds");
  var xhr = CouchDB.request("GET", "/" + dbB.name + "/test?rev=" + docB._rev);
  TEquals(404, xhr.status, "single rev purge removes revision");

  var xhr = CouchDB.request("POST", "/" + dbB.name + "/_purge", {
    body: JSON.stringify({"test":[docA._rev, docB._rev]})
  });
  TEquals(200, xhr.status, "all rev purge after replication succeeds");
};
