const express = require("express");

const app = express();
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer);
// const socket = io();

// const http = require("http");
// const socketIo = require("socket.io");
//   // Create the HTTP server
// const io = socketIo(httpServer); 

let connections = []
let drawingData = [];
// 4 things added new 
const { jsPDF } = require("jspdf");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");



//mongodb============
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
// const path = require('path');
const User = require('./models/User');
const passport = require("passport");
const session = require("express-session");
// const bodyParser = require("body-parser");
const Drawing = require("./models/Drawing");


require("dotenv").config();
require("./auth/passportConfig");
//==================

//================
mongoose.connect('mongodb+srv://Poonam:Poonam2607@cluster0.5rt2y.mongodb.net/whiteboard', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.log(err));
//=================

//================
app.use(bodyParser.json());
app.use(express.static('public'));  // Serve static files from 'public' folder
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
const pdf = require('html-pdf');
app.use(express.json());
const cors = require('cors');
app.use(cors());

app.post('/export-pdf', (req, res) => {
    const base64Image = req.body.base64Image;  // Get the image data from the request


    if (!base64Image) {
        return res.status(400).json({ message: 'No image data provided.' });
    }

    // Generate PDF logic (example using html-pdf)
    const htmlContent = `<html><body><img src="${base64Image}" /></body></html>`;

    pdf.create(htmlContent).toBuffer((err, buffer) => {
        if (err) {
            console.error('Error generating PDF:', err);
            return res.status(500).json({ message: 'Failed to generate PDF.' });
        }

        // Send the PDF as a response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=whiteboard.pdf');
        res.send(buffer);  // Send PDF buffer
    });
});

// app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
// app.use(passport.initialize());
// app.use(passport.session());
app.get("/logout", (req, res) => {
    req.logout(err => {
      if (err) return res.status(500).send("Error logging out");
      res.redirect("/");
    });
  });
  
  app.get("/dashboard", isAuthenticated, (req, res) => {
    // res.send(`Welcome ${req.user.name}`);
    console.log(`Welcome ${req.user.name}`);
    // res.sendFile(path.join(__dirname, 'public', 'index.html'));
    res.redirect("/"); 
  });
  
  app.get("/auth/google/callback", passport.authenticate("google", {
    failureRedirect: "/login"
}), (req, res) => {
    res.redirect("/");  // Redirect to dashboard on successful login
});
  app.get("/api/current-user", (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ isLoggedIn: true, user: req.user });
        return next(); 
    } else {
        res.json({ isLoggedIn: false });
    }
    res.redirect("/auth/google"); 
});
//================
const canvasRoutes = require('./routes/canvasRoutes');
app.use('/api', canvasRoutes);  // Prefix for API routes

app.post("/save-drawing", isAuthenticated, async (req, res) => {
    const { drawingData } = req.body;
    if (!drawingData) return res.status(400).send("Drawing data is missing.");
  
    try {
      const newDrawing = new Drawing({
        userId: req.user._id,
        drawingData,
      });
      await newDrawing.save();
      req.user.canvases.push(newDrawing._id);
      await req.user.save();
      res.status(200).send("Drawing saved successfully!");
    } catch (err) {
      console.error("Error saving drawing:", err);
      res.status(500).send("Error saving drawing.");
    }
  });
  app.get("/my-drawings", isAuthenticated, async (req, res) => {
    try {
      const drawings = await Drawing.find({ userId: req.user._id });
      res.status(200).json(drawings);
    } catch (err) {
      console.error("Error fetching drawings:", err);
      res.status(500).send("Error fetching drawings.");
    }
  });
  function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/auth/google");
  }
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
    passport.authenticate("google", {
        successRedirect: "/dashboard",
        failureRedirect: "/login",
    })
);

app.get('/set-username', isAuthenticated, (req, res) => {
    if (!req.user.username) {
        res.send(`
            <h1>Set Your Username</h1>
            <form action="/save-username" method="POST">
                <input type="text" name="username" placeholder="Enter a username" required />
                <button type="submit">Save Username</button>
            </form>
        `);
    } else {
        res.redirect('/');
    }
});

app.post('/save-username', isAuthenticated, async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send('Username is required');
    }

    // Update the user's username
    req.user.username = username;
    await req.user.save();
    res.redirect('/');
});





io.on("connect", (socket) =>{
    connections.push(socket);
    console.log(`${socket.id} has conneted`);

    socket.on('draw' , (data)=>{
        connections.forEach(con => { 
            if(con.id !== socket.id){
                con.emit("ondraw" , {x : data.x , y: data.y});
            }
            
        });
    });

    socket.on("save_draw", (data) => {
        drawingData.push(data);
    });


    socket.on('down',(data) =>{
        connections.forEach(con =>{
            if(con.id !== socket.id){
                con.emit("ondown" ,{x:data.x , y: data.y})
            }
        });
    });

    socket.on("disconnect",(reason)=>{
        console.log(`${socket.id} is disconnected`);
        connections = connections.filter((con) =>con.id !== socket.id);

     });
});

app.use(express.static("public")); // Ensure 'public' folder exists
app.use(express.json());

// pdf


app.post("/export-pdf", async (req, res) => {
    try {
        const { base64Image } = req.body;

        if (!base64Image) {
            return res.status(400).send("Base64 image data is missing.");
        }

        // Load the image on the server using canvas
        const img = await loadImage(base64Image);

        // Create a canvas to draw the image
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        // Generate the PDF
        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "px",
            format: [img.width, img.height],
        });

        // Add image to the PDF
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, img.width, img.height);

        // Define the file path where the PDF will be saved
        const pdfFilePath = path.resolve(__dirname, "whiteboard.pdf");

        // Save the PDF file
        fs.writeFileSync(pdfFilePath, pdf.output());

        // Send the PDF back to the client
        res.sendFile(pdfFilePath); // Send absolute path to res.sendFile
    } catch (error) {
        console.error("Error exporting PDF:", error);
        res.status(500).send("Failed to export PDF");
    }
});


const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});


