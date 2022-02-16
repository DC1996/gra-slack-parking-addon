const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
    // Dátum rezervácie
    date: {
        type: Date,
        required: true
    },
    // Parkovacie miesto, ktoré je rezervované
    slot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "pSlot",
        required: true
    },
    // Typ rezervácie Celý deň, pól dňa (AM/PM)
    type: {
        type: String,
        required: true
    },
    // Id používateľa, ktorý previedol rezerváciu
    reservedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "pUser",
        required: true
    },
    // Čas prevedenia rezervácie
    reservedAt: {   
        type: Date,
        required: true
    }
});

const pReservation = mongoose.model("pReservation", reservationSchema);

module.exports = pReservation;