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

couchTests.view_pagination = function(debug) {
    var db = new CouchDB("test_suite_db", {"X-Couch-Full-Commit":"false"});
    db.deleteDb();
    db.createDb();
    if (debug) debugger;

    var docs = makeDocs(0, 100);
    db.bulkSave(docs);

    var queryFun = function(doc) { emit(doc.integer, null); };
    var i;

    // page through the view ascending
    for (i = 0; i < docs.length; i += 10) {
      var queryResults = db.query(queryFun, null, {
        startkey: i,
        startkey_docid: i,
        limit: 10
      });
      TEquals(10, queryResults.rows.length)
      TEquals(docs.length, queryResults.total_rows)
      TEquals(i, queryResults.offset)
      var j;
      for (j = 0; j < 10;j++) {
        TEquals(i + j, queryResults.rows[j].key)
      }

      // test aliases start_key and start_key_doc_id
      queryResults = db.query(queryFun, null, {
        start_key: i,
        start_key_doc_id: i,
        limit: 10
      });
      TEquals(10, queryResults.rows.length)
      TEquals(docs.length, queryResults.total_rows)
      TEquals(i, queryResults.offset)
      for (j = 0; j < 10;j++) {
        TEquals(i + j, queryResults.rows[j].key)
      }
    }

    // page through the view descending
    for (i = docs.length - 1; i >= 0; i -= 10) {
      var queryResults = db.query(queryFun, null, {
        startkey: i,
        startkey_docid: i,
        descending: true,
        limit: 10
      });
      TEquals(10, queryResults.rows.length)
      TEquals(docs.length, queryResults.total_rows)
      TEquals(docs.length - i - 1, queryResults.offset)
      var j;
      for (j = 0; j < 10; j++) {
        TEquals(i - j, queryResults.rows[j].key)
      }
    }

    // ignore decending=false. CouchDB should just ignore that.
    for (i = 0; i < docs.length; i += 10) {
      var queryResults = db.query(queryFun, null, {
        startkey: i,
        startkey_docid: i,
        descending: false,
        limit: 10
      });
      TEquals(10, queryResults.rows.length)
      TEquals(docs.length, queryResults.total_rows)
      TEquals(i, queryResults.offset)
      var j;
      for (j = 0; j < 10;j++) {
        TEquals(i + j, queryResults.rows[j].key)
      }
    }

    function testEndkeyDocId(queryResults) {
      TEquals(35, queryResults.rows.length)
      TEquals(docs.length, queryResults.total_rows)
      TEquals(1, queryResults.offset)
      TEquals("1", queryResults.rows[0].id)
      TEquals("10", queryResults.rows[1].id)
      TEquals("11", queryResults.rows[2].id)
      TEquals("12", queryResults.rows[3].id)
      TEquals("13", queryResults.rows[4].id)
      TEquals("14", queryResults.rows[5].id)
      TEquals("15", queryResults.rows[6].id)
      TEquals("16", queryResults.rows[7].id)
      TEquals("17", queryResults.rows[8].id)
      TEquals("18", queryResults.rows[9].id)
      TEquals("19", queryResults.rows[10].id)
      TEquals("2", queryResults.rows[11].id)
      TEquals("20", queryResults.rows[12].id)
      TEquals("21", queryResults.rows[13].id)
      TEquals("22", queryResults.rows[14].id)
      TEquals("23", queryResults.rows[15].id)
      TEquals("24", queryResults.rows[16].id)
      TEquals("25", queryResults.rows[17].id)
      TEquals("26", queryResults.rows[18].id)
      TEquals("27", queryResults.rows[19].id)
      TEquals("28", queryResults.rows[20].id)
      TEquals("29", queryResults.rows[21].id)
      TEquals("3", queryResults.rows[22].id)
      TEquals("30", queryResults.rows[23].id)
      TEquals("31", queryResults.rows[24].id)
      TEquals("32", queryResults.rows[25].id)
      TEquals("33", queryResults.rows[26].id)
      TEquals("34", queryResults.rows[27].id)
      TEquals("35", queryResults.rows[28].id)
      TEquals("36", queryResults.rows[29].id)
      TEquals("37", queryResults.rows[30].id)
      TEquals("38", queryResults.rows[31].id)
      TEquals("39", queryResults.rows[32].id)
      TEquals("4", queryResults.rows[33].id)
      TEquals("40", queryResults.rows[34].id)
    }

    // test endkey_docid
    var queryResults = db.query(function(doc) { emit(null, null); }, null, {
      startkey: null,
      startkey_docid: 1,
      endkey: null,
      endkey_docid: 40
    });
    testEndkeyDocId(queryResults);

    // test aliases end_key_doc_id and end_key
    queryResults = db.query(function(doc) { emit(null, null); }, null, {
      start_key: null,
      start_key_doc_id: 1,
      end_key: null,
      end_key_doc_id: 40
    });
    testEndkeyDocId(queryResults);

  };
