const { initializeApp } = require("firebase-admin/app");
initializeApp();

Object.assign(exports,
  require("./create-room"),
  require("./join-room"),
  require("./start-game"),
  require("./lock-content"),
  require("./open-box"),
  require("./room-actions")
);
