const ONLINE_ERROR_MESSAGES = {
    ROOM_NOT_FOUND: "Không tìm thấy phòng.", INVALID_ROOM_CODE: "Mã phòng không hợp lệ.",
    ROOM_FULL: "Phòng đã đủ người chơi.", ROOM_ALREADY_STARTED: "Ván chơi đã bắt đầu.",
    ROOM_COMPLETED: "Ván chơi đã kết thúc.", PLAYER_NOT_FOUND: "Phiên chơi không còn trong phòng.",
    PLAYER_REMOVED: "Bạn đã bị chủ phòng xóa khỏi phòng.", NOT_ROOM_MEMBER: "Bạn không còn là thành viên của phòng.",
    NOT_HOST: "Chỉ chủ phòng được thực hiện thao tác này.", NOT_YOUR_TURN: "Chưa đến lượt của bạn.",
    BOX_ALREADY_OPENED: "Túi này đã được mở.", CANNOT_OPEN_OWN_BOX: "Bạn không thể mở túi của chính mình.",
    GAME_NOT_PLAYING: "Ván chơi chưa bắt đầu.", GAME_ALREADY_COMPLETED: "Ván chơi đã kết thúc.",
    CONTENT_NOT_LOCKED: "Bạn chưa nhập đủ nội dung.", INVALID_CONTENT_COUNT: "Số túi đã chọn không hợp lệ.", PLAYERS_NOT_READY: "Cần đủ hai người sẵn sàng.",
    INVALID_GAME_PHASE: "Phòng không ở đúng giai đoạn.", AUTH_REQUIRED: "Không thể xác thực người chơi.",
    DUPLICATE_REQUEST: "Yêu cầu này đã được xử lý.", NETWORK_ERROR: "Không thể tạo phòng online. Máy chủ chưa phản hồi."
};

function normalizeRoomCode(value) {
    return String(value || "").toUpperCase().replace(/\s+/g, "").replace(/[^A-HJ-KM-NP-Z2-9]/g, "").slice(0, 6);
}

function getOnlineError(error) {
    const raw = String(error?.details?.code || error?.message || error || "NETWORK_ERROR");
    if (raw.includes("functions/unauthenticated")) return { code: "AUTH_REQUIRED", message: "Phiên xác thực chưa sẵn sàng." };
    if (raw.includes("functions/not-found")) return { code: "FUNCTION_NOT_FOUND", message: "Máy chủ tạo phòng chưa được triển khai." };
    if (raw.includes("functions/unavailable")) return { code: "FUNCTION_UNAVAILABLE", message: "Máy chủ đang tạm thời không khả dụng." };
    if (raw.includes("functions/internal")) return { code: "FUNCTION_INTERNAL", message: "Máy chủ gặp lỗi khi xử lý yêu cầu." };
    const code = Object.keys(ONLINE_ERROR_MESSAGES).find(key => raw.includes(key)) || "NETWORK_ERROR";
    return { code, message: ONLINE_ERROR_MESSAGES[code] };
}

const roomService = {
    createRoom: data => callFirebaseFunction("createRoom", data),
    joinRoom: (roomCode, displayName) => callFirebaseFunction("joinRoom", { roomCode: normalizeRoomCode(roomCode), displayName }),
    reconnect: roomCode => callFirebaseFunction("reconnectRoom", { roomCode: normalizeRoomCode(roomCode) }),
    getState: roomCode => callFirebaseFunction("getRoomState", { roomCode: normalizeRoomCode(roomCode) }),
    setReady: (roomCode, ready) => callFirebaseFunction("setPlayerReady", { roomCode, ready }),
    start: roomCode => callFirebaseFunction("startRoomGame", { roomCode }),
    saveContent: async (roomCode, items, selectedBagCount = items.length) => {
        const secret = items.find(item => item.isSecret);
        return secret
            ? callFirebaseFunction("lockPlayerSecret", { roomCode, sentence: secret.content, selectedBoxNumber: secret.boxNumber })
            : callFirebaseFunction("lockNormalContent", { roomCode, selectedBagCount, items });
    },
    lockContent: async () => ({ success: true }),
    openBox: (roomCode, boxId, requestId) => callFirebaseFunction("openRoomBox", { roomCode, boxId, requestId }),
    leave: roomCode => callFirebaseFunction("leaveRoom", { roomCode }),
    cancel: roomCode => callFirebaseFunction("cancelRoom", { roomCode }),
    removePlayer: (roomCode, playerUid) => callFirebaseFunction("removeRoomPlayer", { roomCode, playerUid }),
    heartbeat: roomCode => callFirebaseFunction("heartbeatRoom", { roomCode }),
    requestRematch: roomCode => callFirebaseFunction("requestRematch", { roomCode }),
    confirmRematch: roomCode => callFirebaseFunction("confirmRematch", { roomCode })
};
