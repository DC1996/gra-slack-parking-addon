// Imports
const { App, ExpressReceiver } = require('@slack/bolt');
const { v4: uuidv4 } = require('uuid');

const mongoose = require("mongoose");

const pSlot = require("./models/p_slot");
const pUser = require("./models/p_user");
const pReservation = require("./models/p_reservation");

/* Connect to MongoDB using Mongoose */
const username = "admin";
const password = "3QvSwtJIWx5dGCWc";
const cluster  = "grparking.ita7c";
const dbname   = "GRParking";

mongoose.connect(
    `mongodb+srv://${username}:${password}@${cluster}.mongodb.net/${dbname}?retryWrites=true&w=majority`, 
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

// Check connection status
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () { console.log("Connected successfully"); });

/* ------------------------------------------------------------------- */

/* Setup express reciever for slack app verification */
const receiver = new ExpressReceiver(
  { signingSecret: process.env.SLACK_SIGNING_SECRET }
);

/* Slack app request url verification */
receiver.router.post('/slack/events', (req, res) => {
  res.status(200).send({"challenge": req.body.challenge});
})
receiver.router.get('/', (req, res) => {
  res.status(200).send({
    "App": "GoodRequest Academy Parking Add-on",
    "Message": "Slack app built with Bolt framework"
  });
})

// Initializes the app with the bot token, signing secret and reciever
const boltApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    receiver: receiver
});

// List all availible parking slots from the database
boltApp.message(/^\$slots$/, async ({ say }) => {
  
  // Get parking slot data from database
  pSlot.find({}, async (error, slots) => {

      if(error) { await say("Couldn't load parking slots."); return; } 

      // Create list of slots
      let listOfSlots = "";
      slots.forEach((slot) => {
        listOfSlots = listOfSlots.concat(slot.name, " -- ", slot.desc, "\n");
      })

      // Logging
      console.log(slots);

      // Send back the list of slots
      await say({text: "Sending free parking slots", blocks: [
        {
          "type": "section", 
          "text": { 
            "type": "mrkdwn", 
            "text": "All parking slots in the database so far:"
          }
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": listOfSlots
          }
        },
      ]});
  });
});

class reservationData {
  constructor() {
    this._date = null;
    this._slot = null;
    this._type = null;
  }

  // Setters
  set date(date) { this._date = date; }
  set slot(slot) { this._slot = slot; }
  set type(type) { this._type = type; }

  // Getters
  get date() { return this._date; }
  get slot() { return this._slot; }
  get type() { return this._type; }

  getData() {
    return {
      "date": this._date
    }
  }
}
let unique_ids = new Map();

boltApp.message(/^\$reserve$/, async({message, say}) => {

  let options = []
  pSlot.find({}, async (error, slots) => {
    
    if(error) { say("Internal server error..."); return; }
  
    console.log("RESULT: ", slots);

    // Load slot options
    slots.forEach((s) => {
      options.push({
        "text": {
          "type": "plain_text",
          "text": s.name
        },
        "value": s.name
      })
    });

    console.log(JSON.stringify(options))

    say({text: "Sending new reservation form", blocks: [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": "New reservation"
        }
      },
      {
        "type": "divider"
      },
      {
        "block_id": uuidv4(), // Generate unique identifier
        "type": "actions",
        "elements": [
          {
            "type": "datepicker",
            "placeholder": {
              "type": "plain_text",
              "text": "Select a date",
              "emoji": true
            },
            "action_id": "new-res-date"
          },
          {
            "type": "static_select",
            "placeholder": {
              "type": "plain_text",
              "text": "Select parking slot",
              "emoji": true
            },
            "options": options,
            "action_id": "new-res-slot"
          },
          {
            "type": "radio_buttons",
            "options": [
              {
                "text": {
                  "type": "plain_text",
                  "text": "Whole day",
                  "emoji": true
                },
                "value": "Whole day"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "Half a day (AM)"
                },
                "value": "Half a day (AM)"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "Half a day (PM)"
                },
                "value": "Half a day (PM)"
              }
            ],
            "action_id": "new-res-type"
          },
          {
            "type": "button",
            "style": "primary",
            "text": {
              "type": "plain_text",
              "text": "Create reservation",
            },
            "value": "create",
            "action_id": "new-res-create"
          },
        ]
      }
    ]
  });

  });

});

// Set reservation date
boltApp.action('new-res-date', async ({ ack, payload }) => {
  // Acknowledge action request
  await ack();
  
  console.log(payload);
  console.log(new Date(payload.selected_date));

  // Get unique reservation id
  let res_id = payload.block_id;

  // Update existing entry in map or create a new entry
  let res = unique_ids.has(res_id) ? unique_ids.get(res_id) : new reservationData();
  // Set date
  res.date = new Date(payload.selected_date);
  // Save entry
  unique_ids.set(res_id, res);
});

// Set reservation slot
boltApp.action('new-res-slot', async ({ ack, payload }) => {
  // Acknowledge action request
  await ack();
  
  console.log(payload);
  console.log(payload.selected_option.value);

  // Get unique reservation id
  let res_id = payload.block_id;

  // Update existing entry in map or create a new entry
  let res = unique_ids.has(res_id) ? unique_ids.get(res_id) : new reservationData();
  // Set slot
  res.slot = payload.selected_option.value;
  // Save entry
  unique_ids.set(res_id, res);
});

// Set reservation type
boltApp.action('new-res-type', async ({ ack, payload }) => {

  // Acknowledge action request
  await ack();

  // Get unique reservation id
  let res_id = payload.block_id;

  // Update existing entry in map or create a new entry
  let res = unique_ids.has(res_id) ? unique_ids.get(res_id) : new reservationData();
  
  res.type = payload.selected_option.value; // Set type
  
  unique_ids.set(res_id, res); // Save entry

});

// Create new reservation
boltApp.action('new-res-create', async ({ ack, payload, body, say }) => {

  // Acknowledge action request
  await ack(); 

  // Extract parameters
  let res_id = payload.block_id;
  let user_id = body.user.id;

  // Unique ID is not in the map
  if( !unique_ids.has(res_id) ) { 
    say("Cannot create reservation, missing input data."); 
    return; 
  }

  // Get entry from map
  let res = unique_ids.get(res_id);

  // Check missing data
  if( !res.date ) { say("Cannot create reservation, missing date."); return; }
  if( !res.slot ) { say("Cannot create reservation, missing slot."); return; }
  if( !res.type ) { say("Cannot create reservation, missing type."); return; }

  // Check requested date
  let today = new Date();
  today.setUTCHours(0,0,0,0);

  if ( res.date < today ) { 
    say("Cannot create reservation, invalid date."); 
    return; 
  }

  // Check invalid reservation requests
  let results = await pReservation
    .find({date: res.date})
    .populate({
      path: "slot",
      match: { name: res.slot }
    })
    .populate('reservedBy');

  // Filter for specific slot
  results = results.filter(function(result) { return result.slot; });
    
  let error = false;
  if( results.length == 2 ) { error = true; }
  results.forEach((result) => {

      // Check reservation type
      if(result.type == res.type || result.type == "All day") 
      { 
        error = true;
        return;
      }
  });

  if( error ) {
    say("Cannot create reservation, slot is already reserved for that date."); 
    return;
  }

  let slot = await pSlot.findOne({name: res.slot });
  let user = await pUser.findOne({uid: user_id });

  if( user == null ) { 
    await say("You must first issue '$add-self [full_name]'");
    return;
  }

  console.log(slot, user)

  // Create new parking slot 
  const newRes = new pReservation({ 
    "date": res.date,
    "slot": slot._id,
    "type": res.type,
    "reservedBy": user.id,
    "reservedAt": new Date()
  });

  // Save created parking slot to database
  try { 
    await newRes.save(); 
    say("A new reservation has been created."); 
  } 
  catch (error) 
  { 
    say("Cannot create reservation, server side error..."); 
  }

});

// Cancel button was pressed for a reservation
boltApp.action('cancel-reservation', async ({ ack, say, payload }) => {
  
  // Acknowledge action request
  await ack();

  // Get reservation id to cancel
  let res_id = payload.value;

  // Perform deletion
  let reservation = await pReservation.findOne({_id: res_id});
  let deletedReservation = await pReservation.deleteOne({_id: res_id });

  // Check deletion status
  if(deletedReservation.deletedCount == 0) {
    await say("Error while canceling the reservation.");
  }
  else {
    let dDate = (
      "*" + reservation.date.getDate() + '/' + ( reservation.date.getMonth() + 1) + '/' + reservation.date.getFullYear() + "*"
    ).toString();
    await say(dDate + ": Reservation was deleted.");
  }

});

boltApp.action('new-res-cancel', async ({ ack, payload, say }) => {
  // Acknowledge action request
  await ack();
  console.log(payload);
});

// Listens to incoming message
boltApp.message(/^\$reservations$/, async ({ say }) => {

  // Calculate date for current date + 5 days
  let startDate = new Date();
  let endDate = new Date().setDate((startDate.getDate()+5))

  // Get reservations
  pReservation.find({ 
    date: { $gt:  startDate, $lt:  endDate } // Between dates <today, today+5)
  })
  .populate('slot')         // Get info about slot
  .populate('reservedBy')   // Get info about user

  .exec(async (error, results) => {

    // Error handling
    if( error ) { say("Internal server error..."); return; }

    let data = [];

    // Add header
    data.push({
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "Quick overview",
        "emoji": true
      }
    });

    // Set current date
    let newDate = new Date();
    newDate.setUTCHours(0,0,0,0);

    // Load data for the next five days
    for( let findDate = newDate; findDate < endDate; findDate.setDate(findDate.getDate()+1) )
    {
      let dDate = (
        "*" + findDate.getDate() + '/' + ( findDate.getMonth() + 1) + '/' + findDate.getFullYear() + "*"
      ).toString();
      let dReservations = ""

      // .filter((res) => res.date == findDate) FIND DATES
      results.filter((res) => +res.date == +findDate).forEach((res) => {
        console.log(res.date, findDate);
        dReservations = dReservations.concat(
          "*"+ res.slot.name +"* - " + res.reservedBy.name + " - " + res.type + "\n"
        );
      });

      // Push data about reservations into blocks data
      data.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": ":date: " + dDate + "\n" + ( dReservations == "" ? "No reservations" : dReservations)
        }
      });
    }

    // Send the data
    await say({
      text: "Sending overview for the next 5 days...",
      blocks:
        JSON.stringify(data)
      });
  });

});

/* 
    Add a new parking slot to the database
    $add-slot [slot_name] [description]

    /^(\$add-slot) ([a-zA-Z0-9_\-]+)( .*)$/
*/
boltApp.message(
  /^(\$add-slot) ([a-zA-Z0-9_\-]+)(.*)$/, 
  async ({context, say}) => {

    // Logging
    console.log("RECIEVED", context.matches[2], context.matches[3].toString().trim());

    // Extract parameters
    const name = context.matches[2];
    const desc = context.matches[3] ? context.matches[3].toString().trim() : "No description.";

    const alreadyExists = await pSlot.findOne({name: name});

    if( alreadyExists ) 
    {
      await say("Parking slot is already in the database."); 
      return;
    }

    // Create new parking slot 
    const slot = new pSlot({ 
      "name": name, 
      "desc": desc 
    });

    // Save created parking slot to database
    try { const newSlot = await slot.save(); say(newSlot.name + " has been created."); } 
    catch (error) { say("Cannot create slot..."); }
});

// Add yourself to the database
boltApp.message(
  /^(\$add-self) (.+)$/,
  async ({context, say, payload}) => {

    console.log(payload.user);

    // Logging
    console.log("Recieved: ", context.matches[2]);

    // Extract parameters
    const user_id = payload.user;
    const name = context.matches[2];

    const alreadyExists = await pUser.findOne({uid: user_id});

    if(alreadyExists) 
    {
      await say("User is already in the database."); 
      return;
    }

    // Create new user in database
    const user = new pUser({ 
      "uid": payload.user,
      "name": name,
      "description": "New user."
    });

    // Save created parking slot to database
    try { const newUser = await user.save(); say("User with name " + newUser.name + " has been created."); } 
    catch (error) { say("Server error..."); }
});

// List reservations for a given user
boltApp.message(/^\$my-reservations$/, async ({ say, payload }) => {

  // Extract user id
  let user_id = payload.user;

  // Add header to data
  let data = []
  data.push({
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "Your reservations",
        "emoji": true
    }
  });

  // Get current date
  let startDate = new Date();
  startDate.setUTCHours(0,0,0,0);

  // Find all reservations starting from this day forward
  pReservation.find({ 
    date: { $gte:  startDate }
  })
  .populate({
    path: 'reservedBy',
    match: { uid: user_id }
  })
  .populate('slot')
  .sort({date: 'ascending'})
  .exec( async (error, results) => {

    // If there was an unexpected error 
    if(error) { say("Internal server error."); return; }

    // Filter reservations by user id  
    results = results.filter(res => res.reservedBy);
    
    // Get reservation data
    results.forEach((res) => {

      let dDate = (
        res.date.getDate() + '/' + ( res.date.getMonth() + 1) + '/' + res.date.getFullYear()
      ).toString();

      // Build view
      data.push(
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": ":date: *" + dDate + "*\n *" + res.slot.name + "* - " + res.reservedBy.name + " - " + res.type + "\n"
          }
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "text": "Cancel",
                "emoji": true
              },
              "style": "danger",
              "value": res._id,
              "action_id": "cancel-reservation"
            }
          ]
        }
      )
    });

    // No reservations
    if(results.length == 0) 
    { 
      data.push(
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "plain_text",
            "text": "No reservations found.",
            "emoji": true
          }
		    }
      )}

    say({
      text: "Sending your reservations...", 
      blocks: data 
    });

  });

});

// Start the application
(async () => {
  boltApp.start(3000);
  console.log('⚡️ Slack parking add-on app is running!');
})();

/* Return format for datepicker block eg. "2022-02-14" */
/* function datepickerFormat() {
  const date = new Date();
  let [month, day, year] = [date.getMonth().toString(), date.getDate(), date.getFullYear().toString()];
  month = (month+1 < 10) ? ("0" + month).toString() : (month+1).toString();
  
  return year.concat('-', month, '-', day);
} */