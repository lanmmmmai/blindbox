const { onCall } = require("firebase-functions/v2/https");
const { db, REGION, FieldValue, fail, requireUid, normalizeCode, roomRef, playerRef } = require("./room-utils");

const setPlayerReady = onCall({ region: REGION, cors: true, enforceAppCheck: false }, async request => {
  const uid = requireUid(request), code = normalizeCode(request.data?.roomCode), ready = Boolean(request.data?.ready);
  await db.runTransaction(async tx => { const [r,p] = await Promise.all([tx.get(roomRef(code)),tx.get(playerRef(code,uid))]); if(!r.exists)fail("ROOM_NOT_FOUND");if(!p.exists||p.data().hasLeft)fail("NOT_ROOM_MEMBER");if(r.data().phase!=="lobby")fail("INVALID_GAME_PHASE");tx.update(p.ref,{isReady:ready,lastSeenAt:FieldValue.serverTimestamp()}); });
  return { success: true };
});

const startRoomGame = onCall({ region: REGION, cors: true, enforceAppCheck: false }, async request => {
  const uid = requireUid(request), code = normalizeCode(request.data?.roomCode), rRef = roomRef(code);
  return db.runTransaction(async tx => {
    const [rSnap, playersSnap] = await Promise.all([tx.get(rRef),tx.get(rRef.collection("players").where("hasLeft","==",false))]);
    if(!rSnap.exists)fail("ROOM_NOT_FOUND");const room=rSnap.data();const players=playersSnap.docs.map(d=>({id:d.id,...d.data()}));const me=players.find(p=>p.id===uid);
    if(!me)fail("NOT_ROOM_MEMBER");if(me.role!=="host")fail("NOT_HOST");if(players.length!==2)fail("ROOM_FULL");
    const now=FieldValue.serverTimestamp();
    if(room.phase==="lobby"){
      if(!players.every(p=>p.isReady))fail("PLAYERS_NOT_READY");
      playersSnap.docs.forEach(p=>tx.update(p.ref,{isReady:false}));
      tx.update(rRef,{status:"preparing",phase:"writing",updatedAt:now});
      return {success:true,phase:"writing"};
    }
    if(room.phase!=="ready")fail("INVALID_GAME_PHASE");if(!players.every(p=>p.hasLockedContent))fail("CONTENT_NOT_LOCKED");
    const first=room.firstTurnUid||players[Math.floor(Math.random()*players.length)].id;
    tx.update(rRef,{status:"playing",phase:"opening",currentTurnUid:first,firstTurnUid:first,winnerUid:null,turnNumber:1,startedAt:now,updatedAt:now});
    return {success:true,phase:"opening",currentTurnUid:first};
  });
});
module.exports={setPlayerReady,startRoomGame};
