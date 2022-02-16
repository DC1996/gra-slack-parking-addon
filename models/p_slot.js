const mongoose = require("mongoose");

const parkingSlotSchema = new mongoose.Schema({
    name: {
        type: String, // Identifikátor parkovacieho miesta, napr.: "P01-123", ...
        required: true
    },
    desc: {
        type: String, // popis miesta, pre lepšiu identifikáciu, napr.: "Prvé miesto od brány", "Miesto pri stĺpe", ...
    }
});

const pSlot = mongoose.model("pSlot", parkingSlotSchema);

module.exports = pSlot;