const { onCall } = require("firebase-functions/v2/https");
const { db, REGION, FieldValue, fail, requireUid, normalizeCode, cleanText, roomRef, playerRef, secretRef, boxId } = require("./room-utils");

async function lockContent(request, secretMode) {
  const uid=requireUid(request), code=normalizeCode(request.data?.roomCode), rRef=roomRef(code), pRef=playerRef(code,uid), sRef=secretRef(code,uid);
  return db.runTransaction(async tx=>{
    const [rSnap,pSnap,playersSnap,oldSecret]=await Promise.all([tx.get(rRef),tx.get(pRef),tx.get(rRef.collection("players").where("hasLeft","==",false)),tx.get(sRef)]);
    if(!rSnap.exists)fail("ROOM_NOT_FOUND");const room=rSnap.data();if(!pSnap.exists)fail("NOT_ROOM_MEMBER");if(room.phase!=="writing"&&room.phase!=="waiting-for-content")fail("INVALID_GAME_PHASE");if(pSnap.data().hasLockedContent||oldSecret.exists)fail("CONTENT_ALREADY_LOCKED");
    let secretData;
    if(secretMode){
      if(room.gameMode!=="find-secret-sentence")fail("INVALID_GAME_MODE");const sentence=cleanText(request.data?.sentence,200,"INVALID_CONTENT");const n=Number(request.data?.selectedBoxNumber);if(!Number.isInteger(n)||n<1||n>room.boxesPerPlayer)fail("INVALID_BOX_NUMBER");
      secretData={roomCode:code,ownerUid:uid,mode:room.gameMode,encryptedContent:sentence,secretBoxId:boxId(uid,n),isLocked:true,roundNumber:room.roundNumber,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
    }else{
      if(room.gameMode!=="normal")fail("INVALID_GAME_MODE");const items=Array.isArray(request.data?.items)?request.data.items:[];const selectedBagCount=Number(request.data?.selectedBagCount);if(!Number.isInteger(selectedBagCount)||selectedBagCount<1||selectedBagCount>room.boxesPerPlayer||items.length!==selectedBagCount)fail("INVALID_CONTENT_COUNT");
      const numbers=new Set();const contents=items.map(item=>{const n=Number(item.boxNumber);if(!Number.isInteger(n)||n<1||n>room.boxesPerPlayer||numbers.has(n))fail("INVALID_BOX_NUMBER");numbers.add(n);if(!["question","dare","gift","punish"].includes(item.contentType))fail("INVALID_CONTENT");return{boxNumber:n,content:cleanText(item.content,150,"INVALID_CONTENT"),contentType:item.contentType};});
      secretData={roomCode:code,ownerUid:uid,mode:room.gameMode,encryptedContent:contents,isLocked:true,roundNumber:room.roundNumber,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
    }
    tx.create(sRef,secretData);
    // Luôn tạo đủ các túi công khai để đối phương không thể đoán vị trí có
    // nội dung. Danh sách vị trí thật chỉ nằm trong roomSecrets phía server.
    const boxNumbers=Array.from({length:room.boxesPerPlayer},(_,index)=>index+1);
    boxNumbers.forEach(n=>tx.create(rRef.collection("boxes").doc(boxId(uid,n)),{ownerUid:uid,boxNumber:n,isLocked:true,isOpened:false,openedByUid:null,openedAt:null,roundNumber:room.roundNumber}));
    tx.update(pRef,{hasLockedContent:true,lastSeenAt:FieldValue.serverTimestamp()});
    const otherLocked=playersSnap.docs.filter(d=>d.id!==uid).every(d=>d.data().hasLockedContent);
    tx.update(rRef,{phase:otherLocked?"ready":"waiting-for-content",updatedAt:FieldValue.serverTimestamp()});
    return{success:true};
  });
}
const lockNormalContent=onCall({region:REGION,cors:true,enforceAppCheck:false},request=>lockContent(request,false));
const lockPlayerSecret=onCall({region:REGION,cors:true,enforceAppCheck:false},request=>lockContent(request,true));
module.exports={lockNormalContent,lockPlayerSecret};
