const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
  username: { type: String, required: true },
//   password: { type: String, required: true },  // Make sure to hash passwords!
canvases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Drawing' }] // Array to store base64 image strings
});

const User = mongoose.model('User', userSchema);

module.exports = User;
