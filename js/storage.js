/* ==========================================================================
   STORAGE.JS - QUẢN LÝ DỮ LIỆU NHIỀU VÁN CHƠI & CÀI ĐẶT
   ========================================================================== */

const STORAGE_KEY = "tuiMuBiMatApp";
const OLD_STORAGE_KEY = "tui_mu_game_state";

// Khởi tạo cấu trúc dữ liệu mặc định của App
let appData = {
    version: 1,
    currentGameId: null,
    games: [],
    settings: {
        theme: "system",
        soundEnabled: true,
        effectsEnabled: true
    }
};

// Sinh UUID đơn giản
function generateUUID() {
    return 'game-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

// 1. TẢI TOÀN BỘ DỮ LIỆU TỪ LOCAL STORAGE (CÓ MIGRATION)
function loadAppData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            appData = JSON.parse(saved);
            // Thực hiện migration nếu cần thiết trong tương lai
            appData = migrateAppData(appData);
        } else {
            // Kiểm tra xem có dữ liệu của phiên bản đơn cũ không
            const oldSaved = localStorage.getItem(OLD_STORAGE_KEY);
            if (oldSaved) {
                console.log("[Storage] Phát hiện dữ liệu phiên bản cũ. Tiến hành di chuyển dữ liệu...");
                migrateOldGameData(oldSaved);
            } else {
                saveAppData(); // Ghi dữ liệu mặc định lần đầu
            }
        }
    } catch (e) {
        console.error("Lỗi đọc dữ liệu ứng dụng:", e);
    }
    return appData;
}

// 2. LƯU TOÀN BỘ DỮ LIỆU
function saveAppData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (e) {
        console.error("Lỗi lưu dữ liệu ứng dụng:", e);
    }
}

// 3. DI CHUYỂN DỮ LIỆU CŨ SANG CẤU TRÚC MỚI (MIGRATION)
function migrateOldGameData(oldJsonString) {
    try {
        const oldState = JSON.parse(oldJsonString);
        
        // Tạo một game mới từ trạng thái cũ
        const oldGame = {
            id: "migrated-old-game",
            title: oldState.gameTitle || "Đêm Hội Vui Vẻ",
            mode: oldState.settings ? oldState.settings.gameMode : "normal",
            status: oldState.phase === "result" ? "completed" : "playing",
            phase: oldState.phase || "setup",
            createdAt: oldState.startTime || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: oldState.endTime || null,
            players: oldState.players || [],
            boxesPerPlayer: oldState.boxesPerPlayer || 6,
            totalCells: oldState.totalCells || 12,
            cellsPerPlayer: oldState.cellsPerPlayer || 6,
            distMode: oldState.distMode || "random",
            themePreset: oldState.themePreset || "friend",
            settings: oldState.settings || {
                gameMode: "normal",
                turnMode: "turn",
                requireAllBoxesFilled: true,
                showBoxNumbers: true,
                soundEnabled: true,
                confettiEnabled: true
            },
            boxes: oldState.boxes || [],
            temporaryInputs: oldState.temporaryInputs || {},
            currentInputPlayerIndex: oldState.currentInputPlayerIndex || 0,
            currentTurnPlayerIndex: oldState.currentTurnPlayerIndex || 0,
            turnNumber: oldState.turnNumber || 1,
            history: oldState.history || [],
            startTime: oldState.startTime || null,
            endTime: oldState.endTime || null,
            winnerId: oldState.winnerId !== undefined ? oldState.winnerId : null,
            foundSecretBoxId: oldState.foundSecretBoxId || null,
            gameEndedReason: oldState.gameEndedReason || null
        };

        // Gán vào appData mới
        appData.version = 1;
        appData.games = [oldGame];
        appData.currentGameId = oldGame.status === "playing" ? oldGame.id : null;
        
        // Khôi phục cài đặt chung
        if (oldState.settings) {
            appData.settings.soundEnabled = oldState.settings.soundEnabled !== undefined ? oldState.settings.soundEnabled : true;
            appData.settings.effectsEnabled = oldState.settings.confettiEnabled !== undefined ? oldState.settings.confettiEnabled : true;
            appData.settings.theme = oldState.settings.theme || "light";
        }

        saveAppData();
        // Xóa key cũ sau khi migrate xong
        localStorage.removeItem(OLD_STORAGE_KEY);
        console.log("[Storage] Di chuyển dữ liệu thành công!");
    } catch (e) {
        console.error("Lỗi di chuyển dữ liệu cũ:", e);
    }
}

// Di chuyển phiên bản dữ liệu mới (nếu có cập nhật cấu trúc schema sau này)
function migrateAppData(data) {
    if (!data.version) {
        data.version = 1;
    }
    if (!data.games) {
        data.games = [];
    }
    if (!data.settings) {
        data.settings = {
            theme: "system",
            soundEnabled: true,
            effectsEnabled: true
        };
    }
    return data;
}

// 4. QUẢN LÝ CÁC HÀM VÁN CHƠI

// Lấy ván chơi hiện tại
function getCurrentGame() {
    if (!appData.currentGameId) return null;
    return appData.games.find(g => g.id === appData.currentGameId) || null;
}

// Tạo ván chơi mới
function createNewGameData(title, mode, players, boxesPerPlayer, distMode, themePreset, settings) {
    const newGame = {
        id: generateUUID(),
        title: title || "Ván chơi mới",
        mode: mode || "normal",
        status: "preparing", // Bắt đầu ở pha chuẩn bị
        phase: "input-intro",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        players: players,
        boxesPerPlayer: boxesPerPlayer,
        totalCells: boxesPerPlayer * players.length,
        cellsPerPlayer: boxesPerPlayer,
        distMode: distMode,
        themePreset: themePreset,
        settings: settings,
        boxes: [],
        temporaryInputs: {},
        currentInputPlayerIndex: 0,
        currentTurnPlayerIndex: 0,
        turnNumber: 1,
        history: [],
        startTime: null,
        endTime: null,
        winnerId: null,
        foundSecretBoxId: null,
        gameEndedReason: null
    };
    
    appData.games.push(newGame);
    appData.currentGameId = newGame.id;
    saveAppData();
    return newGame;
}

// Cập nhật trạng thái ván chơi hiện tại
function updateCurrentGame(fields) {
    const game = getCurrentGame();
    if (!game) return;
    
    Object.assign(game, fields, { updatedAt: new Date().toISOString() });
    saveAppData();
}

// Tạm dừng ván chơi hiện tại
function pauseCurrentGame() {
    const game = getCurrentGame();
    if (game && game.status === "playing") {
        game.status = "paused";
        appData.currentGameId = null; // Bỏ chọn ván hiện tại khỏi màn hình chơi
        saveAppData();
    }
}

// Hủy ván chơi hiện tại
function cancelCurrentGame() {
    const game = getCurrentGame();
    if (game) {
        game.status = "cancelled";
        game.completedAt = new Date().toISOString();
        appData.currentGameId = null;
        saveAppData();
    }
}

// Hoàn thành ván chơi hiện tại (lưu vào lịch sử lưu trữ)
function archiveCompletedGame() {
    const game = getCurrentGame();
    if (game) {
        game.status = "completed";
        game.completedAt = new Date().toISOString();
        appData.currentGameId = null;
        saveAppData();
    }
}

// Xóa ván chơi theo ID
function deleteGameById(gameId) {
    appData.games = appData.games.filter(g => g.id !== gameId);
    if (appData.currentGameId === gameId) {
        appData.currentGameId = null;
    }
    saveAppData();
}

// Đổi tên ván chơi
function renameGameById(gameId, newTitle) {
    const game = appData.games.find(g => g.id === gameId);
    if (game) {
        game.title = newTitle;
        game.updatedAt = new Date().toISOString();
        saveAppData();
    }
}

// Thiết lập ván hiện tại để tiếp tục chơi
function selectGameToPlay(gameId) {
    const game = appData.games.find(g => g.id === gameId);
    if (game) {
        appData.currentGameId = game.id;
        if (game.status === "paused" || game.status === "preparing") {
            game.status = "playing";
        }
        saveAppData();
        return game;
    }
    return null;
}

// Xóa toàn bộ dữ liệu cài đặt
function clearAllLocalStorageData() {
    appData = {
        version: 1,
        currentGameId: null,
        games: [],
        settings: {
            theme: "system",
            soundEnabled: true,
            effectsEnabled: true
        }
    };
    saveAppData();
}
