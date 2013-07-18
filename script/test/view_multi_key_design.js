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

couchTests.view_multi_key_design = function(debug) {
  var db = new CouchDB("test_suite_db", {"X-Couch-Full-Commit":"false"});
  db.deleteDb();
  db.createDb();
  if (debug) debugger;

  var docs = makeDocs(0, 100);
  db.bulkSave(docs);

  var designDoc = {
    _id:"_design/test",
    language: "javascript",
    views: {
      all_docs: {
        map: "function(doc) { emit(doc.integer, doc.string) }"
      },
      multi_emit: {
        map: "function(doc) {for(var i = 0 ; i < 3 ; i++) { emit(i, doc.integer) ; } }"
      },
      summate: {
        map:"function (doc) {emit(doc.integer, doc.integer)};",
        reduce:"function (keys, values) { return sum(values); };"
      }
    }
  };
  T(db.save(designDoc).ok);

  // Test that missing keys work too
  var keys = [101,30,15,37,50];
  var reduce = db.view("test/summate",{group:true},keys).rows;
  TEquals(keys.length-1, reduce.length) // 101 is missing
  for(var i=0; i<reduce.length; i++) {
    T(keys.indexOf(reduce[i].key) != -1);
    TEquals(reduce[i].value, reduce[i].key)
  }

  // First, the goods:
  var keys = [10,15,30,37,50];
  var rows = db.view("test/all_docs",{},keys).rows;
  for(var i=0; i<rows.length; i++) {
    T(keys.indexOf(rows[i].key) != -1);
    TEquals(Number(rows[i].value), rows[i].key)
  }

  // with GET keys
  rows = db.view("test/all_docs",{keys:keys},null).rows;
  for(var i=0;i<rows.length; i++) {
    T(keys.indexOf(rows[i].key) != -1);
    TEquals(Number(rows[i].value), rows[i].key)
  }

  // with empty keys
  rows = db.view("test/all_docs",{keys:[]},null).rows;
  TEquals(0, rows.length)

  var reduce = db.view("test/summate",{group:true},keys).rows;
  TEquals(keys.length, reduce.length)
  for(var i=0; i<reduce.length; i++) {
    T(keys.indexOf(reduce[i].key) != -1);
    TEquals(reduce[i].value, reduce[i].key)
  }

  // with GET keys
  reduce = db.view("test/summate",{group:true,keys:keys},null).rows;
  TEquals(keys.length, reduce.length)
  for(var i=0; i<reduce.length; i++) {
    T(keys.indexOf(reduce[i].key) != -1);
    TEquals(reduce[i].value, reduce[i].key)
  }

  // Test that invalid parameter combinations get rejected
  var badargs = [{startkey:0}, {endkey:0}, {key: 0}, {group_level: 2}];
  var getbadargs = [{startkey:0, keys:keys}, {endkey:0, keys:keys}, 
      {key:0, keys:keys}, {group_level: 2, keys:keys}];
  for(var i in badargs)
  {
      try {
          db.view("test/all_docs",badargs[i],keys);
          T(0==1);
      } catch (e) {
          TEquals("query_parse_error", e.error)
      }

      try {
          db.view("test/all_docs",getbadargs[i],null);
          T(0==1);
      } catch (e) {
          T(e.error = "query_parse_error");
      }
  }

  try {
      db.view("test/summate",{},keys);
      T(0==1);
  } catch (e) {
      TEquals("query_parse_error", e.error)
  }

  try {
      db.view("test/summate",{keys:keys},null);
      T(0==1);
  } catch (e) {
      TEquals("query_parse_error", e.error)
  }

  // Test that a map & reduce containing func support keys when reduce=false
  var resp = db.view("test/summate", {reduce: false}, keys);
  TEquals(5, resp.rows.length)

  resp = db.view("test/summate", {reduce: false, keys: keys}, null);
  TEquals(5, resp.rows.length)

  // Check that limiting by startkey_docid and endkey_docid get applied
  // as expected.
  var curr = db.view("test/multi_emit", {startkey_docid: 21, endkey_docid: 23}, [0, 2]).rows;
  var exp_key = [ 0,  0,  0,  2,  2,  2] ;
  var exp_val = [21, 22, 23, 21, 22, 23] ;
  TEquals(6, curr.length)
  for( var i = 0 ; i < 6 ; i++)
  {
      TEquals(exp_key[i], curr[i].key)
      TEquals(exp_val[i], curr[i].value)
  }

  curr = db.view("test/multi_emit", {startkey_docid: 21, endkey_docid: 23, keys: [0, 2]}, null).rows;
  TEquals(6, curr.length)
  for( var i = 0 ; i < 6 ; i++)
  {
      TEquals(exp_key[i], curr[i].key)
      TEquals(exp_val[i], curr[i].value)
  }

  // Check limit works
  curr = db.view("test/all_docs", {limit: 1}, keys).rows;
  TEquals(1, curr.length)
  TEquals(10, curr[0].key)

  curr = db.view("test/all_docs", {limit: 1, keys: keys}, null).rows;
  TEquals(1, curr.length)
  TEquals(10, curr[0].key)

  // Check offset works
  curr = db.view("test/multi_emit", {skip: 1}, [0]).rows;
  TEquals(99, curr.length)
  TEquals(1, curr[0].value)

  curr = db.view("test/multi_emit", {skip: 1, keys: [0]}, null).rows;
  TEquals(99, curr.length)
  TEquals(1, curr[0].value)

  // Check that dir works
  curr = db.view("test/multi_emit", {descending: "true"}, [1]).rows;
  TEquals(100, curr.length)
  TEquals(99, curr[0].value)
  TEquals(0, curr[99].value)

  curr = db.view("test/multi_emit", {descending: "true", keys: [1]}, null).rows;
  TEquals(100, curr.length)
  TEquals(99, curr[0].value)
  TEquals(0, curr[99].value)

  // Check a couple combinations
  curr = db.view("test/multi_emit", {descending: "true", skip: 3, limit: 2}, [2]).rows;
  T(curr.length, 2);
  TEquals(96, curr[0].value)
  TEquals(95, curr[1].value)

  curr = db.view("test/multi_emit", {descending: "true", skip: 3, limit: 2, keys: [2]}, null).rows;
  T(curr.length, 2);
  TEquals(96, curr[0].value)
  TEquals(95, curr[1].value)

  curr = db.view("test/multi_emit", {skip: 2, limit: 3, startkey_docid: "13"}, [0]).rows;
  TEquals(3, curr.length)
  TEquals(15, curr[0].value)
  TEquals(16, curr[1].value)
  TEquals(17, curr[2].value)

  curr = db.view("test/multi_emit", {skip: 2, limit: 3, startkey_docid: "13", keys: [0]}, null).rows;
  TEquals(3, curr.length)
  TEquals(15, curr[0].value)
  TEquals(16, curr[1].value)
  TEquals(17, curr[2].value)

  curr = db.view("test/multi_emit",
          {skip: 1, limit: 5, startkey_docid: "25", endkey_docid: "27"}, [1]).rows;
  TEquals(2, curr.length)
  TEquals(26, curr[0].value)
  TEquals(27, curr[1].value)

  curr = db.view("test/multi_emit",
          {skip: 1, limit: 5, startkey_docid: "25", endkey_docid: "27", keys: [1]}, null).rows;
  TEquals(2, curr.length)
  TEquals(26, curr[0].value)
  TEquals(27, curr[1].value)

  curr = db.view("test/multi_emit",
          {skip: 1, limit: 5, startkey_docid: "28", endkey_docid: "26", descending: "true"}, [1]).rows;
  TEquals(2, curr.length)
  TEquals(27, curr[0].value)
  TEquals(26, curr[1].value)

  curr = db.view("test/multi_emit",
          {skip: 1, limit: 5, startkey_docid: "28", endkey_docid: "26", descending: "true", keys: [1]}, null).rows;
  TEquals(2, curr.length)
  TEquals(27, curr[0].value)
  TEquals(26, curr[1].value)
};
