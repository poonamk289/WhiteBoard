const express = require('express');
const router = express.Router();
const User = require('../models/User');  // Path to User model

// Save canvas image for logged-in user
router.post('/saveCanvas', async (req, res) => {
    const { userId, canvasImage } = req.body;  // Get user ID and base64 image from the request

    if (!userId || !canvasImage) {
        return res.status(400).send("User ID and Canvas Image are required");
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send("User not found");
        }

        // Save the canvas image (base64 string) to the user's "canvases" array
        user.canvases.push(canvasImage);
        await user.save();

        res.status(200).send("Canvas saved successfully");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

// Get canvases of a user
router.get('/getCanvases/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send("User not found");
        }

        res.json(user.canvases);  // Return the array of base64 canvas images
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

module.exports = router;
