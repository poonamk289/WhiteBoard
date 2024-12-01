
// Connect to the Node.js server
const socket = io.connect("http://localhost:8000");

// Initialize the Fabric.js canvas
const canvas = new fabric.Canvas("canvas");
const canvasContainer = document.getElementById("canvas-container");
canvas.setWidth(canvasContainer.offsetWidth);
canvas.setHeight(canvasContainer.offsetHeight);

// Check login state (dummy check; replace with server-side session check)
fetch("/api/current-user")
.then((res) => res.json())
.then((user) => {
    if (user && user.isLoggedIn) {
        // console.log(user);
        document.getElementById("loginButton").style.display = "none";
        document.getElementById("logoutButton").style.display = "inline-block";
    } else {
        document.getElementById("loginButton").style.display = "inline-block";
        document.getElementById("logoutButton").style.display = "none";
    }
    if (user.isLoggedIn) {
        document.getElementById('welcome-message').innerText = `Welcome, ${user.user.name}!`;
    } else {
        document.getElementById('welcome-message').innerText = 'You are not logged in.';
    }
})
.catch((err) => console.error("Failed to fetch user info:", err));

////////////////////////////////////////////////////////////////////////
document.getElementById("saveDrawing").addEventListener("click", async () => {
    const drawingData = canvas.toDataURL("image/png");
    const response = await fetch("/save-drawing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ drawingData }),
    });
    if (response.ok) alert("Drawing saved successfully!");
    else alert("Error saving drawing.");
  });
  
  document.getElementById("loadDrawings").addEventListener("click", async () => {
    const response = await fetch("/my-drawings");
    if (response.ok) {
      const drawings = await response.json();
      const drawingsList = document.getElementById("drawingsList");
      drawingsList.innerHTML = "";
      drawings.forEach((drawing) => {
        const img = document.createElement("img");
        img.src = drawing.drawingData;
        img.style.width = "200px";
        img.style.margin = "10px";
        drawingsList.appendChild(img);
      });
    } else alert("Error fetching drawings.");
  });
  








// Tool selection logic
let currentTool = "pen"; // Default tool
let isDrawing = false;
let shape;

const pencilBrush = new fabric.PencilBrush(canvas);
pencilBrush.color = "black";
pencilBrush.width = 2;
canvas.freeDrawingBrush = pencilBrush;
canvas.isDrawingMode = true; 

// Tool buttons
document.getElementById("penTool").addEventListener("click", () => {currentTool = "pen"
    canvas.isDrawingMode = true;
});
document.getElementById("rectTool").addEventListener("click", () => currentTool = "rect");
document.getElementById("circleTool").addEventListener("click", () => currentTool = "circle");
document.getElementById("lineTool").addEventListener("click", () => currentTool = "line");
document.getElementById("clearCanvas").addEventListener("click", () => {
    canvas.clear();
    socket.emit("clearCanvas");
});


document.getElementById('exportImage').addEventListener('click', () => {
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'whiteboard.png';
        link.href = dataURL;
        link.click();
    });
document.getElementById("exportPDF").addEventListener("click", async () => {
    const canvas = document.getElementById("canvas");

    // Convert canvas to Base64 image
    const base64Image = canvas.toDataURL("image/png");

    try {
        // Send the image to the server via POST request
        const response = await fetch("/export-pdf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ base64Image }), // Send as JSON
        });

        if (response.ok) {
            // Trigger download of the PDF
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "whiteboard.pdf";
            a.click();
        } else {
            alert("Failed to export PDF");
        }
    } catch (error) {
        console.error("Error exporting PDF:", error);
    }
});
// Emit shape data to the server
const emitShape = (shape) => {
    const shapeData = shape.toObject();
    socket.emit("addShape", shapeData);
};

// Listen for shapes from the server
socket.on("addShape", (shapeData) => {
    fabric.util.enlivenObjects([shapeData], (objects) => {
        objects.forEach((obj) => canvas.add(obj));
    });
});

// Clear canvas when another user clears it
socket.on("clearCanvas", () => {
    canvas.clear();
});

// Mouse events for drawing shapes
canvas.on("mouse:down", (event) => {
    const pointer = canvas.getPointer(event.e);
    if (currentTool === "pen") {
        isDrawing = true;
        // Start a new path for freehand drawing
        shape = new fabric.Path('', {
            fill: null,
            stroke: 'blue',
            strokeWidth: 2,
            selectable: false // Do not select pen drawings
        });
        shape.path.push(['M', pointer.x, pointer.y]); // Move to start point
        canvas.add(shape);
        canvas.renderAll(); 
        // isDrawing = true;
        console.log("pen initialise",shape);
    } else if (currentTool === "rect") {
        canvas.isDrawingMode = false;
        shape = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: "rgba(0, 0, 0, 0)", // Hollow rectangle
            stroke: "blue",
            strokeWidth: 2,
        });
        canvas.add(shape);
        isDrawing = true;
    } else if (currentTool === "circle") {
        shape = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 0,
            fill: "rgba(0, 0, 0, 0)",
            stroke: "green",
            strokeWidth: 2,
        });
        canvas.add(shape);
        isDrawing = true;
    } else if (currentTool === "line") {
        shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: "black",
            strokeWidth: 2,
        });
        canvas.add(shape);
        isDrawing = true;
    }
});

canvas.on("mouse:move", (event) => {
    if (!isDrawing) return;

    const pointer = canvas.getPointer(event.e);
    if (currentTool === "pen") {
        shape.path.push(['L', pointer.x, pointer.y]); // Add a line segment
        canvas.renderAll();
        console.log("Path updated:", shape.path);
    } else if (currentTool === "rect") {
        shape.set({
            width: Math.abs(pointer.x - shape.left),
            height: Math.abs(pointer.y - shape.top),
            left: pointer.x < shape.left ? pointer.x : shape.left,
            top: pointer.y < shape.top ? pointer.y : shape.top,
        });
       
    } else if (currentTool === "circle") {
        const radius = Math.sqrt(
            Math.pow(pointer.x - shape.left, 2) + Math.pow(pointer.y - shape.top, 2)
        );
        shape.set({ radius });
    } else if (currentTool === "line") {
        shape.set({ x2: pointer.x, y2: pointer.y });
    }
   
    canvas.renderAll();
    
    
});

canvas.on("mouse:up", () =>{

    if (isDrawing)emitShape(shape);
    //     {
    //     if (currentTool === "pen") {
    //         // Finalize the freehand drawing
    //         shape.path.push(['L', shape.path[0][1], shape.path[0][2]]); // Optional: Close the path
    //     }
        
        console.log(shape);
    // }
    isDrawing = false;
    shape=null;
   
});



// // Initialize Fabric.js canvas
// const canvas = new fabric.Canvas('canvas');
// const io = io.connect("http://localhost:8080");
// // Set canvas size
// canvas.setWidth(window.innerWidth);
// canvas.setHeight(window.innerHeight);

// let currentTool = 'pen'; // Default tool
// let isDrawing = false;
// let shape; // Current shape being drawn

// // Add event listeners for tools
// document.getElementById('penTool').addEventListener('click', () => currentTool = 'pen');
// document.getElementById('rectTool').addEventListener('click', () => currentTool = 'rect');
// document.getElementById('circleTool').addEventListener('click', () => currentTool = 'circle');
// document.getElementById('lineTool').addEventListener('click', () => currentTool = 'line');

// // Handle mouse events on the canvas
// canvas.on('mouse:down', (event) => {
//     const pointer = canvas.getPointer(event.e);

//     if (currentTool === 'rect') {
//         shape = new fabric.Rect({
//             left: pointer.x,
//             top: pointer.y,
//             width: 0,
//             height: 0,
//             fill: 'rgba(0, 0, 255, 0.5)',
//             stroke: 'blue',
//             strokeWidth: 2,
//             selectable: false,
//         });
//         canvas.add(shape);
//         isDrawing = true;
//     } else if (currentTool === 'circle') {
//         shape = new fabric.Circle({
//             left: pointer.x,
//             top: pointer.y,
//             radius: 0,
//             fill: 'rgba(0, 255, 0, 0.5)',
//             stroke: 'green',
//             strokeWidth: 2,
//             selectable: false,
//         });
//         canvas.add(shape);
//         isDrawing = true;
//     } else if (currentTool === 'line') {
//         shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//             stroke: 'black',
//             strokeWidth: 2,
//             selectable: false,
//         });
//         canvas.add(shape);
//         isDrawing = true;
//     }
// });

// canvas.on('mouse:move', (event) => {
//     if (!isDrawing) return;
//     const pointer = canvas.getPointer(event.e);

//     if (currentTool === 'rect') {
//         shape.set({
//             width: Math.abs(pointer.x - shape.left),
//             height: Math.abs(pointer.y - shape.top),
//         });
//     } else if (currentTool === 'circle') {
//         const radius = Math.sqrt(
//             Math.pow(pointer.x - shape.left, 2) + Math.pow(pointer.y - shape.top, 2)
//         );
//         shape.set({ radius });
//     } else if (currentTool === 'line') {
//         shape.set({ x2: pointer.x, y2: pointer.y });
//     }

//     canvas.renderAll();
// });

// canvas.on('mouse:up', () => {
//     if (currentTool === 'rect') {
//         // Finalize the rectangle by setting it as selectable and static
//         shape.set({ selectable: true });
//         canvas.renderAll();
//     }
//     isDrawing = false;
// });

// //--------------------------------Poonam---------------------------------------

// // let currentTool = "pen";



// // // Add event listeners for tool selection
// // document.getElementById('penTool').addEventListener('click', () => currentTool = "pen");
// // document.getElementById('rectTool').addEventListener('click', () => currentTool = "rect");
// // document.getElementById('circleTool').addEventListener('click', () => currentTool = "circle");
// // document.getElementById('textTool').addEventListener('click', () => currentTool = "text");
// // document.getElementById('exportImage').addEventListener('click', () => {
// //     const dataURL = canvas.toDataURL('image/png');
// //     const link = document.createElement('a');
// //     link.download = 'whiteboard.png';
// //     link.href = dataURL;
// //     link.click();
// // });





// // document.getElementById("exportPDF").addEventListener("click", async () => {
// //     const canvas = document.getElementById("canvas");

// //     // Convert canvas to Base64 image
// //     const base64Image = canvas.toDataURL("image/png");

// //     try {
// //         // Send the image to the server via POST request
// //         const response = await fetch("/export-pdf", {
// //             method: "POST",
// //             headers: {
// //                 "Content-Type": "application/json",
// //             },
// //             body: JSON.stringify({ base64Image }), // Send as JSON
// //         });

// //         if (response.ok) {
// //             // Trigger download of the PDF
// //             const blob = await response.blob();
// //             const url = URL.createObjectURL(blob);
// //             const a = document.createElement("a");
// //             a.href = url;
// //             a.download = "whiteboard.pdf";
// //             a.click();
// //         } else {
// //             alert("Failed to export PDF");
// //         }
// //     } catch (error) {
// //         console.error("Error exporting PDF:", error);
// //     }
// // });



// // // Adding other functionality
// // let canvas = document.getElementById('canvas');

// // canvas.width = 0.98 * window.innerWidth;
// // canvas.height = window.innerHeight;

// // var io = io.connect("http://localhost:8080/")

// // let ctx =  canvas.getContext("2d");




// // let x;
// // let y;
// // let mouseDown = false;



// // window.onmousedown = (e) => {
// //     if (currentTool === "pen") {
// //         ctx.moveTo(x, y);
// //         io.emit('down', { x, y });
// //     } else if (currentTool === "rect") {
// //         startX = e.clientX;
// //         startY = e.clientY;
// //     } else if (currentTool === "circle") {
// //         startX = e.clientX;
// //         startY = e.clientY;
// //     } else if (currentTool === "text") {
// //         const text = prompt("Enter text:");
// //         if (text) {
// //             ctx.fillText(text, x, y);
// //             io.emit('text', { text, x, y });
// //         }
// //     }
// //     mouseDown = true;
// // };
// // // window.onmousedown = (e) =>{
// // //     ctx.moveTo(x,y);
// // //     io.emit('down' ,{x,y})
// // //     mouseDown = true;
// // // }

// // window.onmouseup =(e) =>{
// // mouseDown = false;

// // }

// // io.on("ondraw",({x,y})=>{
// //     ctx.lineTo(x,y);
// //     ctx.stroke();

// // });

// // io.on("ondown" , ({x , y}) =>{
// //     ctx.moveTo(x,y);
// // })

// // // window.onmousemove = (e) => {
   
    
// // //     x = e.clientX;
// // //     y = e.clientY;
   
// // //     if(mouseDown){
// // //  io.emit('draw' ,{x,y});
// // //         ctx.lineTo(x,y);
// // //         ctx.stroke();
// // //     }
   
// // // };

// // //  this is for pen
// // window.onmousemove = (e) => {
// //     x = e.clientX;
// //     y = e.clientY;

// //     if (mouseDown && currentTool === "pen") {
// //         io.emit('draw', { x, y });
// //         ctx.lineTo(x, y);
// //         ctx.stroke();
// //     }
// // };

// // io.on("text", ({ text, x, y }) => {
// //     ctx.fillText(text, x, y);
// // });



