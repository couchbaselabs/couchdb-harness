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

couchTests.view_multi_key_all_docs = function(debug) {
  var db = new CouchDB("test_suite_db", {"X-Couch-Full-Commit":"false"});
  db.deleteDb();
  db.createDb();
  if (debug) debugger;

  var docs = makeDocs(0, 100);
  db.bulkSave(docs);

  var keys = ["10","15","30","37","50"];
  var rows = db.allDocs({},keys).rows;
  TEquals(keys.length, rows.length)
  for(var i=0; i<rows.length; i++)
    TEquals(keys[i], rows[i].id)

  // keys in GET parameters
  rows = db.allDocs({keys:keys}, null).rows;
  TEquals(keys.length, rows.length)
  for(var i=0; i<rows.length; i++)
    TEquals(keys[i], rows[i].id)

  rows = db.allDocs({limit: 1}, keys).rows;
  TEquals(1, rows.length)
  TEquals(keys[0], rows[0].id)

  // keys in GET parameters
  rows = db.allDocs({limit: 1, keys: keys}, null).rows;
  TEquals(1, rows.length)
  TEquals(keys[0], rows[0].id)

  rows = db.allDocs({skip: 2}, keys).rows;
  TEquals(3, rows.length)
  for(var i=0; i<rows.length; i++)
      TEquals(keys[i+2], rows[i].id)

  // keys in GET parameters
  rows = db.allDocs({skip: 2, keys: keys}, null).rows;
  TEquals(3, rows.length)
  for(var i=0; i<rows.length; i++)
      TEquals(keys[i+2], rows[i].id)

  rows = db.allDocs({descending: "true"}, keys).rows;
  TEquals(keys.length, rows.length)
  for(var i=0; i<rows.length; i++)
      TEquals(keys[keys.length-i-1], rows[i].id)

  // keys in GET parameters
  rows = db.allDocs({descending: "true", keys: keys}, null).rows;
  TEquals(keys.length, rows.length)
  for(var i=0; i<rows.length; i++)
      TEquals(keys[keys.length-i-1], rows[i].id)

  rows = db.allDocs({descending: "true", skip: 3, limit:1}, keys).rows;
  TEquals(1, rows.length)
  TEquals(keys[1], rows[0].id)

  // keys in GET parameters
  rows = db.allDocs({descending: "true", skip: 3, limit:1, keys: keys}, null).rows;
  TEquals(1, rows.length)
  TEquals(keys[1], rows[0].id)

  // Check we get invalid rows when the key doesn't exist
  rows = db.allDocs({}, [1, "i_dont_exist", "0"]).rows;
  TEquals(3, rows.length)
  TEquals("not_found", rows[0].error)
  T(!rows[0].id);
  TEquals("not_found", rows[1].error)
  T(!rows[1].id);
  TEquals("0", rows[2].id == rows[2].key && rows[2].key)

  // keys in GET parameters
  rows = db.allDocs({keys: [1, "i_dont_exist", "0"]}, null).rows;
  TEquals(3, rows.length)
  TEquals("not_found", rows[0].error)
  T(!rows[0].id);
  TEquals("not_found", rows[1].error)
  T(!rows[1].id);
  T(rows[2].id == rows[2].key && rows[2].key == "0");

  // empty keys
  rows = db.allDocs({keys: []}, null).rows;
  TEquals(0, rows.length)
};
