

var express = require('express');
var router = express.Router();

var arangojs = require("arangojs");
var db = new arangojs.Database();
const aql = arangojs.aql;

db.useDatabase("_system");
db.useBasicAuth("root", "0000");

var http = require('http');
var options = {
  hostname: 'localhost',
  port: '12345'
};

function storeEntity(bodies) {
  for(const body of bodies) {
    db.query(aql`
    INSERT ${body} INTO 'entityColl'
    RETURN NEW
  `).then(function (cursor) {
      // console.log(cursor._result);
      storeProperty(cursor._result);
    })
  }
}

function storeEdge(body, key, entityID) {
  if(body[key].type == "Relationship") {

    body[key].id = key;
    body[key]._from = entityID;
    let objectID = body[key].object;
    // console.log(body[key]);
    db.query(aql`
      FOR doc IN entityColl
        FILTER doc.id == ${objectID}
      RETURN doc._id
     `).then(function (cursor) {
      body[key]._to = cursor._result[0];
      console.log(body[key]);
      let rel = body[key];
      db.query(aql`
        INSERT ${rel} INTO 'entityEdge'
       `).then(function (cursor) {

      })
      // console.log('id'+cursor._result);
      // let properties = cursor._result;
      // storeProperty(properties);
    })
  }
}

function storeProperty(bodies) {
  for(const body of bodies) {

    for (const key of Object.keys(body)) {
      // console.log(body);

      let entityID = body._id;

      //store edge
      storeEdge(body, key, entityID);

      if (body[key].type == "Property") {
        body[key].id = key;
        // console.log(entityID);
        db.query(aql`
          INSERT ${body[key]} INTO 'propertyColl'
          let property = NEW
          
          INSERT { _from: ${entityID}, _to: NEW._id } INTO 'propertyEdge'
          
          RETURN property
        `).then(function (cursor) {
          let properties = cursor._result;
          storeProperty(properties);
        })
      }

    }
  }
}

// when get a json-ld data
function handleResponse(res) {
  let body = [];
  res.on('data', function (chunk) {
    body += chunk;
  });
  res.on('end', function () {
    body = JSON.parse(body);

    storeEntity(body);

  })
}

http.request(options, function (res) {
  handleResponse(res);
}).end();



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });

  //console.log(cursor[Symbol.toStringTag]._result);

});


module.exports = router;
