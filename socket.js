const SocketIO = require("socket.io");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const cookie = require("cookie-signature");

/**
 *
 * @param server  app.listen
 * @param app     app
 * @param sessionMiddleware express-session 함수
 */
module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, { path: "/socket.io" });
  // 전역으로 사용하기위해서 app에 io라는 이름으로 저장
  app.set("io", io);
  // 소켓 IO의 네임 스페이스별로 접속하게끔 설정 ( 전파 범위 )
  const room = io.of("/room"); // room 네임 스페이스
  const chat = io.of("/chat"); // chat 네임 스페이스

  // Socket IO도 미들웨어를 사용할 수 있다
  io.use((socket, next) => {
    // 미들웨어 확장 패턴
    cookieParser(process.env.COOKIE_SECRET)(
      socket.request,
      socket.request.res,
      next
    );
    sessionMiddleware(socket.request, socket.request.res, next);
  });

  // ! room 소켓에 연결되었을때
  room.on("connection", (socket) => {
    console.log("room 네임스페이스에 접속");
    //? room 소켓에서 연결이 끊겼을때
    socket.on("disconnect", () => {
      console.log("room 네임스페이스 접속 해제");
    });
  });

  // ! chat 소켓에 연결되었을때
  chat.on("connection", (socket) => {
    console.log("chat 네임스페이스에 접속");
    const req = socket.request;
    console.dir(req.session);

    // 리퍼러로 Room Id 구하기
    const {
      headers: { referer },
    } = req;

    const roomId = referer
      .split("/")
      [referer.split("/").length - 1].replace(/\?.+/, "");

    // 네임스페이스 안에 세부적으로 "방" 이라는게 존재해서, 같은 방끼리 전달함
    socket.join(roomId);

    // 특정 방에 데이터를 보낸다다
    socket.to(roomId).emit("join", {
      user: "system",
      chat: `${req.session.color}님이 입장하셨습니다.`,
    });

    //? chat 소켓에서 연결이 끊겼을때
    socket.on("disconnect", () => {
      console.log("chat 네임스페이스 접속 해제");
      // 네임스페이스 안에 세부적으로 "방" 이라는게 존재하는데, 방을 나간다
      socket.leave(roomId); // 방에서 나가기

      // 해당 chat소켓 내에 특정 방의 인원수를 가져온다
      const currentRoom = socket.adapter.rooms[roomId];
      const userCount = currentRoom ? currentRoom.length : 0;

      // 유저가 0명이면 방 삭제
      if (userCount === 0) {
        const signedCookie = cookie.sign(
          req.signedCookies["connect.sid"],
          process.env.COOKIE_SECRET
        );

        const connectSID = `${signedCookie}`;
        axios
          .delete(`http://localhost:3000/room/${roomId}`, {
            headers: {
              Cookie: `connect.sid=s%3A${connectSID}`,
            },
          })
          .then(() => {
            console.log("방 제거 요청 성공");
          })
          .catch((error) => {
            console.error(error);
          });
      } else {
        // 사용자가 1명이상 존재할때
        socket.to(roomId).emit("exit", {
          user: "system",
          chat: `${req.session.color}님이 퇴장하셨습니다.`,
        });
      }
    });
  });
};
