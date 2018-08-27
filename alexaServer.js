var express = require("express");
var alexa = require("alexa-app");
var express_app = express();

var app = new alexa.app("sample");

app.intent("number", {
    "slots": { "number": "AMAZON.NUMBER" },
    "utterances": ["say the number {-|number}"]
  },
  function(request, response) {
    var number = request.slot("number");
    response.say("You asked for the number " + number);
  }
);

// setup the alexa app and attach it to express before anything else
app.express({ expressApp: express_app });

// now POST calls to /sample in express will be handled by the app.request() function
// GET calls will not be handled

// from here on, you can setup any other express routes or middleware as normal