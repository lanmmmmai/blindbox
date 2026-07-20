/* ==========================================================================
   APP.JS - TỆP TIN CHÍNH KHỞI CHẠY ỨNG DỤNG (ENTRY POINT)
   ========================================================================== */

// 2. GLOBAL VARIABLES (Declared in constants.js)

// DOM Cache
const DOM = {};

window.toggleGameMenu = function() {
    document.querySelector(".sidebar-navigation")?.classList.toggle("mobile-open");
};

// 4. KHỞI CHẠY KHỞI ĐỘNG (ENTRY POINT)
document.addEventListener("DOMContentLoaded", () => {
    // Cache tất cả DOM selectors dùng chung
    cacheDOM();
    
    // Đọc cài đặt lưu trữ
    loadAppData();

    // Áp dụng theme và đồng bộ UI
    setTheme(appData.settings.theme || "system");

    // Khởi tạo các sự kiện modal hệ thống và đóng phím Escape
    initModalEvents();

    // Đăng ký bộ định tuyến và kích hoạt Router
    initRouter();

    // Khởi tạo PWA cài đặt
    registerServiceWorker();
    initPwaInstallControls();

    // Chuẩn bị UID ẩn danh sớm; không chặn chế độ local nếu Firebase/mạng lỗi.
    initializeFirebaseConnection();

    // Khôi phục phòng online nếu thiết bị còn phiên hợp lệ.
    attemptOnlineReconnect();

    // Sự kiện cuộn bàn chơi để ẩn chỉ báo cuộn
    if (DOM.gameGrid) {
        DOM.gameGrid.addEventListener("scroll", handleBoardScroll);
    }

    // Tắt Splash Screen sau khi load xong (giả lập 1s cho mượt mà).
    // Phải vô hiệu hóa pointer-events ngay khi bắt đầu ẩn để lớp phủ vô hình
    // không chặn thao tác trên ứng dụng.
    setTimeout(() => {
        const splash = document.getElementById("view-splash");
        if (splash) {
            splash.style.pointerEvents = "none";
            splash.classList.remove("active");
        }
    }, 1200);
});

// Cache DOM selectors để tối ưu hiệu năng truy vấn
function cacheDOM() {
    DOM.gameGrid = document.getElementById("game-grid");
    DOM.boardGameTitle = document.getElementById("board-game-title");
    DOM.badgePlayMode = document.getElementById("badge-play-mode");
    DOM.boardProgressBar = document.getElementById("board-progress-bar");
    DOM.boardProgressText = document.getElementById("board-progress-text");
    DOM.boardRemainingText = document.getElementById("board-remaining-text");
    DOM.boardTurnNum = document.getElementById("board-turn-num");
    DOM.activePlayerAvatar = document.getElementById("active-player-avatar");
    DOM.turnIndicatorText = document.getElementById("turn-indicator-text");
    DOM.turnActionDescText = document.getElementById("turn-action-desc-text");
    
    DOM.playersLegendList = document.getElementById("players-legend-list");
    DOM.boardHistorySection = document.getElementById("board-history-section");
    DOM.boardHistoryList = document.getElementById("board-history-list");
    DOM.btnEndTurn = document.getElementById("btn-end-turn-free");

    // Modals
    DOM.boxModal = document.getElementById("box-modal");
    DOM.modalCardInner = DOM.boxModal ? DOM.boxModal.querySelector(".card-inner") : null;
    DOM.modalCardBack = DOM.boxModal ? DOM.boxModal.querySelector(".card-back") : null;
    DOM.modalOwnerBadge = document.getElementById("modal-owner-badge");
    DOM.modalTypeIcon = document.getElementById("modal-type-icon");
    DOM.modalTypeLabel = document.getElementById("modal-type-label");
    DOM.modalSecretContent = document.getElementById("modal-secret-content");
    DOM.modalActionTip = document.getElementById("modal-action-tip");
    DOM.btnCloseModal = document.getElementById("btn-close-modal");

    DOM.confirmLockModal = document.getElementById("confirm-lock-modal");
    DOM.confirmLockTitle = document.getElementById("confirm-lock-title");
    DOM.confirmLockBodyText = document.getElementById("confirm-lock-body-text");
    DOM.confirmLockStatsBox = document.getElementById("confirm-lock-stats-box");
    DOM.confirmLockStats = document.getElementById("confirm-lock-stats");
    DOM.btnConfirmLockYes = document.getElementById("btn-confirm-lock-yes");
    DOM.btnConfirmLockNo = document.getElementById("btn-confirm-lock-no");

    // Guide Modal
    DOM.guideModal = document.getElementById("guide-modal");
    DOM.btnToggleGuide = document.getElementById("btn-toggle-guide");
    DOM.btnCloseGuide = document.getElementById("btn-close-guide");

    // Privacy & Ready View DOMs
    DOM.privacyLockedTitle = document.getElementById("privacy-locked-title");
    DOM.privacyMsgInstruction = document.getElementById("privacy-msg-instruction");
    DOM.nextPlayerName = document.getElementById("next-player-name");
    DOM.btnNextPlayerName = document.getElementById("btn-next-player-name");
    DOM.btnNextPlayer = document.getElementById("btn-next-player");

    DOM.readyPlayersSummary = document.getElementById("ready-players-summary");
    DOM.readyRulesList = document.getElementById("ready-rules-list");
    DOM.readyFirstPlayer = document.getElementById("ready-first-player");

    // Result subviews
    DOM.endScreen = document.getElementById("view-game"); // Chơi và kết quả chung 1 view
    DOM.secretWinnerCard = document.getElementById("secret-winner-card");
    DOM.secretWinnerName = document.getElementById("secret-winner-name");
    DOM.secretLoserName = document.getElementById("secret-loser-name");
    DOM.secretBoxNum = document.getElementById("secret-box-num");
    DOM.secretWinnerSentence = document.getElementById("secret-winner-sentence");
    
    DOM.normalEndTrophy = document.getElementById("normal-end-trophy");
    DOM.normalEndTitle = document.getElementById("normal-end-title");
    DOM.normalEndSubtitle = document.getElementById("normal-end-subtitle");
    DOM.typesStatsContainer = document.getElementById("types-stats-container");
    DOM.typesStatsGrid = document.getElementById("types-stats-grid");
    
    DOM.playerStatsList = document.getElementById("player-stats-list");
    DOM.btnReplayNewPosition = document.getElementById("btn-replay-new-position");
    DOM.btnNewSentences = document.getElementById("btn-new-sentences");
    DOM.btnReplayOldContent = document.getElementById("btn-replay-old-content");
    DOM.btnCreateNewContent = document.getElementById("btn-create-new-content");
}

function initModalEvents() {
    // 1. Modal xem hộp quà
    if (DOM.btnCloseModal) {
        DOM.btnCloseModal.addEventListener("click", () => {
            if (onlineBoxModalActive) closeOnlineBoxModal();
            else completeCurrentTurn();
        });
    }

    // 2. Modal xác nhận khóa hộp
    if (DOM.btnConfirmLockYes) {
        DOM.btnConfirmLockYes.addEventListener("click", confirmLockPlayerBoxes);
    }
    if (DOM.btnConfirmLockNo) {
        DOM.btnConfirmLockNo.addEventListener("click", () => {
            DOM.confirmLockModal.classList.remove('active');
            if (lastFocusedElement) lastFocusedElement.focus();
        });
    }

    // 3. Modal hướng dẫn
    if (DOM.btnToggleGuide && DOM.guideModal) {
        DOM.btnToggleGuide.addEventListener("click", () => {
            lastFocusedElement = document.activeElement;
            DOM.guideModal.classList.add("active");
            DOM.btnCloseGuide.focus();
            playSound('lock');
        });
    }
    if (DOM.btnCloseGuide && DOM.guideModal) {
        DOM.btnCloseGuide.addEventListener("click", () => {
            DOM.guideModal.classList.remove("active");
            if (lastFocusedElement) lastFocusedElement.focus();
            playSound('pop');
        });
    }

    // Đóng modal bằng Escape key
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            // Đóng guide modal
            if (DOM.guideModal && DOM.guideModal.classList.contains("active")) {
                DOM.guideModal.classList.remove("active");
                if (lastFocusedElement) lastFocusedElement.focus();
                playSound('pop');
            }
            // Đóng confirm lock modal
            if (DOM.confirmLockModal && DOM.confirmLockModal.classList.contains("active")) {
                DOM.confirmLockModal.classList.remove("active");
                if (lastFocusedElement) lastFocusedElement.focus();
                playSound('pop');
            }
        }
    });

    // Toggle nhanh Theme trên Header
    const btnToggleTheme = document.getElementById("btn-toggle-theme");
    if (btnToggleTheme) {
        btnToggleTheme.addEventListener("click", () => {
            playSound('pop');
            let nextTheme = "light";
            if (appData.settings.theme === "light") {
                nextTheme = "dark";
            } else if (appData.settings.theme === "dark") {
                nextTheme = "system";
            }
            setTheme(nextTheme);
        });
    }
}
