const mongoose = require("mongoose");

const { MONGO_ID, MONGO_PASSWORD, NODE_ENV } = process.env;

const MONGO_URL = `mongodb+srv://${MONGO_ID}:${MONGO_PASSWORD}@cluster0.xp74w9s.mongodb.net/?retryWrites=true&w=majority`;

const connect = () => {
  if (NODE_ENV !== "production") {
    mongoose.set("debug", true);
  }

  mongoose.connect(
    MONGO_URL,
    {
      dbName: "gifchat",
    },
    (error) => {
      if (error) {
        console.log("몽고디비 연결 에러", error);
      } else {
        console.log("몽고디비 연결 성공");
      }
    }
  );
};

mongoose.connection.on("error", (error) => {
  console.log("몽고디비 연결 에러", error);
});

mongoose.connection.on("disconnected", (error) => {
  console.log("몽고디비 연결이 끊겼습니다. 연결을 재시도합니다");
  connect();
});

module.exports = connect;
