// Load the SDK for JavaScript
var AWS = require('aws-sdk');

// Set the region 
AWS.config.update({region: 'us-west-2'});


// Create sendEmail params 
var params = {
  Destination: { /* required */
    CcAddresses: [
      'tylertracy1999@gmail.com',
      /* more items */
    ],
    ToAddresses: [
      'tylertracy1999@gmail.com',
      /* more items */
    ]
  },
  Message: { /* required */
    Body: { /* required */
      Html: {
       Charset: "UTF-8",
       Data: "HTML_FORMAT_BODY"
      },
      Text: {
       Charset: "UTF-8",
       Data: "TEXT_FORMAT_BODY"
      }
     },
     Subject: {
      Charset: 'UTF-8',
      Data: 'Test email'
     }
    },
  Source: 'tylertracy1999@gmail.com', /* required */
  ReplyToAddresses: [
      'tylertracy1999@gmail.com',
    /* more items */
  ],
};       

// Create the promise and SES service object
var sendPromise = new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();