const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    uid: {
        type: String, // Identifikátor parkovacieho miesta, napr.: "P01-123", ...
        required: true
    },
    name: {
        type: String, 
        required: true
    },
    description: {
        type: String // Popis pozície, ďalšie info, napr.: Janka z HR
    }
});

const pUser = mongoose.model("pUser", userSchema);

module.exports = pUser;