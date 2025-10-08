const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const { dbHelpers } = require("./database");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(process.cwd())));

// Route for the root path - serve the HTML file
app.get("/", (req: any, res: any) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
});

// Store online users
const onlineUsers = new Set();
const userSockets = new Map();

// Helper function for error handling
function getErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// API Routes
app.post("/clear-messages", async (req: any, res: any) => {
  try {
    await dbHelpers.clearAllMessages();
    io.emit("messages cleared");
    res.json({ success: true, message: "All messages cleared" });
  } catch (error) {
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

app.post("/disconnect", (req: any, res: any) => {
  const { username } = req.body;
  if (username && onlineUsers.has(username)) {
    onlineUsers.delete(username);
    userSockets.delete(username);
    io.emit("user joined", Array.from(onlineUsers));
  }
  res.json({ success: true });
});

app.post("/reset", async (req: any, res: any) => {
  try {
    await dbHelpers.clearAllMessages();
    onlineUsers.clear();
    userSockets.clear();
    io.emit("messages cleared");
    io.emit("user joined", []);
    res.json({ success: true, message: "Chat reset successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// Authentication routes
app.post("/register", async (req: any, res: any) => {
  try {
    const { email, username, password } = req.body;

    // Check if user already exists
    const existingEmail = await dbHelpers.findUserByEmail(email);
    const existingUsername = await dbHelpers.findUserByUsername(username);

    if (existingEmail) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    if (existingUsername) {
      return res.status(400).json({ success: false, error: "Username already taken" });
    }

    // Create user (in real app, hash the password!)
    await dbHelpers.createUser(email, username, password);

    res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

app.post("/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    const user = await dbHelpers.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    // In real app, compare hashed passwords!
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    res.json({ success: true, user: { email: user.email, username: user.username } });
  } catch (error) {
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// Socket.IO connection
io.on("connection", async (socket: any) => {
  console.log("🔗 User connected:", socket.id);

  // Load message history
  try {
    const messages = await dbHelpers.getMessages();
    socket.emit("load messages", messages);
  } catch (error) {
    console.error("Error loading messages:", getErrorMessage(error));
  }

  // Send current online users
  socket.emit("user joined", Array.from(onlineUsers));

  // Handle new user
  socket.on("new user", async (username: string) => {
    onlineUsers.add(username);
    userSockets.set(username, socket.id);
    try {
      await dbHelpers.saveUser({ username, status: "Online" });
      io.emit("user joined", Array.from(onlineUsers));
      console.log("👤 User joined:", username);
    } catch (error) {
      console.error("Error saving user:", getErrorMessage(error));
    }
  });

  // Handle chat messages
  socket.on("chat message", async (data: any) => {
    try {
      await dbHelpers.saveMessage(data);
      io.emit("chat message", data);
      console.log("💬 Message from:", data.sender);
    } catch (error) {
      console.error("Error saving message:", getErrorMessage(error));
    }
  });

  // Handle private messages
  socket.on("private message", async (data: any) => {
    try {
      const { sender, receiver, text, time } = data;

      // Save private message to database
      await dbHelpers.savePrivateMessage({
        sender,
        receiver,
        text,
        time,
        type: "private",
      });

      // Send to receiver if online
      const receiverSocketId = userSockets.get(receiver);
      if (receiverSocketId) {
        socket.to(receiverSocketId).emit("private message", data);
      }

      // Also send back to sender for immediate UI update
      socket.emit("private message", data);

      console.log("🔒 Private message from:", sender, "to:", receiver);
    } catch (error) {
      console.error("Error saving private message:", getErrorMessage(error));
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("🔌 User disconnected:", socket.id);

    // Find and remove the disconnected user
    for (let [username, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(username);
        userSockets.delete(username);
        io.emit("user joined", Array.from(onlineUsers));
        console.log("👤 User left:", username);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Chat app available at: http://localhost:${PORT}`);
  console.log(`💬 Open this URL in your browser to use the chat app`);
  console.log(`🔒 Private messaging feature: ACTIVE`);
});
