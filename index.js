const express = require("express");
const app = express();
const server = require("http").createServer(app);
const WebSocket = require("ws");
const PORT = process.env.PORT || 5005;
const ws = new WebSocket.Server({ server: server });
const path = require("path");
const cors = require("cors");
const logger = require("morgan");
const { v4: uuidv4 } = require("uuid");
app.use(express.static(path.join(__dirname, "build")));
app.use(logger("dev"));
app.use(cors());

let id = 0;
let clients = [];
let logs = [];
ws.on("connection", (socket, req) => {
  socket.id = uuidv4();
  socket.address = req.socket.remoteAddress;
  clients.push(socket);
  console.log("A new client connected!");
  socket.send(JSON.stringify({ type: "YOUR_ID", socketID: socket.id }));
  //broadcast(socket, { data: 'CONNECT' });
  socket.on("message", (msg) => {
    let message = String(msg);
    console.log("Data received from message: ", message);
    try {
      message = JSON.parse(message);
      console.log("message:", message);
      if (message.type === undefined) {
        message.type = "ALL";
        message.client = "ALL";
      }
      if (message.type === "ALL") {
        broadcast(socket, message);
      }
      else if (message.type === "SPECIFIC_CLIENT") {
        const index = clients.findIndex(client => client.id === message.client);
        clients[index].send(message.data);
      }
    } catch (error) {
      console.log("cannot parse to json", error);
      socket.send("cannot parse to json");
    }
    logs.push({
      owner: socket.id,
      ...message,
      timestamp: new Date().toLocaleString(),
    });
  });

  socket.on("close", () => {
    console.log("Client disconnected");
    clients = clients.filter((client) => client.id !== socket.id);
    //broadcast(socket, { data: 'Client disconnected' });
  });
});

const broadcast = (socket, message) => {
  ws.clients.forEach((client) => {
    if (client !== socket && client.readyState === WebSocket.OPEN) {
      client.send(message.data);
    }
  });
};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
app.get("/clients", (req, res) => {
  res.json(
    clients.map((client) => ({ _id: client.id, address: client.address }))
  );
});
app.get("/logs", (req, res) => {
  res.json(logs);
});
app.get("/logs/clear", (req, res) => {
  logs = [];
  res.json(logs);
});

server.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
