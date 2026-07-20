const { onCall } = require("firebase-functions/v2/https");
const { db, REGION, FieldValue, fail, requireUid, normalizeCode, cleanText, roomRef, playerRef, secretRef, boxId: makeBoxId } = require("./room-utils");

const openRoomBox=onCall({region:REGION,cors:true,enforceAppCheck:false},async request=>{
  const uid=requireUid(request),code=normalizeCode(request.data?.roomCode),requestedBoxId=cleanText(request.data?.boxId,160,"INVALID_BOX"),requestId=cleanText(request.data?.requestId,80,"INVALID_REQUEST_ID");const rRef=roomRef(code),bRef=rRef.collection("boxes").doc(requestedBoxId),reqRef=rRef.collection("requests").doc(requestId);
  return db.runTransaction(async tx=>{
    const [rSnap,pSnap,bSnap,reqSnap,playersSnap,boxesSnap]=await Promise.all([tx.get(rRef),tx.get(playerRef(code,uid)),tx.get(bRef),tx.get(reqRef),tx.get(rRef.collection("players").where("hasLeft","==",false)),tx.get(rRef.collection("boxes"))]);
    if(reqSnap.exists)fail("DUPLICATE_REQUEST");if(!rSnap.exists)fail("ROOM_NOT_FOUND");const room=rSnap.data();if(!pSnap.exists)fail("NOT_ROOM_MEMBER");if(room.status==="completed")fail("GAME_ALREADY_COMPLETED");if(room.phase!=="opening"||room.status!=="playing")fail("GAME_NOT_PLAYING");if(room.currentTurnUid!==uid)fail("NOT_YOUR_TURN");if(!bSnap.exists)fail("INVALID_BOX");const box=bSnap.data();if(box.ownerUid===uid)fail("CANNOT_OPEN_OWN_BOX");if(box.isOpened)fail("BOX_ALREADY_OPENED");
    const secretSnaps=await Promise.all(playersSnap.docs.map(player=>tx.get(secretRef(code,player.id))));
    const ownerIndex=playersSnap.docs.findIndex(player=>player.id===box.ownerUid),sSnap=secretSnaps[ownerIndex];if(!sSnap?.exists)fail("CONTENT_NOT_LOCKED");const secret=sSnap.data();let result="content",content=null,finished=false;
    if(room.gameMode==="find-secret-sentence"){
      if(secret.secretBoxId===requestedBoxId){result="secret-found";content=secret.encryptedContent;finished=true;}else result="empty";
    }else{const item=(secret.encryptedContent||[]).find(x=>x.boxNumber===box.boxNumber);if(item){content=item.content;result=item.contentType||"content";}else result="empty";}
    const opponent=playersSnap.docs.find(d=>d.id!==uid);const now=FieldValue.serverTimestamp();
    tx.update(bRef,{isOpened:true,openedByUid:uid,openedAt:now});tx.create(reqRef,{uid,boxId:requestedBoxId,roundNumber:room.roundNumber,createdAt:now});
    tx.create(rRef.collection("actions").doc(),{type:"box-opened",playerUid:uid,ownerUid:box.ownerUid,boxId:requestedBoxId,result,roundNumber:room.roundNumber,createdAt:now});
    if(finished)tx.update(rRef,{status:"completed",phase:"result",winnerUid:uid,revealedContent:content,completedAt:now,updatedAt:now});
    else if(room.gameMode==="normal"){
      // Mỗi người đua mở hết các túi có nội dung của đối phương. Kết thúc ngay
      // khi người đang chơi mở túi nội dung cuối cùng trong khu vực vừa chọn.
      const ownerContentBoxIds=new Set((secret.encryptedContent||[]).map(item=>makeBoxId(box.ownerUid,item.boxNumber)));
      const openedContentBox=ownerContentBoxIds.has(requestedBoxId);
      const remainingOwnerContent=boxesSnap.docs.filter(doc=>doc.id!==requestedBoxId&&!doc.data().isOpened&&ownerContentBoxIds.has(doc.id));
      if(openedContentBox&&remainingOwnerContent.length===0){
        tx.update(rRef,{status:"completed",phase:"result",winnerUid:uid,currentTurnUid:null,completedAt:now,updatedAt:now});
        finished=true;
      }else{
        const remainingPublic=boxesSnap.docs.filter(doc=>doc.id!==requestedBoxId&&!doc.data().isOpened).map(doc=>doc.data());
        const opponentCanOpen=remainingPublic.some(item=>item.ownerUid===uid);
        tx.update(rRef,{currentTurnUid:opponentCanOpen?(opponent?.id||uid):uid,turnNumber:FieldValue.increment(1),updatedAt:now});
      }
    }else tx.update(rRef,{currentTurnUid:opponent?.id||null,turnNumber:FieldValue.increment(1),updatedAt:now});
    return{success:true,result,content,gameFinished:finished,winnerUid:finished?uid:null,ownerName:playersSnap.docs.find(d=>d.id===box.ownerUid)?.data().displayName||"đối phương"};
  });
});
module.exports={openRoomBox};
