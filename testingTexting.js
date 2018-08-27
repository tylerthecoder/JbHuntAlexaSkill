// Twilio Credentials
const accountSid = 'AC0347a2278b9492299ef509c3a631aeff';
const authToken = '94eb6e35311b1342da8bf9c3412890a5';

// require the Twilio module and create a REST client
const client = require('twilio')(accountSid, authToken);

client.messages
  .create({
    to: '+14792802640',
    from: '+14798886088 ',
    body: 'Fuck you',
  })
  .then(message => console.log(message.sid));