'use strict';
var AWS = require('aws-sdk');
var request = require('request');

AWS.config.update({
  region: "us-west-2"
});

var docClient = new AWS.DynamoDB.DocumentClient();
var tableName = "Bronco_Express";
var globalItems;
var globalResponse;

module.exports.getTimes = (event, context, callback) => {

  var params = {
      TableName: "Bronco_Express",
  };
  console.log("Scanning table.");
  docClient.scan(params, onScan);
  callback(null, globalResponse);
};

module.exports.storeTimes = (event, context, callback) => {

  request('https://rqato4w151.execute-api.us-west-1.amazonaws.com/dev/info', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var items = JSON.parse(body);
      for(var i = 0; i < items.length; ++i) {
        putItem(items[i].id, items[i].logo, items[i].lat, items[i].lng, items[i].route);
      }
      const response = {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin" : "*"
        },
        body: JSON.stringify({
          message: 'Bronco Express times succesfully stored to DynamoDB!'
        }),
      };
      callback(null, response);
    }
  })
};

function onScan(err, data) {
    if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        var items = [];
        console.log("Scan succeeded.");
        data.Items.forEach(function(item) {
          console.log(item.id);
          delete item['timeStamp'];
          if(contains(items, item) == 1) {
            for(var i = 0; i < items.length; ++i) {
              if(items[i].id == item.id && items[i].timeStamp < item.timeStamp) {
                items[i] = item;
              }
            }
          } else {
            items.push(item);
          }
        });
        globalItems = items;
        globalResponse = {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin" : "*"
          },
          body: JSON.stringify(globalItems)
        };
    }
}

function contains(items, item) {
  for(var i = 0; i < items.length; ++i) {
    if(items[i].id == item.id) {
      return 1;
    }
  }
}

//add item to DB
function putItem(id, logo, lat, lng, route) {
  var params = {
      TableName:tableName,
      Item: {
      "id": id,
      "timeStamp": Date.now(),
      "logo": logo,
      "lat": lat,
      "lng": lng,
      "route": route
      }
  };
  console.log("Adding a new item...");
  docClient.put(params, function(err, data) {
       if (err) {
           console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
       } else {
           console.log("PutItem succeeded: ", id);
       }
    });
}
