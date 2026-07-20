const { HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

const db = getFirestore();
const REGION = "asia-southeast1";
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MODES = new Set(["normal", "find-secret-sentence"]);
const COUNTS = new Set([3, 6, 9, 12]);

function fail(code, message = code) { throw new HttpsError("failed-precondition", message, { code }); }
function requireUid(request) { if (!request.auth?.uid) fail("AUTH_REQUIRED"); return request.auth.uid; }
function normalizeCode(value) { return String(value || "").toUpperCase().replace(/\s/g, "").replace(/[^A-HJ-KM-NP-Z2-9]/g, "").slice(0, 6); }
function cleanText(value, max, errorCode) { const text = String(value || "").trim(); if (!text || text.length > max) fail(errorCode); return text; }
function randomCode() { return Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join(""); }
function roomRef(code) { return db.collection("rooms").doc(code); }
function playerRef(code, uid) { return roomRef(code).collection("players").doc(uid); }
function secretRef(code, uid) { return db.collection("roomSecrets").doc(`${code}_${uid}`); }
function boxId(uid, number) { return `${uid}_${number}`; }
function asIso(value) { return value?.toDate ? value.toDate().toISOString() : value || null; }
function validateRoomInput(data) {
  const displayName = cleanText(data.displayName, 30, "INVALID_PLAYER_NAME");
  const title = cleanText(data.title, 80, "INVALID_ROOM_TITLE");
  if (!MODES.has(data.gameMode)) fail("INVALID_GAME_MODE");
  const boxesPerPlayer = Number(data.boxesPerPlayer);
  if (!COUNTS.has(boxesPerPlayer)) fail("INVALID_BOX_COUNT");
  return { displayName, title, gameMode: data.gameMode, boxesPerPlayer };
}
async function assertMember(transaction, code, uid) {
  const ref = playerRef(code, uid); const snap = await transaction.get(ref);
  if (!snap.exists || snap.data().hasLeft || snap.data().wasRemoved) fail("NOT_ROOM_MEMBER");
  return { ref, data: snap.data() };
}

module.exports = { db, REGION, FieldValue, Timestamp, fail, requireUid, normalizeCode, cleanText, randomCode, roomRef, playerRef, secretRef, boxId, asIso, validateRoomInput, assertMember };
