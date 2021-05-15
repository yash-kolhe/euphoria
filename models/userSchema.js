const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  username: String,
  sid: String,
  score: Number,
});

module.exports = mongoose.model("Um", userSchema);
