// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License.  You may obtain a copy
// of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
// License for the specific language governing permissions and limitations under
// the License.


couchTests.update_documents = function(debug) {
  var db = new CouchDB("test_suite_db", {"X-Couch-Full-Commit":"false"});
  db.deleteDb();
  db.createDb();
  if (debug) debugger;
      
  var designDoc = {
    _id:"_design/update",
    language: "javascript",
    updates: {
      "hello" : stringFun(function(doc, req) {
        log(doc);
        log(req);
        if (!doc) {
          if (req.id) {
            return [
            // Creates a new document with the PUT docid,
            { _id : req.id,
              reqs : [req] },
            // and returns an HTML response to the client.
            "<p>New World</p>"];
          };
          // 
          return [null, "<p>Empty World</p>"];          
        };
        // we can update the document inline
        doc.world = "hello";
        // we can record aspects of the request or use them in application logic.
        doc.reqs && doc.reqs.push(req);
        doc.edited_by = req.userCtx;
        return [doc, "<p>hello doc</p>"];
      }),
      "in-place" : stringFun(function(doc, req) {
        var field = req.query.field;
        var value = req.query.value;
        var message = "set "+field+" to "+value;
        doc[field] = value;
        return [doc, message];
      }),
      "bump-counter" : stringFun(function(doc, req) {
        if (!doc.counter) doc.counter = 0;
        doc.counter += 1;
        var message = "<h1>bumped it!</h1>";
        return [doc, message];
      }),
      "error" : stringFun(function(doc, req) {
        superFail.badCrash;
      }),
      "xml" : stringFun(function(doc, req) {
        var xml = new XML('<xml></xml>');
        xml.title = doc.title;
        var posted_xml = new XML(req.body);
        doc.via_xml = posted_xml.foo.toString();
        var resp =  {
          "headers" : {
            "Content-Type" : "application/xml"
          },
          "body" : xml.toXMLString()
        };
         
         return [doc, resp];
       }),
       "get-uuid" : stringFun(function(doc, req) {
         return [null, req.uuid];
       }),
       "code-n-bump" : stringFun(function(doc,req) {
         if (!doc.counter) doc.counter = 0;
         doc.counter += 1;
         var message = "<h1>bumped it!</h1>";
         resp = {"code": 302, "body": message}
         return [doc, resp];
       }),
       "resp-code" : stringFun(function(doc,req) {
         resp = {"code": 302}
         return [null, resp];
       }),
       "resp-code-and-json" : stringFun(function(doc,req) {
         resp = {"code": 302, "json": {"ok": true}}
         return [{"_id": req["uuid"]}, resp];
       }),
       "binary" : stringFun(function(doc, req) {
         var resp = {
           "headers" : {
             "Content-Type" : "application/octet-stream"
           },
           "base64" : "aGVsbG8gd29ybGQh" // "hello world!" encoded
         };
         return [doc, resp];
       }),
      "empty" : stringFun(function(doc, req) {
        return [{}, 'oops'];
      })
    }
  };
  T(db.save(designDoc).ok);
  
  var doc = {"word":"plankton", "name":"Rusty"}
  var resp = db.save(doc);
  T(resp.ok);
  var docid = resp.id;

  // update error
  var xhr = CouchDB.request("POST", "/test_suite_db/_design/update/_update/");
  T(xhr.status == 404, 'Should be missing');
  TEquals("Invalid path.", JSON.parse(xhr.responseText).reason)
  
  // hello update world
  xhr = CouchDB.request("PUT", "/test_suite_db/_design/update/_update/hello/"+docid);
  TEquals(201, xhr.status)
  TEquals("<p>hello doc</p>", xhr.responseText)
  T(/charset=utf-8/.test(xhr.getResponseHeader("Content-Type")));
  T(equals(docid, xhr.getResponseHeader("X-Couch-Id")));

  doc = db.open(docid);
  TEquals("hello", doc.world)

  // Fix for COUCHDB-379
  T(equals(xhr.getResponseHeader("Server").substr(0,7), "CouchDB"));

  // hello update world (no docid)
  xhr = CouchDB.request("POST", "/test_suite_db/_design/update/_update/hello");
  TEquals(200, xhr.status)
  TEquals("<p>Empty World</p>", xhr.responseText)

  // no GET allowed
  xhr = CouchDB.request("GET", "/test_suite_db/_design/update/_update/hello");
  // TEquals(405, xhr.status) // TODO allow qs to throw error code as well as error message
  TEquals("method_not_allowed", JSON.parse(xhr.responseText).error)

  // // hello update world (non-existing docid)
  xhr = CouchDB.request("GET", "/test_suite_db/nonExistingDoc");
  TEquals(404, xhr.status)
  xhr = CouchDB.request("PUT", "/test_suite_db/_design/update/_update/hello/nonExistingDoc");
  TEquals(201, xhr.status)
  TEquals("<p>New World</p>", xhr.responseText)
  xhr = CouchDB.request("GET", "/test_suite_db/nonExistingDoc");
  TEquals(200, xhr.status)

  // in place update 
  xhr = CouchDB.request("PUT", "/test_suite_db/_design/update/_update/in-place/"+docid+'?field=title&value=test');
  TEquals(201, xhr.status)
  TEquals("set title to test", xhr.responseText)
  doc = db.open(docid);
  TEquals("test", doc.title)
  
  // bump counter
  xhr = CouchDB.request("PUT", "/test_suite_db/_design/update/_update/bump-counter/"+docid, {
    headers : {"X-Couch-Full-Commit":"true"}
  });
  TEquals(201, xhr.status)
  TEquals("<h1>bumped it!</h1>", xhr.responseText)
  doc = db.open(docid);
  TEquals(1, doc.counter)
  
  // _update honors full commit if you need it to
  xhr = CouchDB.request("PUT", "/test_suite_db/_design/update/_update/bump-counter/"+docid, {
    headers : {"X-Couch-Full-Commit":"true"}
  });
  
  var NewRev = xhr.getResponseHeader("X-Couch-Update-NewRev");
  doc = db.open(docid);
  TEquals(NewRev, doc['_rev'])
  
  
  TEquals(2, doc.counter)

  // parse xml
  xhr = CouchDB.request("PUT", "/test_suite_db/_design/update/_update/xml/"+docid, {
    headers : {"X-Couch-Full-Commit":"true"},
    "body" : '<xml><foo>bar</foo></xml>'
  });
  TEquals(201, xhr.status)
  TEquals("<xml>\n  <title>test</title>\n</xml>", xhr.responseText)
  
  doc = db.open(docid);
  TEquals("bar", doc.via_xml)
  
  // Server provides UUID when POSTing without an ID in the URL
  xhr = CouchDB.request("POST", "/test_suite_db/_design/update/_update/get-uuid/");
  TEquals(200, xhr.status)
  TEquals(32, xhr.responseText.length)

  // COUCHDB-1229 - allow slashes in doc ids for update handlers
  // /db/_design/doc/_update/handler/doc/id

  var doc = {
      _id:"with/slash",
      counter:1
  };
  db.save(doc);
  xhr = CouchDB.request("PUT", "/test_suite_db/_design/update/_update/bump-counter/with/slash");
  TEquals(201, xhr.status, "should return a 200 status");
  TEquals("<h1>bumped it!</h1>", xhr.responseText, "should report bumping");

  var doc = db.open("with/slash");
  TEquals(2, doc.counter, "counter should be 2");

  // COUCHDB-648 - the code in the JSON response should be honored

  xhr = CouchDB.request("PUT", "/test_suite_db/_design/update/_update/code-n-bump/"+docid, {
    headers : {"X-Couch-Full-Commit":"true"}
  });
  TEquals(302, xhr.status)
  TEquals("<h1>bumped it!</h1>", xhr.responseText)
  doc = db.open(docid);
  TEquals(3, doc.counter)

  xhr = CouchDB.request("POST", "/test_suite_db/_design/update/_update/resp-code/");
  TEquals(302, xhr.status)

  xhr = CouchDB.request("POST", "/test_suite_db/_design/update/_update/resp-code-and-json/");
  TEquals(302, xhr.status);
  T(JSON.parse(xhr.responseText).ok);

  // base64 response
  xhr = CouchDB.request("PUT", "/test_suite_db/_design/update/_update/binary/"+docid, {
    headers : {"X-Couch-Full-Commit":"false"},
    body    : 'rubbish'
  });
  TEquals(201, xhr.status)
  TEquals("hello world!", xhr.responseText)
  T(/application\/octet-stream/.test(xhr.getResponseHeader("Content-Type")));

  // Insert doc with empty id
  xhr = CouchDB.request("PUT", "/test_suite_db/_design/update/_update/empty/foo");
  TEquals(400, xhr.status);
  TEquals("Document id must not be empty", JSON.parse(xhr.responseText).reason);

};
