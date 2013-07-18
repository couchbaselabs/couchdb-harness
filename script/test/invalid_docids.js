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

couchTests.invalid_docids = function(debug) {
  var db = new CouchDB("test_suite_db", {"X-Couch-Full-Commit":"false"});
  db.deleteDb();
  db.createDb();
  if (debug) debugger;

  // Test _local explicitly first.
  T(db.save({"_id": "_local/foo"}).ok);
  T(db.open("_local/foo")._id == "_local/foo");

  var urls = [
      "/test_suite_db/_local",
      "/test_suite_db/_local/",
      "/test_suite_db/_local%2F",
      "/test_suite_db/_local/foo/bar",
  ];

  urls.forEach(function(u) {
    var res = db.request("PUT", u, {"body": "{}"});
    TEquals(400, res.status)
    TEquals("bad_request", JSON.parse(res.responseText).error)
  });

  //Test non-string
  try {
    db.save({"_id": 1});
    T(1 == 0, "doc id must be string");
  } catch(e) {
      TEquals(400, db.last_req.status)
      TEquals("bad_request", e.error)
  }

  // Via PUT with _id not in body.
  var res = res = db.request("PUT", "/test_suite_db/_other", {"body": "{}"});
  TEquals(400, res.status)
  TEquals("bad_request", JSON.parse(res.responseText).error)

  // Accidental POST to form handling code.
  res = db.request("POST", "/test_suite_db/_tmp_view", {"body": "{}"});
  TEquals(400, res.status)
  TEquals("bad_request", JSON.parse(res.responseText).error)

  // Test invalid _prefix
  try {
    db.save({"_id": "_invalid"});
    T(1 == 0, "doc id may not start with underscore");
  } catch(e) {
      TEquals(400, db.last_req.status)
      TEquals("bad_request", e.error)
  }

  // Test _bulk_docs explicitly.
  var docs = [{"_id": "_design/foo"}, {"_id": "_local/bar"}];
  db.bulkSave(docs);
  docs.forEach(function(d) {TEquals(d._id, db.open(d._id)._id);});

  docs = [{"_id": "_invalid"}];
  try {
    db.bulkSave(docs);
    T(1 == 0, "doc id may not start with underscore, even in bulk docs");
  } catch(e) {
      TEquals(400, db.last_req.status)
      TEquals("bad_request", e.error)
  }
};
