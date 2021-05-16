const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const mongoose = require("mongoose");
const creds = require("./utils/creds")
const auth = creds()
mongoose
  .connect(
    auth,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(console.log("database connected"))
  .catch((err) => console.log(err));
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const Um = require("./models/userSchema");
const sendtoflask = require("./utils/msgSender");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "Caretaker";

// Run when client connects
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

    //to create a new user in database

    const newUser = new Um({
      _id: new mongoose.Types.ObjectId(),
      username: username,
      sid: user.id,
      score: 0,
    });
    newUser
      .save()
      .then((result) => {
        console.log(result);
        console.log("User created !!!");
      })
      .catch((err) => console.log(err));

    // Welcome current user
    socket.emit("message", formatMessage(botName, "Welcome to Euphoria!"));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
    //sends msg to flask and if its correct, then logs it
    msgwords = msg.split(" ");
    if (msgwords.length > 2) {
      sendtoflask(msg)
        .then((correct) => {
          console.log(correct);
          const sid = user.id;
          //trying to update score :<
          Um.find({ sid: sid }).then((result) => {
            console.log(result[0].score);
            //result[0].score = result[0].score + correct;
            Um.findOneAndUpdate(
              { sid: sid },
              { score: result[0].score + correct },
              { new: true }
            )
              .then((res) => {
                console.log(
                  `Score updated for ${user.username} to ${
                    result[0].score + correct
                  }`
                );
                if (result[0].score + correct === -10) {
                  io.to(user.id).emit(
                    "message",
                    formatMessage(
                      botName,
                      "This message can only be seen by you)\nHey There!\n You are emanating an aura we're not sure is very healthy for you and your mental health :( \n Please take better care of yourself, love yourself, be kinder to yourself,\n and see the magic happen ! We wish you best of luck and lots of love !\nDon't worry, there's always light at the end of the dark tunnel, and if you need a hand in finding that light, you can reach out to these guys over at iCall.\niCall is an email and telephone-based counselling service run by Tata Institute of Social Sciences \n and they offer free services with the help of a team of qualified and trained mental health professionals.\nThey are available Monday to Saturday between 8 am and 10 pm \n Helpline Number: +91 22 2552111 and +91 91529 87821"
                    )
                  );
                }
              })
              .catch((err) => console.log(err));
          });
        })
        .catch((err) => {
          console.log(err);
        });
    }
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );
      //delete the user from database
      const id = user.id;
      Um.remove({ sid: id })
        .exec()
        .then((result) => {
          console.log(`${user.username} has left the chat`);
        })
        .catch((err) => {
          console.log(err, "delete error !!!");
        });

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
