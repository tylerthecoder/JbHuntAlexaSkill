'use strict';
const fs = require("fs")
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});
const http = require('http');
var qs = require('querystring');
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */


// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to JB Hunt';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Welcome to JB Hunt';
    const shouldEndSession = false;

    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for your suppor';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function filterByLocation (intent, session, callback){
    const loc = intent.slots.location.value.toLocaleLowerCase();
    const dir = intent.slots.direction.value;
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = "";
    getAllShipments(function (data) {
        let d = JSON.parse(data);
        //create the thing language to give them
        let res = [];
        for (let shipment of d.shipments){
            if (dir == "going to") {
                if (shipment.End.toLocaleLowerCase() == loc) {
                    res.push(shipment)
                }
            }else if (dir == "coming from") {
                if (shipment.Location.toLocaleLowerCase() == loc) {
                    res.push(shipment)
                }
            }
        }
        
        if (res.length == 0) {
            speechOutput = "No jobs " + dir + " " + loc + ". ";
        }else {
            speechOutput = "I found " + res.length + " recomended jobs " + dir + " " + loc + ". "
            for (let i = 0; i<3;i++){
                if (res[i])
                    speechOutput += "Job " + (parseInt(i)+1) + ". Going from " + res[i].Location + " to " + res[i].End + ". ";
            }
            sessionAttributes["jobs"] = res.splice(0,3);
            // sessionAttributes["state"] = "askingForJobs";
        }
        callback(sessionAttributes,buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    })
}

function getAllShipments (cb) {
    http.get('http://aa360-dashapp.mdizpnncq5.us-east-1.elasticbeanstalk.com/all', (resp) => {
      let data = '';
      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });
     
      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        console.log(data);
        cb(data)
      });
     
    }).on("error", (err) => {
      //console.log("Error: " + err.message);
    });
}

function handleJob(intent, session, callback) {
    const repromptText = null;
    const sessionAttributes = session.attributes;
    let shouldEndSession = false;
    let speechOutput = "";
    const jobNumber = (+intent.slots.whichJob.value)-1
    const action = intent.slots.action.value
     if (session.attributes) {
        if (session.attributes.jobs) {
            if (session.attributes.jobs[jobNumber] !== undefined) {
                let job = session.attributes.jobs[jobNumber]
                if (action == "book") {
                    speechOutput += "Booking Job " + (+jobNumber+1) + ". To " + job["End"] + ". ";
                    job.status = "booked"
                }else if(action == "watch") {
                    speechOutput += "Adding to watchlist job " + (+jobNumber+1) + ". To " + job["End"] + ". ";
                    job.status = "watching"
                }
                acceptJobRequest(function (data) {
                    callback(sessionAttributes,buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
                },job)
            }
        }else {
            callback(sessionAttributes,buildSpeechletResponse(intent.name, "Couldn't find that job", repromptText, shouldEndSession));
        }
    } else {
        callback(sessionAttributes,buildSpeechletResponse(intent.name, "Bad 1", repromptText, shouldEndSession));
    }
}

function acceptJobRequest (cb,data) {
    let query = qs.stringify(data)
    http.get('http://aa360-dashapp.mdizpnncq5.us-east-1.elasticbeanstalk.com/accept?' + query, (resp) => {
      let data = '';
      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });
     
      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        cb(data)
      });
     
    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });
}


function viewAcceptedJobs(intent, session, callback) {
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = "";
    getStatusFile(function (data) {
        let d = JSON.parse(data);
        let booked = [];
        let watch = []
        for (let i in d.ships) {
            let ship = d.ships[i];
            if (ship.status == "booked") {
                booked.push(ship)
            }else if (ship.status == "watching") {
                watch.push(ship)
            }
        }
        speechOutput += "You have " + booked.length + " Jobs Booked. "
        for (let ship of booked) {
            speechOutput += ship.Location + " To " + ship.End + ". ";
        }
        speechOutput += "You have " + watch.length + " on your watch list. ";
        for (let ship of watch) {
            speechOutput += ship.Location + " To " + ship.End + ". ";
        }
        callback(sessionAttributes,buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    })
}

function moreInfo (intent, session, callback) {
    const repromptText = null;
    const sessionAttributes = session.attributes;
    let shouldEndSession = false;
    let speechOutput = "";
    const jobNumber = (+intent.slots.job.value)-1
    if (session.attributes && session.attributes.jobs) {
        if (session.attributes.jobs[jobNumber] !== undefined) {
            let job = session.attributes.jobs[jobNumber];
            speechOutput = "Job" + (+jobNumber)+1 + ". "
            speechOutput += "Departing from " + job.Location + " on " + job.Depart + ". "
            speechOutput += "Ariving to " + job.End + " on " + job.Arrive + ". "
            speechOutput += job.Money + " dollars per mile. "
            callback(sessionAttributes,buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
        }else {
            callback(sessionAttributes,buildSpeechletResponse(intent.name, "That job doesn't exsist", repromptText, shouldEndSession));
        }
    } else {
        callback(sessionAttributes,buildSpeechletResponse(intent.name, "You haven't asked about any jobs", repromptText, shouldEndSession));
    }
    
}

function listAllJobs (intent, session, callback) {
    const repromptText = null;
    const sessionAttributes = session.attributes;
    let shouldEndSession = false;
    let speechOutput = "";
    if (session.attributes && session.attributes.jobs) {
        let jobs = session.attributes.jobs;
        for (let i in jobs) {
            let job = jobs[i]
            speechOutput += "Job " + (+i+1) + ". Going from " + job.Location + " to " + job.End + ". ";
        }
        callback(sessionAttributes,buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    } else {
        callback(sessionAttributes,buildSpeechletResponse(intent.name, "You haven't asked about any jobs", repromptText, shouldEndSession));
    }
}

function readMyData(intent, session, callback) {
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = "";
    const listType = intent.slots.list.value
    getStatusFile(function (data) {
        let d = JSON.parse(data);
        let booked = [];
        let watch = [];
        let rec = [];
        for (let i in d.ships) {
            let ship = d.ships[i];
            if (ship.status == "booked") {
                booked.push(ship)
            }else if (ship.status == "watching") {
                watch.push(ship)
            }else if(ship.status == "recomended") {
                rec.push(ship)
            }
        }
        
        if (listType == "book") {
            speechOutput += "You have " + booked.length + " Jobs Booked. "
            for (let ship of booked) {
                speechOutput += ship.Location + " To " + ship.End + ". ";
            }
        }else if (listType == "watch") {
            speechOutput += "You have " + watch.length + " on your watch list. ";
            for (let ship of watch) {
                speechOutput += ship.Location + " To " + ship.End + ". ";
            }
        }
        callback(sessionAttributes,buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    })
}

function getStatusFile(cb) {
    http.get('http://aa360-dashapp.mdizpnncq5.us-east-1.elasticbeanstalk.com/test' , (resp) => {
      let data = '';
      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });
     
      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        cb(data)
      });
     
    }).on("error", (err) => {
      console.log("Error: " + err.message);
    }); 
}

function gasPrice(intent, session, callback) {
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    const loc = intent.slots.location.value
    let speechletOutput = "";
    fs.readFile("gas.json", "utf8", function (err,data) {
        let json = JSON.parse(data)
       // callback(sessionAttributes,buildSpeechletResponse(intent.name, JSON.stringify(json), repromptText, shouldEndSession));
       let bestGasPrice = 100;
       let flag = false;
        for (let gas of json.stations) {
            if (gas.loc == loc && gas.price < bestGasPrice) {
                bestGasPrice = gas.price;
                flag = true
            }
        }
        if (flag) {
            speechletOutput = "The cheapest gas in " + loc + " is " + bestGasPrice + " dollars";
        }else {
            speechletOutput = "There is no gas data in " + loc + ". "
        }
        
        callback(sessionAttributes,buildSpeechletResponse(intent.name, speechletOutput, repromptText, shouldEndSession));
    })
        //callback(sessionAttributes,buildSpeechletResponse(intent.name, "tyler", repromptText, shouldEndSession));
}


// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName == "lookUpShipments") {
        lookUpShipments(intent,session,callback)
    }else if (intentName == "handleJob") {
        handleJob(intent,session,callback)
    }else if (intentName == "readMyData") {
        readMyData(intent,session,callback)    
    }else if (intentName == "listAllJobs") {
        listAllJobs(intent,session,callback)    
    }else if (intentName == "gasPrice") {
        gasPrice(intent,session,callback)    
    }else if (intentName == "moreInfo") {
        moreInfo(intent,session,callback)    
    }else if (intentName == "getMyStatus"){
        viewAcceptedJobs(intent,session,callback)
    }else if (intentName == "LocationFilter") {
        filterByLocation(intent,session,callback)
    }else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};