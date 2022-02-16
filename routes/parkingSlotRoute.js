const express = require("express");
const pSlot = require("../models/p_slot");
const application = express();

// Return all parking slots
function getSlots(request, response) 
{
    pSlot.find({}, (error, slots) => {
        if(error) 
        {
            response.status(500).send("Error");
        }
        else { 
            response.status(200).send(slots);
        }
    });
};

// Reserve a parking slot
async function reserve(request, response) {
    const slot = new pSlot({
        "slotId": 12,
        "date" : new Date
    });

    console.log(request.body);
  
    try 
    {
        const newSlot = await slot.save();
        response.send(newSlot);
    } 
    catch (error) {
        response.status(500).send(error);
    }
};

// Check specific parking slot by Id and Date
application.get("/parkingSlot", async (request, response) => {
    try 
    {
        const slot = await foodModel.find({slotId: request.body.slotId, date: request.body.date });
        response.send(slot);
    } catch (error) {
        response.status(500).send(error);
    }
});

// Remove reservation
application.delete("/parkingSlot", async (request, response) => {
    try {
      const food = await foodModel.deleteOne(request.params.id);
  
      if (!food) response.status(404).send("No item found");
      response.status(200).send();
    } catch (error) {
      response.status(500).send(error);
    }
  });

  exports.getSlots = getSlots;
  exports.reserve = reserve;