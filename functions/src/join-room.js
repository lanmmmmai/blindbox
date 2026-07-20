const { onCall } = require("firebase-functions/v2/https");
const { db, REGION, FieldValue, fail, requireUid, normalizeCode, cleanText, roomRef, playerRef, asIso } = require("./room-utils");

const joinRoom = onCall({ region: REGION, cors: true, enforceAppCheck: false }, async request => {
  const uid = requireUid(request); const code = normalizeCode(request.data?.roomCode);
  if (code.length !== 6) fail("INVALID_ROOM_CODE");
  const name = cleanText(request.data?.displayName, 30, "INVALID_PLAYER_NAME");
  return db.runTransaction(async tx => {
    const rRef = roomRef(code), pRef = playerRef(code, uid);
    const [roomSnap, playerSnap] = await Promise.all([tx.get(rRef), tx.get(pRef)]);
    if (!roomSnap.exists) fail("ROOM_NOT_FOUND"); const room = roomSnap.data();
    if (playerSnap.exists) {
      if (playerSnap.data().wasRemoved) fail("PLAYER_REMOVED");
      tx.update(pRef, { isConnected: true, hasLeft: false, lastSeenAt: FieldValue.serverTimestamp() });
      if (playerSnap.data().hasLeft && room.phase === "lobby") tx.update(rRef, { playerCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
      return { success: true, reconnected: true, roomCode: code, playerId: uid };
    }
    if (room.expiresAt?.toMillis?.() <= Date.now()) fail("ROOM_COMPLETED");
    if (room.status === "completed" || room.status === "cancelled" || room.status === "expired") fail("ROOM_COMPLETED");
    if (room.status !== "waiting" || room.phase !== "lobby") fail("ROOM_ALREADY_STARTED");
    if (room.playerCount >= 2) fail("ROOM_FULL");
    const now = FieldValue.serverTimestamp();
    tx.create(pRef, { uid, displayName: name, role: "player", playerOrder: 2, isReady: false, isConnected: true, hasLockedContent: false, hasLeft: false, wasRemoved: false, joinedAt: now, lastSeenAt: now });
    tx.update(rRef, { playerCount: 2, updatedAt: now });
    return { success: true, reconnected: false, roomCode: code, playerId: uid };
  });
});

const reconnectRoom = onCall({ region: REGION, cors: true, enforceAppCheck: false }, async request => {
  const uid = requireUid(request), code = normalizeCode(request.data?.roomCode);
  return db.runTransaction(async tx => {
    const rRef = roomRef(code), pRef = playerRef(code, uid); const [r, p] = await Promise.all([tx.get(rRef), tx.get(pRef)]);
    if (!r.exists) fail("ROOM_NOT_FOUND"); if (!p.exists) fail("PLAYER_NOT_FOUND"); if (p.data().wasRemoved) fail("PLAYER_REMOVED");
    tx.update(pRef, { isConnected: true, hasLeft: false, lastSeenAt: FieldValue.serverTimestamp() });
    return { success: true, roomCode: code, playerId: uid };
  });
});

const getRoomState = onCall({ region: REGION, cors: true, enforceAppCheck: false }, async request => {
  const uid = requireUid(request), code = normalizeCode(request.data?.roomCode); const rRef = roomRef(code);
  const [roomSnap, meSnap, playersSnap, boxesSnap] = await Promise.all([rRef.get(), playerRef(code, uid).get(), rRef.collection("players").where("hasLeft", "==", false).get(), rRef.collection("boxes").get()]);
  if (!roomSnap.exists) fail("ROOM_NOT_FOUND"); if (!meSnap.exists || meSnap.data().hasLeft || meSnap.data().wasRemoved) fail("NOT_ROOM_MEMBER");
  const r = roomSnap.data(); const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data(), joinedAt: asIso(d.data().joinedAt), lastSeenAt: asIso(d.data().lastSeenAt) })).sort((a,b)=>a.playerOrder-b.playerOrder);
  const boxes = boxesSnap.docs.map(d => ({ id: d.id, ownerPlayerId: d.data().ownerUid, boxNumber: d.data().boxNumber, isLocked: d.data().isLocked, isOpened: d.data().isOpened, openedByPlayerId: d.data().openedByUid || null }));
  return { room: { id: code, roomCode: code, title: r.title, playType: "online", gameMode: r.gameMode, status: r.status, phase: r.phase, boxesPerPlayer: r.boxesPerPlayer, currentTurnPlayerId: r.currentTurnUid, winnerPlayerId: r.winnerUid, revealedContent: r.phase === "result" ? r.revealedContent : null, turnNumber: r.turnNumber, roundNumber: r.roundNumber }, me: players.find(p => p.id === uid), players, boxes };
});
module.exports = { joinRoom, reconnectRoom, getRoomState };
