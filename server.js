const express = require("express");
const session = require('cookie-session');
const http = require("http");
const socketIo = require("socket.io");
const hljs = require("highlight.js");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const app = express();
const port = 3000;
const server = http.createServer(app);
const io = socketIo(server);

const visitCounts = {
  async: 0,
  promise: 0,
  eventloop: 0,
  callback: 0,
};

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB,)
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.error("MongoDB connection error:", err));

  const userSessionSchema = new mongoose.Schema({
    blockName: String,
    users: [{
      socketId: String,
      role: String
    }]
  });
  
const UserSession = mongoose.model('UserSession', userSessionSchema);

const codeBlocks = {
  async: `// Example of async function
        async function fetchData() {
            const data = await fetch('https://api.example.com');
            return data.json();
        }`,
  promise: `// Example of promise\nnew Promise((resolve, reject) => {\n  if (true) {\n    resolve('Success!');\n  } else {\n    reject('Error!');\n  }\n})`,
  eventloop: `// Example of event loop\nconsole.log('First');\nsetTimeout(() => console.log('Second'), 0);\nconsole.log('Third');`,
  callback: `// Example of callback function\nfunction fetchData(callback) {\n  fetch('https://api.example.com').then(response => response.json()).then(data => callback(data));\n}`,
};

app.use(express.static("public"));
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/lobby.html");
});

function determineRole(count) {
  return count === 1 ? "Mentor" : "Student";
}

function createCodeBlockRoute(blockName) {
  return function (req, res) {
    visitCounts[blockName]++;
    const role = determineRole(visitCounts[blockName]);
    const code = codeBlocks[blockName];
    const readOnly = role === "Mentor" ? "readonly" : "";

    res.cookie("role", role, { httpOnly: false });
    res.cookie("code", code, { httpOnly: false });
    res.cookie("readOnly", readOnly, { httpOnly: false });

    res.sendFile(
      path.join(__dirname, "public", `${blockName}.html`),
      function (err) {
        if (err) {
          console.error("Error sending file:", err);
        }
      }
    );
  };
}

app.get("/code/async", createCodeBlockRoute("async"));
app.get("/code/promise", createCodeBlockRoute("promise"));
app.get("/code/eventloop", createCodeBlockRoute("eventloop"));
app.get("/code/callback", createCodeBlockRoute("callback"));

io.on("connection", (socket) => {
  console.log("A user connected");
  
  socket.on('join', async ({ blockName }) => {
    let session = await UserSession.findOne({ blockName });
    if (!session) {
        session = new UserSession({ blockName, users: [] });
    }

    const userCount = session.users.length;
    const role = determineRole(userCount + 1);
    session.users.push({ socketId: socket.id, role });
    await session.save();

    socket.join(blockName);
    socket.emit('role assigned', { role, code: codeBlocks[blockName] });
});



socket.on("code change", (data) => {
    socket.to(data.blockName).emit("code update", {
        // code: hljs.highlight(data.code, {language: "html"}).value
         code: data.code
    });
});
socket.on('disconnect', async () => {
    console.log('A user disconnected');
    await UserSession.updateOne(
      { 'users.socketId': socket.id },
      { $pull: { users: { socketId: socket.id } } }
    );
  });
  });

app.get("/code/:blockName", (req, res) => {
    res.sendFile(path.join(__dirname, `public/${req.params.blockName}.html`));
  });
  

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
