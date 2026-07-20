let firebaseRoomUnsubscribers = [];
let onlineHeartbeatTimer = null;

async function subscribeOnlineRoom(roomState, onChange, onConnection) {
    await unsubscribeOnlineRoom();
    const runtime = await initFirebaseRuntime();
    if (!runtime || !roomState?.room?.roomCode) return;
    const code = roomState.room.roomCode;
    const { doc, collection, onSnapshot } = runtime.firestoreSdk;
    const changed = () => { onConnection?.("connected"); onChange?.(); };
    const failed = () => onConnection?.(navigator.onLine ? "reconnecting" : "disconnected");
    firebaseRoomUnsubscribers = [
        onSnapshot(doc(runtime.db, "rooms", code), changed, failed),
        onSnapshot(collection(runtime.db, "rooms", code, "players"), changed, failed),
        onSnapshot(collection(runtime.db, "rooms", code, "boxes"), changed, failed)
    ];
    const connectionListener = () => onConnection?.(navigator.onLine ? "reconnecting" : "disconnected");
    window.addEventListener("offline", connectionListener);
    window.addEventListener("online", connectionListener);
    firebaseRoomUnsubscribers.push(() => { window.removeEventListener("offline", connectionListener); window.removeEventListener("online", connectionListener); });
    onConnection?.("connected");
    onlineHeartbeatTimer = setInterval(() => roomService.heartbeat(code).catch(failed), 25000);
    document.addEventListener("visibilitychange", firebaseVisibilityHeartbeat);
}

function firebaseVisibilityHeartbeat() {
    if (document.visibilityState === "visible") {
        const code = localStorage.getItem("currentOnlineRoomCode");
        if (code) roomService.heartbeat(code).catch(() => setOnlineConnection?.("reconnecting"));
    }
}

async function unsubscribeOnlineRoom() {
    firebaseRoomUnsubscribers.forEach(unsubscribe => unsubscribe());
    firebaseRoomUnsubscribers = [];
    clearInterval(onlineHeartbeatTimer); onlineHeartbeatTimer = null;
    document.removeEventListener("visibilitychange", firebaseVisibilityHeartbeat);
}
