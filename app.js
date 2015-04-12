var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var https = require("https");
var util = require('util');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var methodOverride = require('method-override');
var serveStatic = require('serve-static');
var request = require('request');
var url_parser = require('url');
var lol_secret = "RIOT_API_KEY";
var Push = require("parse-push");
var STAT_TYPE = "Unranked"

//Create new push instance
var push = new Push({
  applicationId: "PARSE_APP_ID",
  restApiKey:    "PARSE_REST_API_KEY"
});

var app = express();
// configure Express
app.configure(function() {
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

app.get('/gloat', function(req, res) {
  console.log("sending gloat for ");
  var username = req.query.username;
  //https://na.api.pvp.net/api/lol/na/v1.4/summoner/by-name/7hesaint?api_key=
  https.get({
        host: 'na.api.pvp.net',
        path: '/api/lol/na/v1.4/summoner/by-name/' + username + "?api_key=" + lol_secret
    }, function(response) {
        // Continuously update stream with data
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {

            // Data reception is done, do whatever with it!
            var summonerInfo = JSON.parse(body);
            var summonerID = summonerInfo[req.query.username].id;
            console.log('Got summoner id: ' + summonerID);
            getSummonerStats(username, summonerID);
        });
    });
  res.status(200).send("Success");
  res.end();
});

app.listen(3002, function () {
  console.log('Server listening on', 3002);
});

function getSummonerStats(username, summonerID) {
  //https://na.api.pvp.net/api/lol/na/v1.3/stats/by-summoner/40171411/summary?season=SEASON2015&api_key=
  https.get({
        host: 'na.api.pvp.net',
        path: '/api/lol/na/v1.3/stats/by-summoner/' + summonerID + "/summary?season=SEASON2015&api_key=" + lol_secret
    }, function(response) {
        // Continuously update stream with data
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {
            console.log("Got summoner stats!");
            // Data reception is done, do whatever with it!
            var userStats = JSON.parse(body);
            sendPushNotification(username, userStats);
        });
  });
}

function sendPushNotification(username, userStats) {
  var wins = undefined;
  for(var i = 0; i < userStats.playerStatSummaries.length; i++) {
    if(userStats.playerStatSummaries[i].playerStatSummaryType == STAT_TYPE) {
      wins = userStats.playerStatSummaries[i].wins;
    }
  }

  if(wins !== undefined) {
    //Now send to some channels
    push.sendToChannels(["LoL"], 
      {
        "alert": "I have " + wins + " wins! Tap to gloat back.",
        "title": username + " is gloating!"
      }, 
      function(error, data){
        if (error) {
          console.error("Oh no it went wrong!: " + error.message);
        } else {
          console.log("Push Notification Sent! ", data);
        }
    });
  } else {
    console.log("could not get wins. :(");
  }
  
}
