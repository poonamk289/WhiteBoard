const mongoose = require('mongoose');

// Define the drawing schema
const drawingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link drawing to user
    drawingData: { type: String, required: true }, // Store drawing as base64 string or JSON data
    createdAt: { type: Date, default: Date.now }
});

// Create the Drawing model
const Drawing = mongoose.model('Drawing', drawingSchema);

module.exports = Drawing;
