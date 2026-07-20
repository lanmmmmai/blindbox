const { onCall } = require("firebase-functions/v2/https");
const { db, REGION, FieldValue, Timestamp, fail, requireUid, randomCode, roomRef, playerRef, validateRoomInput } = require("./room-utils");

const createRoom = onCall({ region: REGION, cors: true, enforceAppCheck: false }, async request => {
  const uid = requireUid(request); const input = validateRoomInput(request.data || {});
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomCode(); const ref = roomRef(code);
    try {
      await db.runTransaction(async tx => {
        const existing = await tx.get(ref); if (existing.exists) fail("ROOM_CODE_COLLISION");
        const now = FieldValue.serverTimestamp();
        tx.create(ref, { roomCode: code, title: input.title, playType: "online", gameMode: input.gameMode, status: "waiting", phase: "lobby", hostUid: uid, maxPlayers: 2, playerCount: 1, boxesPerPlayer: input.boxesPerPlayer, currentTurnUid: null, firstTurnUid: null, winnerUid: null, revealedContent: null, turnNumber: 1, roundNumber: 1, createdAt: now, updatedAt: now, startedAt: null, completedAt: null, expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000) });
        tx.create(playerRef(code, uid), { uid, displayName: input.displayName, role: "host", playerOrder: 1, isReady: false, isConnected: true, hasLockedContent: false, hasLeft: false, wasRemoved: false, joinedAt: now, lastSeenAt: now });
      });
      return { success: true, roomCode: code, playerId: uid };
    } catch (error) { if (!String(error?.message).includes("ROOM_CODE_COLLISION")) throw error; }
  }
  fail("ROOM_CODE_GENERATION_FAILED");
});
module.exports = { createRoom };
