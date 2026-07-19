/* ==========================================================================
   GAME-STATE.JS - LOGIC ĐIỀU HÀNH GAME, CÁC BƯỚC SPA VIEW RENDERER
   ========================================================================== */

// 1. TRẠNG THÁI KHỞI TẠO CỦA BIỂU MẪU TẠO VÁN CHƠI (SETUP NHÁP)
let setupDraft = {
    step: 1,
    title: "Đêm Hội Vui Vẻ",
    mode: "normal",
    playerCount: 2,
    playMode: "turn",
    players: [
        { name: "My Lan", color: PLAYER_COLORS[0].main },
        { name: "Phuc Bang", color: PLAYER_COLORS[1].main }
    ],
    boxesPerPlayer: 6,
    activeBoxesPerPlayer: 6,
    distMode: "random",
    themePreset: "friend",
    requireAll: true,
    showNumbers: true
};

// 2. RENDER TRANG CHỦ (HOME VIEW)
function renderHomeView() {
    const resumeContainer = document.getElementById("resume-game-container");
    if (!resumeContainer) return;

    // Tìm ván chơi chưa kết thúc trong danh sách
    const games = appData.games;
    const activeGame = games.find(g => g.status === "playing" || g.status === "paused" || g.status === "preparing");

    if (activeGame) {
        const playableBoxes = activeGame.boxes.filter(b => b.isPlayable !== false);
        const openedPlayableBoxes = playableBoxes.filter(b => b.isOpened).length;
        resumeContainer.innerHTML = `
            <div class="resume-game-preview-card" onclick="resumeGame('${activeGame.id}')">
                <h4><i class="fa-solid fa-circle-play animate-float"></i> Tiếp tục ván “${activeGame.title}”</h4>
                <div class="resume-game-info">
                    <p><strong>Chế độ:</strong> ${activeGame.mode === GAME_MODES.SECRET ? "Tìm câu nói bí mật" : "Túi mù thông thường"}</p>
                    <p><strong>Trạng thái:</strong> ${getGamePhaseText(activeGame.phase)}</p>
                    <p><strong>Đã mở:</strong> ${openedPlayableBoxes}/${playableBoxes.length} túi có nội dung (${playableBoxes.length ? Math.round((openedPlayableBoxes / playableBoxes.length) * 100) : 0}%)</p>
                </div>
            </div>
        `;
    } else {
        resumeContainer.innerHTML = `
            <div class="resume-game-preview-card" style="opacity: 0.6; cursor: not-allowed; border-color: var(--border);">
                <h4><i class="fa-solid fa-circle-minus"></i> Chưa có ván đang chơi</h4>
                <div class="resume-game-info">
                    <p>Nhấn "Tạo ván chơi mới" để bắt đầu.</p>
                </div>
            </div>
        `;
    }
}

// Chuyển phase game thành text tiếng Việt
function getGamePhaseText(phase) {
    switch (phase) {
        case "input-intro":
        case "player-input":
            return "Đang nhập nội dung";
        case "privacy-screen":
            return "Đang chuyển giao thiết bị";
        case "ready-to-play":
            return "Sẵn sàng khui túi mù";
        case "opening":
        case "turn-transition":
            return "Đang khui túi mù";
        case "result":
            return "Đã kết thúc";
        default:
            return "Chuẩn bị";
    }
}

// Tiếp tục chơi game được chọn
function resumeGame(gameId) {
    const game = selectGameToPlay(gameId);
    if (game) {
        playSound('lock');
        restoreGamePhaseRoute(game);
    }
}
window.resumeGame = resumeGame;

// 3. RENDER MÀN HÌNH TẠO VÁN CHƠI THEO BƯỚC (CREATE VIEW)
function renderCreateGameView() {
    showSetupStep(setupDraft.step);
    updateStepProgressUI();
}

function showSetupStep(stepNum) {
    setupDraft.step = stepNum;
    
    // Ẩn tất cả các bước content
    const stepContents = document.querySelectorAll(".setup-step-content");
    stepContents.forEach(c => c.classList.remove("active"));

    // Hiển thị bước tương ứng
    const targetContent = document.getElementById(`setup-step-${stepNum}`);
    if (targetContent) {
        targetContent.classList.add("active");
    }

    // Độc quyền vẽ dữ liệu động theo bước
    if (stepNum === 1) {
        // Đồng bộ card chế độ chơi
        const cardNormal = document.getElementById("create-mode-normal");
        const cardSecret = document.getElementById("create-mode-secret");
        if (setupDraft.mode === "normal") {
            cardNormal.classList.add("active");
            cardSecret.classList.remove("active");
        } else {
            cardNormal.classList.remove("active");
            cardSecret.classList.add("active");
        }
    } 
    else if (stepNum === 2) {
        // Thiết lập người chơi
        const container = document.getElementById("create-players-container");
        let html = '';
        
        // Khóa số người chơi ở mức 2 khi chọn Tìm câu bí mật
        const pCount = setupDraft.mode === GAME_MODES.SECRET ? 2 : setupDraft.playerCount;
        setupDraft.playerCount = pCount;

        // Tạo mảng người chơi nháp nếu chưa đủ
        while (setupDraft.players.length < pCount) {
            const idx = setupDraft.players.length;
            const names = ["My Lan", "Phuc Bang", "Vy", "Bảo"];
            setupDraft.players.push({
                name: names[idx] || `Người chơi ${idx + 1}`,
                color: PLAYER_COLORS[idx].main
            });
        }
        // Trim mảng nếu thừa
        setupDraft.players = setupDraft.players.slice(0, pCount);

        for (let i = 0; i < pCount; i++) {
            html += `
                <div class="player-name-input-group" style="border-color: ${PLAYER_COLORS[i].border}; background: ${PLAYER_COLORS[i].soft}22; margin-bottom: 12px;">
                    <label style="color: ${PLAYER_COLORS[i].main}">
                        <span class="color-dot" style="background: ${PLAYER_COLORS[i].main}"></span> Người chơi ${i + 1}
                    </label>
                    <input type="text" id="create-pname-${i}" value="${setupDraft.players[i].name}" oninput="updateDraftPlayerName(${i}, this.value)" placeholder="Nhập tên người chơi">
                </div>
            `;
        }
        container.innerHTML = html;
        
        // Ẩn/Hiện dòng chọn số người chơi ở chế độ Tìm câu nói
        const createPlayerCountSelect = document.getElementById("create-player-count-select-row");
        const infoSecret = document.getElementById("create-info-secret-player");
        if (setupDraft.mode === GAME_MODES.SECRET) {
            createPlayerCountSelect.classList.add("hidden");
            infoSecret.classList.remove("hidden");
        } else {
            createPlayerCountSelect.classList.remove("hidden");
            infoSecret.classList.add("hidden");
        }
    } 
    else if (stepNum === 3) {
        setupDraft.activeBoxesPerPlayer = Math.min(
            setupDraft.activeBoxesPerPlayer,
            setupDraft.boxesPerPlayer
        );

        const activeBoxesRow = document.getElementById("create-active-boxes-row");
        const activeBoxesInput = document.getElementById("create-active-boxes-per-player");
        activeBoxesRow.classList.toggle("hidden", setupDraft.mode === GAME_MODES.SECRET);
        activeBoxesInput.max = setupDraft.boxesPerPlayer;
        activeBoxesInput.value = setupDraft.activeBoxesPerPlayer;

        // Thiết lập ô và Preview
        const previewContainer = document.getElementById("create-grid-preview");
        if (previewContainer) {
            let cellsHtml = '';
            const columns = Math.ceil(setupDraft.boxesPerPlayer / 3);
            
            // Vẽ preview 3 hàng dọc
            for (let r = 0; r < 3; r++) {
                cellsHtml += '<div style="display: flex; gap: 8px;">';
                for (let c = 0; c < columns; c++) {
                    const idx = c * 3 + r + 1;
                    if (idx <= setupDraft.boxesPerPlayer) {
                        // Đây chỉ là các vị trí có thể chọn; không đánh dấu sẵn
                        // N ô đầu tiên vì từng người sẽ tự chọn ở bước nhập.
                        const isActive = true;
                        cellsHtml += `<div style="width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid ${isActive ? 'var(--primary)' : 'var(--border)'}; background: ${isActive ? 'var(--primary-soft)' : 'var(--background-secondary)'}; color: ${isActive ? 'var(--primary)' : 'var(--text-muted)'}; opacity: ${isActive ? '1' : '0.4'}; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800;">${idx}</div>`;
                    } else {
                        // Ô trống giữ dáng
                        cellsHtml += `<div style="width: 32px; height: 32px; opacity: 0;"></div>`;
                    }
                }
                cellsHtml += '</div>';
            }
            previewContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: center; margin-top: 15px;">
                    <p style="font-size: 0.8rem; color: var(--text-secondary); font-weight:700;">Xem trước các vị trí có thể tự chọn:</p>
                    ${cellsHtml}
                </div>
            `;
        }

        // Cập nhật text thống kê
        const total = setupDraft.boxesPerPlayer * setupDraft.playerCount;
        document.getElementById("create-total-cells-text").textContent = total;
        document.getElementById("create-cells-per-player-text").textContent = setupDraft.boxesPerPlayer;
        document.getElementById("create-active-cells-text").textContent = setupDraft.mode === GAME_MODES.SECRET
            ? setupDraft.boxesPerPlayer
            : setupDraft.activeBoxesPerPlayer;
        
        // Ẩn/Hiện cấu hình theme gợi ý khi Tìm câu
        const createThemeSelectRow = document.getElementById("create-theme-select-row");
        if (setupDraft.mode === GAME_MODES.SECRET) {
            createThemeSelectRow.classList.add("hidden");
        } else {
            createThemeSelectRow.classList.remove("hidden");
        }
    } 
    else if (stepNum === 4) {
        // Tóm tắt và Xác nhận
        const summaryContainer = document.getElementById("create-summary-details");
        const playersList = setupDraft.players.map(p => `<strong>${p.name}</strong>`).join(" và ");
        summaryContainer.innerHTML = `
            <div style="text-align: left; line-height: 1.6; font-size: 0.9rem;">
                <p><i class="fa-solid fa-gamepad" style="color: var(--primary)"></i> <strong>Chế độ chơi:</strong> ${setupDraft.mode === GAME_MODES.SECRET ? "Tìm câu nói bí mật" : "Túi mù thông thường"}</p>
                <p><i class="fa-solid fa-users" style="color: var(--primary)"></i> <strong>Người chơi:</strong> ${playersList}</p>
                <p><i class="fa-solid fa-boxes-stacked" style="color: var(--primary)"></i> <strong>Cấu hình ô:</strong> Mỗi người có ${setupDraft.boxesPerPlayer} ô (Tổng cộng ${setupDraft.boxesPerPlayer * setupDraft.playerCount} ô trên bàn cờ)</p>
                ${setupDraft.mode === GAME_MODES.NORMAL ? `<p><i class="fa-solid fa-pen-to-square" style="color: var(--primary)"></i> <strong>Túi có câu nói:</strong> ${setupDraft.activeBoxesPerPlayer} túi/người (${setupDraft.activeBoxesPerPlayer * setupDraft.playerCount} túi được mở trong ván)</p>` : ''}
                <p><i class="fa-solid fa-shuffle" style="color: var(--primary)"></i> <strong>Phân phối:</strong> ${setupDraft.distMode === "random" ? "Chia đều ngẫu nhiên" : "Chia theo khu vực"}</p>
            </div>
        `;
    }
}

// Hàm đổi mode nháp
window.selectDraftMode = function(mode) {
    playSound('pop');
    setupDraft.mode = mode;
    showSetupStep(1);
};

window.updateDraftPlayerName = function(index, val) {
    setupDraft.players[index].name = val.trim();
};

window.changeDraftPlayerCount = function(val) {
    setupDraft.playerCount = parseInt(val);
    // Vẽ lại step 2
    if (setupDraft.step === 2) {
        showSetupStep(2);
    }
};

window.changeDraftBoxes = function(val) {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 1 && num <= 12) {
        setupDraft.boxesPerPlayer = num;
        setupDraft.activeBoxesPerPlayer = Math.min(setupDraft.activeBoxesPerPlayer, num);
        showSetupStep(3);
    }
};

window.selectQuickBoxes = function(val) {
    playSound('pop');
    setupDraft.boxesPerPlayer = val;
    setupDraft.activeBoxesPerPlayer = Math.min(setupDraft.activeBoxesPerPlayer, val);
    document.getElementById("create-boxes-per-player").value = val;
    showSetupStep(3);
};

window.changeDraftActiveBoxes = function(val) {
    const num = parseInt(val, 10);
    if (!Number.isNaN(num)) {
        setupDraft.activeBoxesPerPlayer = Math.max(1, Math.min(num, setupDraft.boxesPerPlayer));
        showSetupStep(3);
    }
};

window.changeDraftDistMode = function(val) {
    setupDraft.distMode = val;
};

window.changeDraftTheme = function(val) {
    setupDraft.themePreset = val;
};

// Next & Prev step
window.nextSetupStep = function() {
    if (setupDraft.step === 1) {
        showSetupStep(2);
    } else if (setupDraft.step === 2) {
        // Validate tên người chơi không rỗng và không trùng
        const names = setupDraft.players.map(p => p.name.trim());
        if (names.some(n => !n)) {
            playSound('error');
            showToast("Vui lòng điền đủ tên người chơi!");
            return;
        }
        // Kiểm tra trùng lặp
        if (new Set(names.map(n => n.toLowerCase())).size !== names.length) {
            playSound('error');
            showToast("Tên người chơi không được trùng nhau!");
            return;
        }
        showSetupStep(3);
    } else if (setupDraft.step === 3) {
        showSetupStep(4);
    } else if (setupDraft.step === 4) {
        confirmCreateNewGame();
    }
    updateStepProgressUI();
};

window.prevSetupStep = function() {
    if (setupDraft.step > 1) {
        showSetupStep(setupDraft.step - 1);
        updateStepProgressUI();
    } else {
        navigateTo(APP_ROUTES.HOME);
    }
};

function updateStepProgressUI() {
    const dots = document.querySelectorAll(".setup-step-dot");
    dots.forEach((dot, idx) => {
        const stepNum = idx + 1;
        dot.className = "setup-step-dot";
        if (stepNum < setupDraft.step) {
            dot.classList.add("completed");
            dot.innerHTML = '<i class="fa-solid fa-check"></i>';
        } else if (stepNum === setupDraft.step) {
            dot.classList.add("active");
            dot.textContent = stepNum;
        } else {
            dot.textContent = stepNum;
        }
    });
}

// Bắt đầu tạo ván thực sự
function confirmCreateNewGame() {
    playSound('lock');
    setLoadingState(true, "Đang khởi tạo ván chơi mới...");
    
    setTimeout(() => {
        // Ánh xạ player
        const finalPlayers = setupDraft.players.map((p, i) => ({
            id: i,
            name: p.name,
            colorClass: `p${i + 1}`,
            colorValue: PLAYER_COLORS[i].main,
            openedCount: 0,
            secretSentence: "",
            secretBoxId: null,
            hasLockedSecret: false,
            activeBoxCount: setupDraft.activeBoxesPerPlayer,
            selectedNormalBoxIds: []
        }));

        // Settings ván
        const gameSettings = {
            gameMode: setupDraft.mode,
            // Giao diện hiện tại không còn select create-play-mode; dùng giá trị
            // đã được quản lý trong setupDraft để tránh truy cập phần tử null.
            turnMode: setupDraft.mode === GAME_MODES.SECRET ? "turn" : setupDraft.playMode,
            requireAllBoxesFilled: setupDraft.mode === GAME_MODES.SECRET ? true : setupDraft.requireAll,
            showBoxNumbers: setupDraft.showNumbers,
            soundEnabled: appData.settings.soundEnabled,
            confettiEnabled: appData.settings.effectsEnabled
        };

        // Lưu vào Storage
        const newGame = createNewGameData(
            setupDraft.title,
            setupDraft.mode,
            finalPlayers,
            setupDraft.boxesPerPlayer,
            setupDraft.distMode,
            setupDraft.themePreset,
            gameSettings
        );
        newGame.activeBoxesPerPlayer = setupDraft.mode === GAME_MODES.SECRET
            ? setupDraft.boxesPerPlayer
            : setupDraft.activeBoxesPerPlayer;

        // Khởi tạo các ô
        distributeBoxesForGame(newGame);
        
        setLoadingState(false);
        // Chuyển sang phòng chờ
        navigateTo(APP_ROUTES.LOBBY);
    }, 800);
}

function distributeBoxesForGame(game) {
    const total = game.totalCells;
    const numPlayers = game.players.length;
    const perPlayer = game.boxesPerPlayer;
    let owners = [];

    const distMode = game.mode === GAME_MODES.SECRET ? 'area' : game.distMode;

    if (distMode === 'random') {
        for (let p = 0; p < numPlayers; p++) {
            for (let c = 0; c < perPlayer; c++) owners.push(p);
        }
        for (let i = owners.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [owners[i], owners[j]] = [owners[j], owners[i]];
        }
    } 
    else if (distMode === 'area') {
        for (let p = 0; p < numPlayers; p++) {
            for (let c = 0; c < perPlayer; c++) owners.push(p);
        }
    } 
    else if (distMode === 'alternate') {
        for (let i = 0; i < total; i++) {
            owners.push(i % numPlayers);
        }
    }

    game.boxes = [];
    const ownerBoxCounts = new Array(numPlayers).fill(0);
    for (let i = 0; i < total; i++) {
        const ownerId = owners[i];
        const localBoxIndex = ownerBoxCounts[ownerId]++;
        game.boxes.push({
            id: `player-${owners[i]}-box-${i}`,
            index: i,
            ownerId: ownerId,
            encryptedContent: '',
            contentType: 'question',
            isOpened: false,
            openedByPlayerId: null,
            openedAt: null,
            isSecretBox: false,
            // Ở chế độ thường, từng người sẽ tự chọn vị trí khi nhập nội dung.
            isPlayable: game.mode === GAME_MODES.SECRET
        });
    }
    saveAppData();
}

// 4. RENDER PHÒNG CHỜ VÁN CHƠI (LOBBY VIEW)
function renderLobbyView() {
    const game = getCurrentGame();
    if (!game) {
        navigateTo(APP_ROUTES.HOME);
        return;
    }

    document.getElementById("lobby-game-title").textContent = game.title;
    document.getElementById("lobby-game-mode").textContent = game.mode === GAME_MODES.SECRET ? "Tìm câu nói bí mật" : "Túi mù thông thường";
    const activeCount = game.mode === GAME_MODES.SECRET
        ? game.boxesPerPlayer
        : (game.activeBoxesPerPlayer || game.boxesPerPlayer);
    document.getElementById("lobby-boxes-count").textContent = `${game.boxesPerPlayer} ô/người, ${activeCount} túi có nội dung/người`;
    
    let html = '';
    game.players.forEach(p => {
        html += `<li><span class="color-dot" style="background: ${p.colorValue}"></span> <strong>${p.name}</strong></li>`;
    });
    document.getElementById("lobby-players-list").innerHTML = html;
}

window.startInputFlowFromLobby = function() {
    const game = getCurrentGame();
    if (game) {
        game.status = "playing";
        game.phase = "input-intro";
        game.currentInputPlayerIndex = 0;
        updateCurrentGame(game);
        navigateTo(APP_ROUTES.INPUT);
    }
};

window.abortLobbyToSetup = function() {
    if (confirm("Hủy phòng chờ ván chơi này? Thiết lập vừa tạo sẽ bị xóa hoàn toàn.")) {
        const game = getCurrentGame();
        if (game) {
            deleteGameById(game.id);
        }
        navigateTo(APP_ROUTES.HOME);
    }
};

// 5. RENDER NHẬP NỘI DUNG VIEW
function renderInputView() {
    const game = getCurrentGame();
    if (!game) {
        navigateTo(APP_ROUTES.HOME);
        return;
    }

    // 1. Phân phối hiển thị Phase Input Intro / Player Input
    if (game.phase === "input-intro") {
        document.getElementById("input-intro-subview").classList.remove("hidden");
        document.getElementById("player-input-subview").classList.add("hidden");
        
        const player = game.players[game.currentInputPlayerIndex];
        document.getElementById("intro-player-title").textContent = `Lượt tạo túi mù của ${player.name}`;
        document.getElementById("intro-player-name-warn").textContent = player.name;
        
        // Đặt màu pastel của icon intro
        document.querySelector('.intro-icon').style.color = player.colorValue;

        if (game.mode === GAME_MODES.SECRET) {
            document.getElementById("intro-desc-text").innerHTML = `Bạn sẽ nhập <strong>1 câu nói bí mật duy nhất</strong> và giấu nó vào một ô bất kỳ trong khu vực của mình.`;
            document.getElementById("intro-privacy-warning-box").querySelector('span').innerHTML = `Hãy chắc chắn đối phương không nhìn lén khi bạn chọn ô giấu câu nói!`;
        } else {
            const activeCount = player.activeBoxCount || game.activeBoxesPerPlayer || game.boxesPerPlayer;
            document.getElementById("intro-desc-text").innerHTML = `Bạn có thể chọn số lượng túi muốn dùng (mặc định <strong>${activeCount}</strong>), sau đó tự chọn vị trí bất kỳ để nhập nội dung.`;
            document.getElementById("intro-privacy-warning-box").querySelector('span').innerHTML = `Hãy chắc chắn rằng chỉ có <strong>${player.name}</strong> đang nhìn màn hình.`;
        }

        // Xóa hoàn toàn các ô viết cũ khỏi DOM để bảo mật
        document.getElementById("player-input-fields").innerHTML = '';
        document.getElementById("secret-picker-grid").innerHTML = '';
    } 
    else if (game.phase === "player-input") {
        document.getElementById("input-intro-subview").classList.add("hidden");
        document.getElementById("player-input-subview").classList.remove("hidden");

        const playerIndex = game.currentInputPlayerIndex;
        const player = game.players[playerIndex];

        const badge = document.getElementById("player-input-badge");
        badge.className = `badge p${playerIndex + 1}`;
        badge.style.background = player.colorValue;
        badge.textContent = player.name;

        const isSecretMode = game.mode === GAME_MODES.SECRET;

        // Reset dữ liệu vẽ nháp
        document.getElementById("player-input-fields").innerHTML = '';
        document.getElementById("secret-picker-grid").innerHTML = '';

        if (isSecretMode) {
            document.getElementById("player-input-title").textContent = `${player.name} hãy viết câu bí mật`;
            document.getElementById("input-progress-section").classList.add("hidden");
            document.getElementById("player-input-fields").classList.add("hidden");
            document.getElementById("secret-input-container").classList.remove("hidden");

            // Tải lại câu nói cũ
            const savedText = player.secretSentence ? decryptContent(player.secretSentence) : '';
            const tempText = game.temporaryInputs['secret_' + player.id] !== undefined 
                ? game.temporaryInputs['secret_' + player.id] 
                : savedText;

            // Textarea và validation phải dùng cùng một nguồn. Khi chơi lại với
            // câu cũ, đưa câu đã lưu vào nháp để người chơi không phải gõ lại.
            if (game.temporaryInputs['secret_' + player.id] === undefined && savedText) {
                game.temporaryInputs['secret_' + player.id] = savedText;
                updateCurrentGame(game);
            }

            const secretTextarea = document.getElementById("secret-sentence-textarea");
            const reuseNotice = document.getElementById("secret-reuse-notice");
            const sentenceLabel = document.getElementById("secret-sentence-label");
            // Nhận diện cả ván đã bấm "Giữ câu nói" trước khi bản sửa này
            // được tải (chưa kịp lưu replayMode).
            const isKeepingSentences = game.replayMode === "keep-sentences" || (
                Boolean(savedText) &&
                player.secretBoxId === null &&
                player.hasLockedSecret === false
            );

            if (isKeepingSentences && game.replayMode !== "keep-sentences") {
                game.replayMode = "keep-sentences";
                updateCurrentGame(game);
            }

            secretTextarea.value = tempText;
            secretTextarea.readOnly = isKeepingSentences;
            secretTextarea.setAttribute(
                "aria-readonly",
                isKeepingSentences ? "true" : "false"
            );
            sentenceLabel.innerHTML = isKeepingSentences
                ? '<i class="fa-solid fa-shield-heart"></i> Câu nói bí mật được giữ nguyên:'
                : '<i class="fa-solid fa-key"></i> Câu nói bí mật duy nhất của bạn:';
            reuseNotice.classList.toggle("hidden", !isKeepingSentences);

            document.getElementById("player-input-title").textContent = isKeepingSentences
                ? `${player.name} hãy chọn vị trí giấu mới`
                : `${player.name} hãy viết câu bí mật`;
            document.getElementById("secret-char-counter").textContent = `${200 - tempText.length} ký tự`;

            // Vẽ picker
            const playerBoxes = game.boxes.filter(b => b.ownerId === player.id);
            let pickerHtml = '';
            playerBoxes.forEach((box, i) => {
                const isSelected = player.secretBoxId === box.id;
                const activeClass = isSelected ? 'selected' : '';
                const pinIcon = isSelected ? '<span class="picker-pin"><i class="fa-solid fa-thumbtack"></i> Đã ghim</span>' : '';
                pickerHtml += `
                    <button class="picker-box ${activeClass}" id="picker-box-${box.index}" onclick="selectSecretBox(${box.index})" style="--primary: ${player.colorValue}; --primary-soft: ${PLAYER_COLORS[playerIndex].soft}">
                        <span style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 2px;">Túi mù</span>
                        <strong>${i + 1}</strong>
                        ${pinIcon}
                    </button>
                `;
            });
            document.getElementById("secret-picker-grid").innerHTML = pickerHtml;

            if (player.secretBoxId !== null) {
                const displayNum = playerBoxes.findIndex(b => b.id === player.secretBoxId) + 1;
                document.getElementById("selected-picker-num").textContent = displayNum;
                document.getElementById("box-picker-announcement").classList.remove("hidden");
            } else {
                document.getElementById("box-picker-announcement").classList.add("hidden");
            }

            validateSecretGameInputs();
        } else {
            document.getElementById("player-input-title").textContent = `${player.name} đang tạo túi mù`;
            document.getElementById("input-progress-section").classList.remove("hidden");
            document.getElementById("player-input-fields").classList.remove("hidden");
            document.getElementById("secret-input-container").classList.add("hidden");

            // Vẽ grid chế độ thường
            const playerBoxes = game.boxes.filter(b => b.ownerId === player.id);
            if (!Number.isInteger(player.activeBoxCount)) {
                player.activeBoxCount = game.activeBoxesPerPlayer || game.boxesPerPlayer;
            }
            player.activeBoxCount = Math.max(1, Math.min(player.activeBoxCount, playerBoxes.length));

            // Tương thích ván được tạo bởi phiên bản trước: giữ các ô đã đánh dấu.
            if (!Array.isArray(player.selectedNormalBoxIds)) {
                player.selectedNormalBoxIds = playerBoxes
                    .filter(box => box.isPlayable !== false)
                    .map(box => box.id);
            }
            const selectedIds = new Set(player.selectedNormalBoxIds);
            playerBoxes.forEach(box => {
                box.isPlayable = selectedIds.has(box.id);
            });

            const countInput = document.getElementById("normal-active-box-count");
            countInput.max = playerBoxes.length;
            countInput.value = player.activeBoxCount;

            let html = '';
            playerBoxes.forEach((box, i) => {
                const temp = game.temporaryInputs[box.index] || { text: '', type: 'question' };
                const isPlayable = box.isPlayable !== false;
                const disabledAttr = isPlayable ? '' : 'disabled';
                html += `
                    <div class="input-box-card ${isPlayable ? '' : 'input-box-disabled'}" data-box-index="${box.index}" style="--player-color: ${player.colorValue}">
                        <div class="input-box-header">
                            <span class="box-number-tag" style="color: ${player.colorValue}"><i class="fa-solid ${isPlayable ? 'fa-circle-check' : 'fa-hand-pointer'}"></i> Túi mù số ${i + 1}</span>
                            <div class="box-actions-row">
                                <button class="btn btn-mini ${isPlayable ? 'btn-primary' : 'btn-secondary'}" onclick="toggleNormalBoxSelection(${box.index})">
                                    <i class="fa-solid ${isPlayable ? 'fa-check' : 'fa-plus'}"></i> ${isPlayable ? 'Đã chọn' : 'Chọn túi'}
                                </button>
                                <button class="btn btn-mini btn-secondary btn-suggest" onclick="suggestRandomContent(${box.index})" ${disabledAttr}>
                                    <i class="fa-solid fa-wand-magic-sparkles"></i> Gợi ý
                                </button>
                                <button class="btn btn-mini btn-danger-light" onclick="clearBoxInput(${box.index})" title="Xóa nội dung" ${disabledAttr}>
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="textarea-wrapper">
                            <textarea id="box-text-${box.index}" 
                                      placeholder="Nhập câu hỏi, thử thách hoặc món quà..." 
                                      maxlength="150" 
                                      ${disabledAttr}
                                      oninput="handleTextInput(${box.index}, this)"
                                      onblur="trimTextInput(${box.index}, this)">${temp.text}</textarea>
                            <div class="char-counter" id="char-counter-${box.index}">${150 - temp.text.length} ký tự</div>
                        </div>
                        
                        <div class="type-select-wrapper">
                            <label for="box-type-${box.index}">Loại:</label>
                            <select id="box-type-${box.index}" onchange="handleTypeInput(${box.index}, this)" ${disabledAttr}>
                                <option value="question" ${temp.type === 'question' ? 'selected' : ''}>Câu hỏi (Truth)</option>
                                <option value="dare" ${temp.type === 'dare' ? 'selected' : ''}>Thử thách (Dare)</option>
                                <option value="gift" ${temp.type === 'gift' ? 'selected' : ''}>Món quà / Ưu tiên</option>
                                <option value="punish" ${temp.type === 'punish' ? 'selected' : ''}>Hình phạt vui</option>
                                <option value="secret" ${temp.type === 'secret' ? 'selected' : ''}>Bí mật ẩn giấu</option>
                            </select>
                        </div>
                    </div>
                `;
            });
            document.getElementById("player-input-fields").innerHTML = html;
            updateCurrentGame(game);
            updateInputProgressBar();
        }
    }
}

// Bấm nút bắt đầu nhập ở phase intro
window.startInputFromIntro = function() {
    const game = getCurrentGame();
    if (game) {
        game.phase = "player-input";
        updateCurrentGame(game);
        renderInputView();
    }
};

// Logic text input
window.handleSecretTextInput = function(textarea) {
    const text = textarea.value;
    document.getElementById("secret-char-counter").textContent = `${200 - text.length} ký tự`;
    const game = getCurrentGame();
    if (game) {
        const player = game.players[game.currentInputPlayerIndex];
        game.temporaryInputs['secret_' + player.id] = text;
        updateCurrentGame(game);
        validateSecretGameInputs();
    }
};

window.trimSecretTextInput = function(textarea) {
    const text = textarea.value.trim();
    textarea.value = text;
    document.getElementById("secret-char-counter").textContent = `${200 - text.length} ký tự`;
    const game = getCurrentGame();
    if (game) {
        const player = game.players[game.currentInputPlayerIndex];
        game.temporaryInputs['secret_' + player.id] = text;
        updateCurrentGame(game);
        validateSecretGameInputs();
    }
};

window.selectSecretBox = function(boxIndex) {
    const game = getCurrentGame();
    if (!game) return;
    const player = game.players[game.currentInputPlayerIndex];
    const box = game.boxes[boxIndex];
    
    playSound('pop');
    player.secretBoxId = box.id;
    updateCurrentGame(game);

    // Vẽ lại nhanh UI ghim
    const pickerBoxes = document.querySelectorAll(".picker-box");
    pickerBoxes.forEach(p => p.classList.remove("selected"));
    const pin = document.getElementById(`picker-box-${boxIndex}`);
    if (pin) {
        pin.classList.add("selected");
    }

    renderInputView(); // Render vẽ lại hoàn chỉnh để có 📌 icon
};

function validateSecretGameInputs() {
    const game = getCurrentGame();
    if (!game) return false;
    const player = game.players[game.currentInputPlayerIndex];
    const text = (game.temporaryInputs['secret_' + player.id] || '').trim();
    const hasBoxSelected = player.secretBoxId !== null;

    const btnLock = document.getElementById("btn-lock-boxes");
    const warning = document.getElementById("input-lock-warning-text");

    if (!text) {
        btnLock.disabled = true;
        warning.textContent = "Vui lòng nhập câu nói bí mật của bạn.";
        warning.classList.remove("hidden");
        return false;
    } else if (!hasBoxSelected) {
        btnLock.disabled = true;
        warning.textContent = "Vui lòng chọn 1 ô trong lưới dưới đây để giấu câu nói.";
        warning.classList.remove("hidden");
        return false;
    } else {
        btnLock.disabled = false;
        warning.classList.add("hidden");
        return true;
    }
}

// Logic cũ chế độ thường
window.handleTextInput = function(boxIndex, textarea) {
    const text = textarea.value;
    const counter = document.getElementById(`char-counter-${boxIndex}`);
    if (counter) counter.textContent = `${150 - text.length} ký tự`;

    const game = getCurrentGame();
    if (game) {
        if (!game.temporaryInputs[boxIndex]) {
            game.temporaryInputs[boxIndex] = { text: '', type: 'question' };
        }
        game.temporaryInputs[boxIndex].text = text;
        updateCurrentGame(game);
        updateInputProgressBar();
    }
};

window.trimTextInput = function(boxIndex, textarea) {
    const text = textarea.value.trim();
    textarea.value = text;
    
    const game = getCurrentGame();
    if (game) {
        if (!game.temporaryInputs[boxIndex]) {
            game.temporaryInputs[boxIndex] = { text: '', type: 'question' };
        }
        game.temporaryInputs[boxIndex].text = text;
        updateCurrentGame(game);
        
        const counter = document.getElementById(`char-counter-${boxIndex}`);
        if (counter) counter.textContent = `${150 - text.length} ký tự`;
        updateInputProgressBar();
    }
};

window.handleTypeInput = function(boxIndex, select) {
    const type = select.value;
    const game = getCurrentGame();
    if (game) {
        if (!game.temporaryInputs[boxIndex]) {
            game.temporaryInputs[boxIndex] = { text: '', type: 'question' };
        }
        game.temporaryInputs[boxIndex].type = type;
        updateCurrentGame(game);
    }
};

window.clearBoxInput = function(boxIndex) {
    const textarea = document.getElementById(`box-text-${boxIndex}`);
    if (textarea) {
        textarea.value = '';
        trimTextInput(boxIndex, textarea);
        playSound('pop');
    }
};

window.changePlayerActiveBoxCount = function(value) {
    const game = getCurrentGame();
    if (!game || game.mode !== GAME_MODES.NORMAL) return;
    const player = game.players[game.currentInputPlayerIndex];
    const playerBoxes = game.boxes.filter(box => box.ownerId === player.id);
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return;

    player.activeBoxCount = Math.max(1, Math.min(parsed, playerBoxes.length));
    const selectedIds = Array.isArray(player.selectedNormalBoxIds)
        ? player.selectedNormalBoxIds
        : [];

    // Nếu giảm số lượng, bỏ chọn các ô dư mới nhất; nội dung nháp vẫn được
    // giữ để người chơi có thể chọn lại mà không phải gõ lại.
    player.selectedNormalBoxIds = selectedIds.slice(0, player.activeBoxCount);
    const selectedSet = new Set(player.selectedNormalBoxIds);
    playerBoxes.forEach(box => {
        box.isPlayable = selectedSet.has(box.id);
    });
    updateCurrentGame(game);
    renderInputView();
};

window.toggleNormalBoxSelection = function(boxIndex) {
    const game = getCurrentGame();
    if (!game || game.mode !== GAME_MODES.NORMAL) return;
    const player = game.players[game.currentInputPlayerIndex];
    const box = game.boxes[boxIndex];
    if (!box || box.ownerId !== player.id) return;

    if (!Array.isArray(player.selectedNormalBoxIds)) {
        player.selectedNormalBoxIds = [];
    }
    const selectedIndex = player.selectedNormalBoxIds.indexOf(box.id);
    if (selectedIndex >= 0) {
        player.selectedNormalBoxIds.splice(selectedIndex, 1);
        box.isPlayable = false;
    } else {
        if (player.selectedNormalBoxIds.length >= player.activeBoxCount) {
            playSound('error');
            showToast(`Bạn đã chọn đủ ${player.activeBoxCount} túi. Hãy bỏ chọn một túi trước.`);
            return;
        }
        player.selectedNormalBoxIds.push(box.id);
        box.isPlayable = true;
        playSound('pop');
    }
    updateCurrentGame(game);
    renderInputView();
};

window.suggestRandomContent = function(boxIndex) {
    const select = document.getElementById(`box-type-${boxIndex}`);
    const textarea = document.getElementById(`box-text-${boxIndex}`);
    const type = select ? select.value : 'question';
    const game = getCurrentGame();
    if (game) {
        const theme = game.themePreset;
        const suggestions = THEME_SUGGESTIONS[theme] && THEME_SUGGESTIONS[theme][type] 
            ? THEME_SUGGESTIONS[theme][type] 
            : THEME_SUGGESTIONS['friend'][type];

        const randomText = suggestions[Math.floor(Math.random() * suggestions.length)];
        if (textarea) {
            textarea.value = randomText;
            trimTextInput(boxIndex, textarea);
            playSound('lock');
        }
    }
};

function updateInputProgressBar() {
    const game = getCurrentGame();
    if (!game) return;
    const playerIndex = game.currentInputPlayerIndex;
    const player = game.players[playerIndex];
    const playerBoxes = game.boxes.filter(b => b.ownerId === player.id && b.isPlayable !== false);
    const targetTotal = player.activeBoxCount || game.activeBoxesPerPlayer || game.boxesPerPlayer;
    const selectedCount = playerBoxes.length;

    let filledCount = 0;
    playerBoxes.forEach(box => {
        const temp = game.temporaryInputs[box.index];
        if (temp && temp.text.trim().length > 0) {
            filledCount++;
        }
    });

    const total = targetTotal;
    const percent = Math.round((filledCount / total) * 100);

    const progressBar = document.getElementById("input-progress-bar");
    const progressText = document.getElementById("input-progress-text");
    const remainingText = document.getElementById("input-remaining-text");
    const btnLock = document.getElementById("btn-lock-boxes");
    const warning = document.getElementById("input-lock-warning-text");
    const selectionStatus = document.getElementById("normal-box-selection-status");

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `Đã viết: ${filledCount}/${total} ô (${percent}%)`;
    if (remainingText) remainingText.textContent = `Chưa điền: ${total - filledCount} ô`;
    if (selectionStatus) {
        selectionStatus.innerHTML = selectedCount === total
            ? `<i class="fa-solid fa-circle-check" style="color:var(--success)"></i> Đã chọn đủ <strong>${selectedCount}/${total}</strong> vị trí. Hãy nhập nội dung.`
            : `Đã chọn <strong>${selectedCount}/${total}</strong> vị trí. Bấm “Chọn túi” ở các ô bên dưới.`;
    }

    if (selectedCount < total) {
        btnLock.disabled = true;
        warning.textContent = `Bạn cần chọn thêm ${total - selectedCount} vị trí túi mù.`;
        warning.classList.remove("hidden");
        return;
    }

    if (game.settings.requireAllBoxesFilled) {
        if (filledCount < total) {
            btnLock.disabled = true;
            warning.textContent = `Bạn còn ${total - filledCount} túi mù chưa nhập nội dung.`;
            warning.classList.remove("hidden");
        } else {
            btnLock.disabled = false;
            warning.classList.add("hidden");
        }
    } else {
        btnLock.disabled = false;
        if (filledCount < total) {
            warning.textContent = `Lưu ý: Bạn còn ${total - filledCount} ô trống sẽ nhận nội dung mặc định.`;
            warning.classList.remove("hidden");
        } else {
            warning.classList.add("hidden");
        }
    }
}

// Gọi Modal xác nhận khóa nội dung
function requestLockPlayerBoxes() {
    const game = getCurrentGame();
    if (!game) return;
    const player = game.players[game.currentInputPlayerIndex];
    
    lastFocusedElement = document.activeElement;

    if (game.settings.gameMode === GAME_MODES.SECRET) {
        if (!validateSecretGameInputs()) {
            playSound('error');
            showToast("Vui lòng nhập câu nói và ghim chọn ô giấu!");
            return;
        }

        const playerBoxes = game.boxes.filter(b => b.ownerId === player.id && b.isPlayable !== false);
        const displayNum = playerBoxes.findIndex(b => b.id === player.secretBoxId) + 1;

        DOM.confirmLockTitle.textContent = "Xác nhận giấu câu nói?";
        const keepMessage = game.replayMode === "keep-sentences"
            ? "Câu nói cũ được giữ nguyên và chỉ vị trí giấu được thay đổi."
            : "Sau khi khóa, bạn không thể chỉnh sửa câu nói hoặc đổi vị trí.";
        DOM.confirmLockBodyText.innerHTML = `Câu nói của bạn sẽ được giấu trong <strong>túi mù số ${displayNum}</strong>.<br><br>${keepMessage}`;
        DOM.confirmLockStatsBox.classList.add('hidden');
        
        DOM.confirmLockModal.classList.add('active');
        DOM.btnConfirmLockYes.focus();
        playSound('lock');
    } else {
        const playerBoxes = game.boxes.filter(b => b.ownerId === player.id && b.isPlayable !== false);
        const requiredBoxCount = player.activeBoxCount || game.activeBoxesPerPlayer || game.boxesPerPlayer;
        if (playerBoxes.length !== requiredBoxCount) {
            playSound('error');
            showToast(`Hãy chọn đủ ${requiredBoxCount} vị trí túi mù trước khi khóa!`);
            updateInputProgressBar();
            return;
        }
        let filledCount = 0;
        let firstEmptyBoxIndex = -1;
        
        playerBoxes.forEach(box => {
            const temp = game.temporaryInputs[box.index];
            if (temp && temp.text.trim().length > 0) {
                filledCount++;
            } else if (firstEmptyBoxIndex === -1) {
                firstEmptyBoxIndex = box.index;
            }
        });

        const total = playerBoxes.length;

        if (game.settings.requireAllBoxesFilled && filledCount < total) {
            playSound('error');
            showToast("Bạn cần điền đủ nội dung tất cả các ô!");
            if (firstEmptyBoxIndex !== -1) {
                const textarea = document.getElementById(`box-text-${firstEmptyBoxIndex}`);
                if (textarea) textarea.focus();
            }
            return;
        }

        DOM.confirmLockTitle.textContent = "Xác nhận khóa túi mù?";
        DOM.confirmLockBodyText.innerHTML = `Sau khi khóa, bạn sẽ **không thể xem hoặc chỉnh sửa** lại nội dung trong suốt lượt chơi này.`;
        DOM.confirmLockStatsBox.classList.remove('hidden');
        DOM.confirmLockStats.textContent = `${filledCount}/${total}`;
        
        DOM.confirmLockModal.classList.add('active');
        DOM.btnConfirmLockYes.focus();
        playSound('lock');
    }
}

function confirmLockPlayerBoxes() {
    DOM.confirmLockModal.classList.remove('active');
    
    const game = getCurrentGame();
    if (!game) return;
    const playerIndex = game.currentInputPlayerIndex;
    const player = game.players[playerIndex];
    const playerBoxes = game.boxes.filter(b => b.ownerId === player.id);

    if (game.settings.gameMode === GAME_MODES.SECRET) {
        const secretText = (game.temporaryInputs['secret_' + player.id] || '').trim();
        player.secretSentence = encryptContent(secretText);
        player.hasLockedSecret = true;

        playerBoxes.forEach(box => {
            if (box.id === player.secretBoxId) {
                box.isSecretBox = true;
                box.encryptedContent = player.secretSentence;
                box.contentType = 'secret';
            } else {
                box.isSecretBox = false;
                box.encryptedContent = encryptContent("Túi mù này trống!");
                box.contentType = 'question';
            }
        });

        // Bảo mật: Xóa nháp text
        document.getElementById("secret-sentence-textarea").value = '';
        delete game.temporaryInputs['secret_' + player.id];
    } else {
        playerBoxes.forEach(box => {
            if (box.isPlayable === false) {
                box.encryptedContent = '';
                return;
            }
            const temp = game.temporaryInputs[box.index];
            let content = temp ? temp.text.trim() : '';
            if (!content) {
                content = DEFAULT_FALLBACK_CONTENT[temp ? temp.type : 'question'] || "Túi mù này không có nội dung.";
            }
            box.encryptedContent = encryptContent(content);
            box.contentType = temp ? temp.type : 'question';
            
            // Bảo mật: Xóa nháp text của ô
            if (game.temporaryInputs[box.index]) {
                delete game.temporaryInputs[box.index];
            }
        });

        document.getElementById("player-input-fields").innerHTML = '';
    }

    // Chuyển sang Privacy Screen
    game.phase = "privacy-screen";
    updateCurrentGame(game);
    navigateTo(APP_ROUTES.PRIVACY);
}

// 6. RENDER MÀN HÌNH CHUYỂN THIẾT BỊ (PRIVACY VIEW)
function renderPrivacyView() {
    const game = getCurrentGame();
    if (!game) {
        navigateTo(APP_ROUTES.HOME);
        return;
    }

    const player = game.players[game.currentInputPlayerIndex];
    const nextPlayerIndex = game.currentInputPlayerIndex + 1;

    DOM.privacyLockedTitle.textContent = `Nội dung của ${player.name} đã được khóa!`;
    DOM.btnNextPlayer.disabled = true;

    // Khoảng trễ bảo vệ nhấn nhầm
    setTimeout(() => {
        DOM.btnNextPlayer.disabled = false;
    }, 1000);

    const isSecretMode = game.mode === GAME_MODES.SECRET;

    if (nextPlayerIndex < game.players.length) {
        const nextPlayer = game.players[nextPlayerIndex];
        DOM.privacyMsgInstruction.textContent = isSecretMode 
            ? "Hãy chuyển thiết bị cho đối phương. Tuyệt đối không để đối phương xem vị trí ô giấu!" 
            : "Vui lòng chuyển thiết bị cho người tiếp theo.";
        DOM.nextPlayerName.textContent = nextPlayer.name;
        DOM.btnNextPlayerName.textContent = nextPlayer.name;
        DOM.btnNextPlayer.innerHTML = `<i class="fa-solid fa-user-check"></i> Tôi là <strong>${nextPlayer.name}</strong>, tiếp tục`;
        game.pendingNextPhase = "input-intro";
    } else {
        DOM.privacyMsgInstruction.textContent = "Mọi câu nói bí ẩn đã được giấu an toàn.";
        DOM.nextPlayerName.textContent = "Giai đoạn chơi";
        DOM.btnNextPlayerName.textContent = "Tiếp theo";
        DOM.btnNextPlayer.innerHTML = `<i class="fa-solid fa-circle-right"></i> Hoàn thành thiết lập`;
        game.pendingNextPhase = "ready-to-play";
    }
    updateCurrentGame(game);
}

window.moveToNextInputPlayer = function() {
    const game = getCurrentGame();
    if (!game) return;

    if (game.pendingNextPhase === "input-intro") {
        game.currentInputPlayerIndex++;
        game.phase = "input-intro";
        updateCurrentGame(game);
        navigateTo(APP_ROUTES.INPUT);
    } else if (game.pendingNextPhase === "ready-to-play") {
        game.phase = "ready-to-play";
        updateCurrentGame(game);
        navigateTo(APP_ROUTES.READY);
    }
    playSound('lock');
};

// 7. RENDER MÀN HÌNH SẴN SÀNG CHƠI (READY VIEW)
function renderReadyView() {
    const game = getCurrentGame();
    if (!game) {
        navigateTo(APP_ROUTES.HOME);
        return;
    }

    const isSecretMode = game.mode === GAME_MODES.SECRET;

    // Chọn ngẫu nhiên đúng một lần và lưu lại để màn hình sẵn sàng cùng bàn
    // chơi luôn thống nhất về người đi đầu.
    if (!Number.isInteger(game.firstPlayerIndex) ||
        game.firstPlayerIndex < 0 ||
        game.firstPlayerIndex >= game.players.length) {
        game.firstPlayerIndex = getRandomPlayerIndex(game);
        updateCurrentGame(game);
    }

    let summaryHtml = '';
    game.players.forEach(p => {
        summaryHtml += `<p><span class="color-dot" style="background: ${p.colorValue}"></span> <strong>${p.name}</strong> đã giấu ${isSecretMode ? '1 câu nói bí mật' : (game.activeBoxesPerPlayer || game.boxesPerPlayer) + ' túi có nội dung'}.</p>`;
    });
    DOM.readyPlayersSummary.innerHTML = summaryHtml;

    let rulesHtml = '';
    game.players.forEach((p, index) => {
        const others = game.players.filter(o => o.id !== p.id).map(o => o.name).join(' hoặc ');
        rulesHtml += `<li><strong>${p.name}</strong> chỉ được mở túi mù của <strong>${others}</strong>.</li>`;
    });
    rulesHtml += `<li><strong>Không được tự mở</strong> túi mù của chính mình.</li>`;
    
    if (isSecretMode) {
        rulesHtml += `<li><strong>Ai tìm thấy câu nói bí mật của đối phương trước sẽ chiến thắng ngay lập tức!</strong></li>`;
    } else {
        if (game.settings.turnMode === 'turn') {
            rulesHtml += `<li><strong>Chế độ:</strong> Mỗi người chỉ được mở 1 túi mù mỗi lượt.</li>`;
        } else {
            rulesHtml += `<li><strong>Chế độ:</strong> Mở tự do thoải mái (không giới hạn số ô mỗi lượt).</li>`;
        }
    }
    DOM.readyRulesList.innerHTML = rulesHtml;

    const firstPlayer = game.players[game.firstPlayerIndex];
    DOM.readyFirstPlayer.textContent = firstPlayer.name;
    DOM.readyFirstPlayer.style.color = firstPlayer.colorValue;

    const btnStartPlay = document.getElementById("btn-start-play-flow");
    if (btnStartPlay) {
        btnStartPlay.innerHTML = isSecretMode 
            ? `<i class="fa-solid fa-search"></i> Bắt đầu tìm kiếm` 
            : `<i class="fa-solid fa-gamepad"></i> Bắt đầu khui túi mù`;
    }
}

window.startOpeningPhaseFromReady = function() {
    const game = getCurrentGame();
    if (game) {
        game.phase = "opening";
        game.currentTurnPlayerIndex = Number.isInteger(game.firstPlayerIndex)
            ? game.firstPlayerIndex
            : getRandomPlayerIndex(game);
        game.startTime = new Date().toISOString();
        updateCurrentGame(game);
        navigateTo(APP_ROUTES.GAME);
    }
};

// 8. RENDER BÀN CHƠI KHUI Ô & KẾT QUẢ (GAME VIEW)
function renderGamePlayView() {
    const game = getCurrentGame();
    if (!game) {
        navigateTo(APP_ROUTES.HOME);
        return;
    }

    // Phục hồi các ván đã được phiên bản cũ lưu dở ở màn chuyển lượt không
    // tồn tại. Chuyển ngay sang người kế tiếp để ván hiện tại tiếp tục được.
    if (game.phase === "turn-transition" && Number.isInteger(game.pendingNextPhase)) {
        game.currentTurnPlayerIndex = game.pendingNextPhase;
        game.turnNumber++;
        game.phase = "opening";
        delete game.pendingNextPhase;
        isProcessingAction = false;
        updateCurrentGame(game);
    }

    // Phục hồi ván thường đã vượt quá điểm kết thúc ở phiên bản cũ.
    if (game.mode === GAME_MODES.NORMAL && game.phase !== "result" && !game.gameEndedReason) {
        const clearedOwner = game.players.find(player => {
            const contentBoxes = game.boxes.filter(
                box => box.ownerId === player.id && box.isPlayable !== false
            );
            return contentBoxes.length > 0 && contentBoxes.every(box => box.isOpened);
        });
        if (clearedOwner) {
            const lastOpenedBox = game.boxes
                .filter(box => box.ownerId === clearedOwner.id && box.isPlayable !== false && box.isOpened)
                .sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0))[0];
            game.winnerId = lastOpenedBox ? lastOpenedBox.openedByPlayerId : null;
            game.clearedOwnerId = clearedOwner.id;
            game.gameEndedReason = "player-boxes-cleared";
            game.phase = "result";
            game.status = "completed";
            game.completedAt = new Date().toISOString();
            game.endTime = game.completedAt;
            isProcessingAction = false;
            updateCurrentGame(game);
        }
    }

    const isSecretMode = game.mode === GAME_MODES.SECRET;

    // Phân phối hiển thị Phase Bàn chơi hay Phase Kết quả
    const gamePlaySection = document.getElementById("game-play-section");
    const gameResultSection = document.getElementById("game-result-section");

    if (game.phase === "result") {
        gamePlaySection.classList.add("hidden");
        gameResultSection.classList.remove("hidden");
        renderResultSubview(game);
        return;
    }

    // Phase đang khui bài
    gamePlaySection.classList.remove("hidden");
    gameResultSection.classList.add("hidden");

    DOM.boardGameTitle.textContent = game.title;
    DOM.badgePlayMode.textContent = isSecretMode 
        ? "Chế độ: Tìm câu bí mật" 
        : `Chế độ: ${game.settings.turnMode === 'turn' ? 'Lần lượt' : 'Tự do'}`;

    const activePlayer = game.players[game.currentTurnPlayerIndex];
    document.documentElement.style.setProperty('--player-color', activePlayer.colorValue);

    // 1. Chú thích màu sắc
    let legendHtml = '';
    game.players.forEach(p => {
        const isCurrentSelector = (!isSecretMode && game.settings.turnMode === 'free' && activePlayer.id === p.id);
        const activeClass = isCurrentSelector ? 'active-legend' : '';
        
        legendHtml += `
            <div class="legend-item ${activeClass}" style="background: ${p.colorValue}22; border: 1.5px solid ${p.colorValue}; color: ${p.colorValue}" onclick="selectCurrentPlayerFree(${p.id})">
                <span class="color-dot" style="background: ${p.colorValue}"></span>
                <strong>${p.name}</strong> 
                ${(!isSecretMode && game.settings.turnMode === 'free') ? (isCurrentSelector ? ' <i class="fa-solid fa-user-tag"></i>' : '') : ''}
            </div>
        `;
    });
    DOM.playersLegendList.innerHTML = legendHtml;

    // 2. Tiến trình ván chơi
    const playableBoxes = game.boxes.filter(b => b.isPlayable !== false);
    const openedCount = playableBoxes.filter(b => b.isOpened).length;
    const playableTotal = playableBoxes.length;
    game.openedBoxesCount = openedCount;
    const progressPercent = playableTotal > 0 ? Math.round((openedCount / playableTotal) * 100) : 100;
    DOM.boardProgressBar.style.width = `${progressPercent}%`;
    DOM.boardProgressText.textContent = `Đã mở: ${openedCount}/${playableTotal} túi có nội dung (${progressPercent}%)`;
    DOM.boardRemainingText.textContent = `Còn lại: ${playableTotal - openedCount} túi`;

    // 3. Chỉ dẫn lượt khui
    DOM.boardTurnNum.textContent = game.turnNumber;
    DOM.activePlayerAvatar.textContent = activePlayer.name.charAt(0);
    DOM.activePlayerAvatar.style.background = activePlayer.colorValue;
    DOM.turnIndicatorText.innerHTML = `Đến lượt <strong style="color: ${activePlayer.colorValue}">${activePlayer.name}</strong> chơi`;

    if (isSecretMode) {
        const otherPlayer = game.players.find(p => p.id !== activePlayer.id);
        DOM.turnActionDescText.textContent = `Hãy chọn 1 túi mù của ${otherPlayer.name} để tìm câu nói giấu kín.`;
        DOM.btnEndTurn.classList.add('hidden');
    } else {
        DOM.turnActionDescText.textContent = "Hãy chọn một túi mù trong khu vực của người khác để mở.";
        if (game.settings.turnMode === 'free') {
            DOM.btnEndTurn.classList.remove('hidden');
        } else {
            DOM.btnEndTurn.classList.add('hidden');
        }
    }

    resetBoardScrollIndicator();

    // 4. Vẽ bàn chơi phân khu
    DOM.gameGrid.style.setProperty('--player-count', game.players.length);
    let boardHtml = '';
    game.players.forEach((player, playerIndex) => {
        const playerBoxes = game.boxes.filter(b => b.ownerId === player.id);
        const isSelfZone = player.id === activePlayer.id;
        const allBoxesOpened = playerBoxes.filter(b => b.isPlayable !== false).every(b => b.isOpened);
        
        let zoneClass = `player-zone owned-${player.colorClass}`;
        let statusTag = '';
        
        if (allBoxesOpened) {
            zoneClass += ' is-completed';
            statusTag = `<span class="zone-status-tag completed"><i class="fa-solid fa-circle-check"></i> Đã mở hết</span>`;
        } else if (isSelfZone) {
            zoneClass += ' is-locked self-zone';
            statusTag = `<span class="zone-status-tag locked"><i class="fa-solid fa-lock"></i> Khu vực của bạn</span>`;
        } else {
            zoneClass += ' is-active';
            statusTag = isSecretMode 
                ? `<span class="zone-status-tag playable"><i class="fa-solid fa-search"></i> Hãy tìm kiếm</span>`
                : `<span class="zone-status-tag playable"><i class="fa-solid fa-sparkles"></i> Có thể chọn</span>`;
        }

        let boxesHtml = '';
        playerBoxes.forEach((box, i) => {
            const isInactive = box.isPlayable === false;
            // Không để lộ túi nào có nội dung: mọi túi chưa mở của đối thủ
            // đều có cùng giao diện và đều có thể được chọn.
            const isDisabled = isSelfZone && !box.isOpened;
            let wrapperClasses = `grid-box-wrapper owned-${player.colorClass} mystery-box`;
            let boxClasses = `grid-box`;
            let tooltip = '';

            if (box.isOpened) {
                boxClasses += ' opened';
            } else if (isDisabled) {
                boxClasses += ' disabled';
                boxClasses += ' is-locked';
                tooltip = isSecretMode 
                    ? `data-tooltip="Khu vực của bạn. Bạn không thể tự mở ô của mình!"`
                    : `data-tooltip="Túi mù của ${player.name}. Bạn không thể mở túi mù của chính mình!"`;
            } else {
                boxClasses += ' is-available';
            }

            const typeIcons = {
                question: 'fa-solid fa-question-circle',
                dare: 'fa-solid fa-bolt',
                gift: 'fa-solid fa-gift',
                punish: 'fa-solid fa-skull-crossbones',
                secret: 'fa-solid fa-key'
            };

            const typeLabels = {
                question: 'Câu hỏi',
                dare: 'Thử thách',
                gift: 'Món quà',
                punish: 'Hình phạt',
                secret: 'Bí mật'
            };

            let typeClass = '';
            let currentIcon = 'fa-solid fa-question';
            let currentLabel = '';

            if (box.isOpened) {
                if (isSecretMode) {
                    if (box.isSecretBox) {
                        typeClass = 'type-secret-found';
                        currentIcon = 'fa-solid fa-trophy';
                        currentLabel = 'Tìm thấy!';
                    } else {
                        typeClass = 'type-empty';
                        currentIcon = 'fa-solid fa-box-open';
                        currentLabel = 'Trống';
                    }
                } else {
                    if (isInactive) {
                        typeClass = 'type-empty';
                        currentIcon = 'fa-solid fa-box-open';
                        currentLabel = 'Trống';
                    } else {
                        typeClass = `type-${box.contentType}`;
                        currentIcon = typeIcons[box.contentType] || 'fa-solid fa-question';
                        currentLabel = typeLabels[box.contentType] || '';
                    }
                }
            }

            const tabAttr = box.isOpened || isDisabled ? 'tabindex="-1"' : 'tabindex="0"';
            const keyboardEvents = box.isOpened || isDisabled ? '' : `onkeydown="handleBoxKeydown(event, ${box.index})"`;

            boxesHtml += `
                <div class="${wrapperClasses}" ${tooltip} data-box-index="${box.index}" onclick="handleBoxClick(${box.index})" ${tabAttr} ${keyboardEvents} style="--player-color: ${player.colorValue}" onmouseenter="playSound('hover')">
                    <div class="${boxClasses}">
                        <div class="box-face front">
                            <span class="owner-corner-tag">${player.name}</span>
                            <div class="gift-symbol-wrapper" style="--player-color: ${player.colorValue}">
                                <i class="fa-solid fa-gift"></i>
                            </div>
                            <span class="box-number ${game.settings.showBoxNumbers ? '' : 'hidden'}">${i + 1}</span>
                        </div>
                        <div class="box-face back ${typeClass}">
                            <div class="opened-icon-wrapper">
                                <i class="${currentIcon}"></i>
                            </div>
                            <span class="box-type-label" style="background: ${player.colorValue}22; color: ${player.colorValue}">${currentLabel}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        boardHtml += `
            <div class="${zoneClass}" style="border-color: ${player.colorValue}; --player-color: ${player.colorValue}; --player-soft-color: ${PLAYER_COLORS[playerIndex].soft}">
                <div class="player-zone-title" style="color: ${player.colorValue}">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="active-player-avatar" style="width: 28px; height: 28px; font-size: 0.9rem; background: ${player.colorValue}">${player.name.charAt(0)}</span>
                        Khu vực của ${player.name}
                    </div>
                    ${statusTag}
                </div>
                <div class="player-box-list">
                    ${boxesHtml}
                </div>
            </div>
        `;
    });
    DOM.gameGrid.innerHTML = boardHtml;

    renderGameHistoryList(game);
}

// Đổi người chọn tự do
window.selectCurrentPlayerFree = function(playerId) {
    const game = getCurrentGame();
    if (!game) return;
    if (game.mode === GAME_MODES.SECRET) return;
    if (game.settings.turnMode !== 'free') return;
    
    game.currentTurnPlayerIndex = game.players.findIndex(p => p.id === playerId);
    playSound('lock');
    updateCurrentGame(game);
    renderGamePlayView();
};

// Gõ phím khui ô bàn chơi
window.handleBoxKeydown = function(event, boxIndex) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleBoxClick(boxIndex);
    }
};

window.handleBoxClick = function(boxIndex) {
    if (isProcessingAction) return;

    const game = getCurrentGame();
    if (!game) return;

    const box = game.boxes[boxIndex];
    const wrapper = DOM.gameGrid.querySelector(`[data-box-index="${boxIndex}"]`);
    const gridBox = wrapper ? wrapper.querySelector('.grid-box') : null;
    const activePlayer = game.players[game.currentTurnPlayerIndex];

    if (!box) {
        playSound('error');
        showToast("Không tìm thấy túi mù này!");
        return;
    }

    if (box.isOpened) {
        playSound('error');
        showToast("Túi mù này đã được mở rồi!");
        return;
    }

    if (box.ownerId === activePlayer.id) {
        playSound('error');
        if (gridBox) {
            gridBox.classList.add('shake-animation');
            setTimeout(() => gridBox.classList.remove('shake-animation'), 400);
        }
        showToast("Bạn không thể tự mở ô của chính mình!");
        return;
    }

    lastFocusedElement = wrapper;
    isProcessingAction = true;
    
    // Mở ô thực tế
    box.isOpened = true;
    box.openedByPlayerId = activePlayer.id;
    box.openedAt = new Date().toISOString();
    
    activePlayer.openedCount++;
    game.lastOpenedBoxId = box.id;

    if (gridBox) gridBox.classList.add('opened');

    if (game.mode === GAME_MODES.SECRET) {
        if (box.isSecretBox) {
            // TÌM THẤY Ô BÍ MẬT -> THẮNG
            game.winnerId = activePlayer.id;
            game.foundSecretBoxId = box.id;
            game.gameEndedReason = "secret-found";

            const owner = game.players.find(p => p.id === box.ownerId);
            const localIndex = game.boxes.filter(b => b.ownerId === owner.id).findIndex(b => b.id === box.id) + 1;

            game.history.push({
                boxId: box.id,
                ownerId: box.ownerId,
                openedBy: activePlayer.id,
                turnNumber: game.turnNumber,
                openedAt: box.openedAt,
                result: 'secret-found',
                summary: `${activePlayer.name} tìm thấy câu bí mật ở ô số ${localIndex} của ${owner.name}`
            });

            playSound('success');
            runConfetti();

            updateCurrentGame(game);
            setTimeout(() => showSecretFoundModal(box, activePlayer), 450);
        } else {
            // HỘP TRỐNG
            const owner = game.players.find(p => p.id === box.ownerId);
            const localIndex = game.boxes.filter(b => b.ownerId === owner.id).findIndex(b => b.id === box.id) + 1;

            game.history.push({
                boxId: box.id,
                ownerId: box.ownerId,
                openedBy: activePlayer.id,
                turnNumber: game.turnNumber,
                openedAt: box.openedAt,
                result: 'empty',
                summary: `${activePlayer.name} khui trúng ô trống số ${localIndex} của ${owner.name}`
            });

            playSound('error');
            updateCurrentGame(game);
            setTimeout(() => showEmptyBoxModal(box, activePlayer), 450);
        }
    } else {
        // CHẾ ĐỘ THƯỜNG
        const owner = game.players.find(p => p.id === box.ownerId);
        const localIndex = game.boxes.filter(b => b.ownerId === owner.id).findIndex(b => b.id === box.id) + 1;
        
        game.history.push({
            boxId: box.id,
            ownerId: box.ownerId,
            openedBy: activePlayer.id,
            turnNumber: game.turnNumber,
            openedAt: box.openedAt,
            result: box.isPlayable === false ? 'empty' : 'normal',
            summary: box.isPlayable === false
                ? `${activePlayer.name} mở trúng túi trống số ${localIndex} của ${owner.name}`
                : `${activePlayer.name} mở túi số ${localIndex} của ${owner.name}`
        });

        playSound(box.isPlayable === false ? 'error' : 'pop');
        if (box.isPlayable !== false && game.settings.confettiEnabled) {
            runConfetti();
        }

        // Chế độ thường kết thúc ngay khi toàn bộ túi có nội dung của một
        // người đã được tìm thấy. Người mở túi cuối cùng là người chiến thắng.
        const ownerContentBoxes = game.boxes.filter(
            candidate => candidate.ownerId === owner.id && candidate.isPlayable !== false
        );
        if (box.isPlayable !== false && ownerContentBoxes.every(candidate => candidate.isOpened)) {
            game.winnerId = activePlayer.id;
            game.clearedOwnerId = owner.id;
            game.gameEndedReason = "player-boxes-cleared";
        }

        updateCurrentGame(game);
        setTimeout(() => showNormalBoxModal(box), 450);
    }
}

function showSecretFoundModal(box, activePlayer) {
    const game = getCurrentGame();
    if (!game) return;
    const owner = game.players.find(p => p.id === box.ownerId);
    const content = decryptContent(box.encryptedContent);

    DOM.modalOwnerBadge.textContent = `Túi mù của: ${owner.name}`;
    DOM.modalOwnerBadge.style.background = owner.colorValue;
    DOM.modalCardBack.className = `card-back type-secret-found`;
    DOM.modalCardBack.style.borderColor = "#f1c40f";

    DOM.modalTypeIcon.className = 'fa-solid fa-trophy';
    DOM.modalTypeLabel.textContent = 'Tìm Thấy Câu Bí Mật!';
    DOM.modalSecretContent.innerHTML = `<span style="font-size: 1.3rem; color: #d35400; font-weight:700;">"${content}"</span>`;
    
    const localIndex = game.boxes.filter(b => b.ownerId === owner.id).findIndex(b => b.id === box.id) + 1;
    DOM.modalActionTip.innerHTML = `Chúc mừng <strong style="color: ${activePlayer.colorValue}">${activePlayer.name}</strong> đã thắng! (Tìm thấy ở túi mù số ${localIndex})`;

    DOM.modalCardInner.classList.remove('flipped');
    DOM.boxModal.classList.add('active');
    DOM.btnCloseModal.focus();
    
    setTimeout(() => {
        DOM.modalCardInner.classList.add('flipped');
    }, 150);
}

function showEmptyBoxModal(box, activePlayer) {
    const game = getCurrentGame();
    if (!game) return;
    const owner = game.players.find(p => p.id === box.ownerId);
    
    DOM.modalOwnerBadge.textContent = `Túi mù của: ${owner.name}`;
    DOM.modalOwnerBadge.style.background = owner.colorValue;
    DOM.modalCardBack.className = `card-back type-empty`;
    DOM.modalCardBack.style.borderColor = owner.colorValue;

    DOM.modalTypeIcon.className = 'fa-solid fa-box-open';
    DOM.modalTypeLabel.textContent = 'Ô Trống!';
    DOM.modalSecretContent.innerHTML = `<span style="color: var(--text-secondary); font-weight: 500;">Hộp quà này rỗng tuếch!<br>Câu nói bí mật không nằm ở đây.</span>`;
    
    const localIndex = game.boxes.filter(b => b.ownerId === owner.id).findIndex(b => b.id === box.id) + 1;
    DOM.modalActionTip.innerHTML = `Túi mù số ${localIndex} rỗng. Lượt mở tiếp theo sẽ chuyển cho đối phương!`;

    DOM.modalCardInner.classList.remove('flipped');
    DOM.boxModal.classList.add('active');
    DOM.btnCloseModal.focus();

    setTimeout(() => {
        DOM.modalCardInner.classList.add('flipped');
    }, 150);
}

function showNormalBoxModal(box) {
    const game = getCurrentGame();
    if (!game) return;
    const owner = game.players.find(p => p.id === box.ownerId);
    const activePlayer = game.players[game.currentTurnPlayerIndex];
    const isEmptyBox = box.isPlayable === false;
    const content = isEmptyBox
        ? "Túi này không có câu nói. Bạn đã khui trúng một túi trống!"
        : decryptContent(box.encryptedContent);

    DOM.modalOwnerBadge.textContent = `Túi mù của: ${owner.name}`;
    DOM.modalOwnerBadge.style.background = owner.colorValue;
    DOM.modalCardBack.className = `card-back ${isEmptyBox ? 'type-empty' : `type-${box.contentType}`}`;
    DOM.modalCardBack.style.borderColor = owner.colorValue;

    const typeIcons = {
        question: 'fa-solid fa-question-circle',
        dare: 'fa-solid fa-bolt',
        gift: 'fa-solid fa-gift',
        punish: 'fa-solid fa-skull-crossbones',
        secret: 'fa-solid fa-mask'
    };
    
    const typeLabels = {
        question: 'Câu hỏi (Truth)',
        dare: 'Thử thách (Dare)',
        gift: 'Món quà may mắn',
        punish: 'Hình phạt vui',
        secret: 'Bí mật thầm kín'
    };

    DOM.modalTypeIcon.className = isEmptyBox
        ? 'fa-solid fa-box-open'
        : (typeIcons[box.contentType] || 'fa-solid fa-gift');
    DOM.modalTypeLabel.textContent = isEmptyBox
        ? 'Túi trống'
        : (typeLabels[box.contentType] || '');
    DOM.modalSecretContent.textContent = content;
    
    const localIndex = game.boxes.filter(b => b.ownerId === owner.id).findIndex(b => b.id === box.id) + 1;
    DOM.modalActionTip.innerHTML = game.gameEndedReason === "player-boxes-cleared"
        ? `<strong style="color: ${activePlayer.colorValue}">${activePlayer.name}</strong> đã tìm thấy túi có nội dung cuối cùng của ${owner.name} và chiến thắng!`
        : isEmptyBox
        ? `<strong style="color: ${activePlayer.colorValue}">${activePlayer.name}</strong> đã mở túi trống số ${localIndex}. Lượt tiếp theo sẽ chuyển sang người khác.`
        : `Người thực hiện: <strong style="color: ${activePlayer.colorValue}">${activePlayer.name}</strong> (Túi mù số ${localIndex})`;

    DOM.modalCardInner.classList.remove('flipped');
    DOM.boxModal.classList.add('active');
    DOM.btnCloseModal.focus();

    setTimeout(() => {
        DOM.modalCardInner.classList.add('flipped');
    }, 150);
}

// Hoàn thành 1 lượt khui
window.completeCurrentTurn = function() {
    DOM.boxModal.classList.remove('active');
    if (lastFocusedElement) lastFocusedElement.focus();

    const game = getCurrentGame();
    if (!game) return;

    if (game.gameEndedReason === "secret-found" || game.gameEndedReason === "player-boxes-cleared") {
        game.phase = "result";
        game.status = "completed";
        game.completedAt = new Date().toISOString();
        game.endTime = game.completedAt;
        updateCurrentGame(game);
        isProcessingAction = false;
        renderGamePlayView();
        return;
    }

    const totalRemaining = game.boxes.filter(b => b.isPlayable !== false && !b.isOpened).length;
    
    if (totalRemaining === 0) {
        game.phase = "result";
        game.status = "completed";
        game.completedAt = new Date().toISOString();
        updateCurrentGame(game);
        isProcessingAction = false;
        renderGamePlayView();
        return;
    }

    const isSecretMode = game.mode === GAME_MODES.SECRET;

    if (isSecretMode || game.settings.turnMode === "turn") {
        const nextIndex = getNextEligiblePlayerIndex(game.currentTurnPlayerIndex);
        if (nextIndex === -1) {
            game.phase = "result";
            game.status = "completed";
            game.completedAt = new Date().toISOString();
            updateCurrentGame(game);
            isProcessingAction = false;
            renderGamePlayView();
        } else {
            // Hash vẫn đang là #/game nên gọi navigateTo('game') sẽ không phát
            // sinh hashchange. Chuyển lượt và render trực tiếp để bảo đảm mỗi
            // người chỉ mở đúng một ô rồi bắt buộc sang người kế tiếp.
            game.currentTurnPlayerIndex = nextIndex;
            game.turnNumber++;
            game.phase = "opening";
            isProcessingAction = false;
            updateCurrentGame(game);
            renderGamePlayView();
        }
    } else {
        isProcessingAction = false;
        renderGamePlayView();
    }
};

// Chuyển lượt khui trong transition screen
window.moveToNextTurn = function() {
    const game = getCurrentGame();
    if (game) {
        playSound('lock');
        game.currentTurnPlayerIndex = game.pendingNextPhase;
        game.turnNumber++;
        game.phase = "opening";
        isProcessingAction = false;
        updateCurrentGame(game);
        renderGamePlayView();
    }
};

window.requestEndTurnFreeMode = function() {
    const game = getCurrentGame();
    if (!game) return;

    if (confirm("Xác nhận kết thúc lượt chơi của bạn và chuyển thiết bị?")) {
        const nextIndex = getNextEligiblePlayerIndex(game.currentTurnPlayerIndex);
        if (nextIndex === -1) {
            game.phase = "result";
            game.status = "completed";
            game.completedAt = new Date().toISOString();
            updateCurrentGame(game);
            renderGamePlayView();
        } else {
            game.currentTurnPlayerIndex = nextIndex;
            game.turnNumber++;
            game.phase = "opening";
            isProcessingAction = false;
            updateCurrentGame(game);
            renderGamePlayView();
        }
    }
};

function renderGameHistoryList(game) {
    if (game.history.length === 0) {
        DOM.boardHistorySection.classList.add('hidden');
        return;
    }
    DOM.boardHistorySection.classList.remove('hidden');
    let html = '';
    const reversed = [...game.history].reverse();
    reversed.forEach(item => {
        const timeStr = item.openedAt ? new Date(item.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
        html += `
            <li class="history-item">
                <span><strong>Lượt ${item.turnNumber}:</strong> ${item.summary}</span>
                <span class="history-time"><i class="fa-solid fa-clock"></i> ${timeStr}</span>
            </li>
        `;
    });
    DOM.boardHistoryList.innerHTML = html;
}

// 9. RENDER MÀN HÌNH KẾT QUẢ SUBVIEW (GAME COMPLETED)
function renderResultSubview(game) {
    playSound('success');
    runConfetti();

    const isSecretMode = game.mode === GAME_MODES.SECRET;

    let timeString = 'Không rõ';
    if (game.startTime && game.endTime) {
        const diffMs = new Date(game.endTime) - new Date(game.startTime);
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        timeString = `${diffMins} phút ${diffSecs} giây`;
    }

    if (isSecretMode) {
        DOM.normalEndTrophy.classList.add('hidden');
        DOM.normalEndTitle.classList.add('hidden');
        DOM.normalEndSubtitle.classList.add('hidden');
        DOM.typesStatsContainer.classList.add('hidden');
        
        DOM.secretWinnerCard.classList.remove('hidden');
        DOM.btnReplayNewPosition.classList.remove('hidden');
        DOM.btnNewSentences.classList.remove('hidden');
        DOM.btnReplayOldContent.classList.add('hidden');
        DOM.btnCreateNewContent.classList.add('hidden');

        if (game.winnerId !== null) {
            const winner = game.players.find(p => p.id === game.winnerId);
            const loser = game.players.find(p => p.id !== game.winnerId);
            
            DOM.secretWinnerName.textContent = winner.name;
            DOM.secretLoserName.textContent = loser.name;

            const loserBoxes = game.boxes.filter(b => b.ownerId === loser.id);
            const displayNum = loserBoxes.findIndex(b => b.id === game.foundSecretBoxId) + 1;
            DOM.secretBoxNum.textContent = displayNum;

            const decodedSentence = decryptContent(loser.secretSentence);
            DOM.secretWinnerSentence.textContent = `"${decodedSentence}"`;
        }
    } else {
        DOM.normalEndTrophy.classList.remove('hidden');
        DOM.normalEndTitle.classList.remove('hidden');
        DOM.normalEndSubtitle.classList.remove('hidden');
        DOM.typesStatsContainer.classList.remove('hidden');

        DOM.secretWinnerCard.classList.add('hidden');
        DOM.btnReplayNewPosition.classList.add('hidden');
        DOM.btnNewSentences.classList.add('hidden');
        DOM.btnReplayOldContent.classList.remove('hidden');
        DOM.btnCreateNewContent.classList.remove('hidden');

        const statsTitle = DOM.endScreen.querySelector('.end-subtitle');
        const playableTotal = game.boxes.filter(b => b.isPlayable !== false).length;
        const winner = game.players.find(p => p.id === game.winnerId);
        const clearedOwner = game.players.find(p => p.id === game.clearedOwnerId);
        if (game.gameEndedReason === "player-boxes-cleared" && winner && clearedOwner) {
            DOM.normalEndTitle.textContent = `${winner.name} chiến thắng!`;
            statsTitle.innerHTML = `<strong>${winner.name}</strong> đã tìm thấy toàn bộ túi có nội dung của <strong>${clearedOwner.name}</strong> ở lượt ${game.turnNumber}.<br>Thời gian chơi: <strong>${timeString}</strong>`;
        } else {
            DOM.normalEndTitle.textContent = "Hoàn thành ván chơi!";
            statsTitle.innerHTML = `Các bạn đã mở hết <strong>${playableTotal}</strong> túi có nội dung trong tổng số <strong>${game.turnNumber}</strong> lượt.<br>Thời gian chơi: <strong>${timeString}</strong>`;
        }
    }

    // Vẽ thống kê người chơi
    let statsHtml = '';
    game.players.forEach(p => {
        const textLabel = isSecretMode ? 'lần khui đối thủ' : 'ô đã khui của đối thủ';
        statsHtml += `
            <div class="player-stat-box ${p.colorClass}" style="--player-color: ${p.colorValue}; --player-soft-color: ${p.colorValue}22; border-color: ${p.colorValue}; padding: 12px; border-radius: 12px; border: 1.5px solid var(--border);">
                <div class="stat-pname" style="color: ${p.colorValue}; font-weight:700;">${p.name}</div>
                <div class="stat-pcount" style="font-size: 1.25rem; font-weight:800; margin-top:5px;">${p.openedCount || 0} <span style="font-size:0.8rem; font-weight:500;">${textLabel}</span></div>
            </div>
        `;
    });
    DOM.playerStatsList.innerHTML = statsHtml;

    if (!isSecretMode) {
        const typesCount = { question: 0, dare: 0, gift: 0, punish: 0, secret: 0 };
        game.boxes.forEach(box => {
            if (typesCount[box.contentType] !== undefined) {
                typesCount[box.contentType]++;
            }
        });

        let typesHtml = `
            <div class="type-stat-pill t-question"><i class="fa-solid fa-question-circle"></i> Câu hỏi: ${typesCount.question}</div>
            <div class="type-stat-pill t-dare"><i class="fa-solid fa-bolt"></i> Thử thách: ${typesCount.dare}</div>
            <div class="type-stat-pill t-gift"><i class="fa-solid fa-gift"></i> Món quà: ${typesCount.gift}</div>
            <div class="type-stat-pill t-punish"><i class="fa-solid fa-skull-crossbones"></i> Hình phạt: ${typesCount.punish}</div>
            <div class="type-stat-pill t-secret"><i class="fa-solid fa-mask"></i> Bí mật: ${typesCount.secret}</div>
        `;
        DOM.typesStatsGrid.innerHTML = typesHtml;
    }
}

// 10. REPLAY / RESTART ACTIONS
window.restartGameWithNewPositions = function() {
    const game = getCurrentGame();
    if (!game) return;

    game.players.forEach(p => {
        p.openedCount = 0;
        p.hasLockedSecret = false;
        p.secretBoxId = null;
    });
    game.boxes.forEach(box => {
        box.isOpened = false;
        box.openedByPlayerId = null;
        box.openedAt = null;
        box.isSecretBox = false;
        box.encryptedContent = '';
    });
    game.openedBoxesCount = 0;
    game.turnNumber = 1;
    game.history = [];
    game.startTime = null;
    game.endTime = null;
    game.winnerId = null;
    game.foundSecretBoxId = null;
    game.gameEndedReason = null;
    game.phase = "input-intro";
    game.currentInputPlayerIndex = 0;
    game.temporaryInputs = {};
    game.replayMode = "keep-sentences";
    delete game.firstPlayerIndex;

    updateCurrentGame(game);
    navigateTo(APP_ROUTES.INPUT);
};

window.restartGameWithNewSentences = function() {
    const game = getCurrentGame();
    if (!game) return;

    game.players.forEach(p => {
        p.openedCount = 0;
        p.hasLockedSecret = false;
        p.secretBoxId = null;
        p.secretSentence = "";
    });
    game.boxes.forEach(box => {
        box.isOpened = false;
        box.openedByPlayerId = null;
        box.openedAt = null;
        box.isSecretBox = false;
        box.encryptedContent = '';
    });
    game.openedBoxesCount = 0;
    game.turnNumber = 1;
    game.history = [];
    game.startTime = null;
    game.endTime = null;
    game.winnerId = null;
    game.foundSecretBoxId = null;
    game.gameEndedReason = null;
    game.phase = "input-intro";
    game.currentInputPlayerIndex = 0;
    game.temporaryInputs = {};
    delete game.replayMode;
    delete game.firstPlayerIndex;

    updateCurrentGame(game);
    navigateTo(APP_ROUTES.INPUT);
};

window.restartWithSameContent = function() {
    const game = getCurrentGame();
    if (!game) return;

    game.boxes.forEach(box => {
        box.isOpened = false;
        box.openedByPlayerId = null;
        box.openedAt = null;
    });
    game.players.forEach(p => {
        p.openedCount = 0;
    });
    game.openedBoxesCount = 0;
    game.turnNumber = 1;
    game.history = [];
    game.startTime = new Date().toISOString();
    game.endTime = null;
    game.phase = "opening";
    game.firstPlayerIndex = getRandomPlayerIndex(game);
    game.currentTurnPlayerIndex = game.firstPlayerIndex;

    updateCurrentGame(game);
    navigateTo(APP_ROUTES.GAME);
};

window.restartWithNewContent = function() {
    const game = getCurrentGame();
    if (!game) return;

    game.boxes.forEach(box => {
        box.isOpened = false;
        box.openedByPlayerId = null;
        box.openedAt = null;
        box.encryptedContent = '';
        box.isPlayable = game.mode === GAME_MODES.SECRET;
    });
    game.players.forEach(p => {
        p.openedCount = 0;
        if (game.mode === GAME_MODES.NORMAL) {
            p.selectedNormalBoxIds = [];
        }
    });
    game.openedBoxesCount = 0;
    game.turnNumber = 1;
    game.history = [];
    game.startTime = null;
    game.endTime = null;
    game.phase = "input-intro";
    game.currentInputPlayerIndex = 0;
    game.temporaryInputs = {};
    delete game.firstPlayerIndex;

    updateCurrentGame(game);
    navigateTo(APP_ROUTES.INPUT);
};

// 11. RENDER TRANG LỊCH SỬ VÁN CHƠI (HISTORY VIEW)
let historyActiveFilter = "all";
function renderHistoryView(detailsGameId) {
    const listGrid = document.getElementById("history-list-grid");
    const detailsContainer = document.getElementById("history-details-container");
    if (!listGrid || !detailsContainer) return;

    // Phân phối xem list hay xem chi tiết ván
    if (detailsGameId) {
        listGrid.classList.add("hidden");
        document.querySelector(".history-filters").classList.add("hidden");
        detailsContainer.classList.remove("hidden");
        renderHistoryGameDetails(detailsGameId);
        return;
    }

    listGrid.classList.remove("hidden");
    document.querySelector(".history-filters").classList.remove("hidden");
    detailsContainer.classList.add("hidden");

    let filtered = appData.games;
    if (historyActiveFilter === "playing") {
        filtered = appData.games.filter(g => g.status === "playing" || g.status === "paused" || g.status === "preparing");
    } else if (historyActiveFilter === "completed") {
        filtered = appData.games.filter(g => g.status === "completed");
    } else if (historyActiveFilter === "cancelled") {
        filtered = appData.games.filter(g => g.status === "cancelled");
    }

    // Sắp xếp cập nhật mới nhất lên trước
    filtered = [...filtered].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (filtered.length === 0) {
        listGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); font-weight:600;">
                <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--border); margin-bottom:12px; display:block;"></i>
                Không tìm thấy ván chơi nào phù hợp.
            </div>
        `;
        return;
    }

    let html = '';
    filtered.forEach(game => {
        const dateStr = new Date(game.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        let statusBadgeClass = 'badge-info';
        let statusText = 'Đang chơi';
        if (game.status === "completed") {
            statusBadgeClass = 'badge-success';
            statusText = 'Hoàn thành';
        } else if (game.status === "cancelled") {
            statusBadgeClass = 'badge-danger';
            statusText = 'Đã hủy';
        }

        const isPlaying = game.status === "playing" || game.status === "paused" || game.status === "preparing";

        html += `
            <div class="history-item-card" style="border-color: ${PLAYER_COLORS[0].border}">
                <div class="history-card-header">
                    <span class="history-card-title">${game.title}</span>
                    <span class="badge ${statusBadgeClass}">${statusText}</span>
                </div>
                <div class="history-card-info">
                    <p style="margin-bottom:4px;"><strong>Chế độ:</strong> ${game.mode === GAME_MODES.SECRET ? "Tìm câu nói bí mật" : "Túi mù thông thường"}</p>
                    <p style="margin-bottom:4px;"><strong>Người chơi:</strong> ${game.players.map(p => p.name).join(" vs ")}</p>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top:8px;"><i class="fa-solid fa-calendar-days"></i> ${dateStr}</p>
                </div>
                <div class="history-card-actions">
                    ${isPlaying ? `<button class="btn btn-tiny btn-primary" onclick="resumeGame('${game.id}')"><i class="fa-solid fa-play"></i> Tiếp tục</button>` : ''}
                    <button class="btn btn-tiny btn-secondary" onclick="viewHistoryDetails('${game.id}')"><i class="fa-solid fa-circle-info"></i> Chi tiết</button>
                    <button class="btn btn-tiny btn-danger-light" onclick="deleteHistoryGame('${game.id}')" title="Xóa ván chơi"><i class="fa-solid fa-trash-can"></i> Xóa</button>
                </div>
            </div>
        `;
    });
    listGrid.innerHTML = html;
}

window.filterHistory = function(filterVal) {
    playSound('pop');
    historyActiveFilter = filterVal;
    
    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach(btn => {
        if (btn.getAttribute("onclick").includes(filterVal)) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    
    renderHistoryView();
};

window.viewHistoryDetails = function(gameId) {
    window.location.hash = `#/${APP_ROUTES.HISTORY}/${gameId}`;
};

window.deleteHistoryGame = function(gameId) {
    if (confirm("Bạn có chắc muốn xóa ván chơi này khỏi lịch sử lưu trữ?")) {
        deleteGameById(gameId);
        showToast("Đã xóa ván chơi!");
        renderHistoryView();
    }
};

// Chi tiết ván chơi cụ thể
function renderHistoryGameDetails(gameId) {
    const game = appData.games.find(g => g.id === gameId);
    if (!game) {
        navigateTo(APP_ROUTES.HISTORY);
        return;
    }

    document.getElementById("history-detail-title").textContent = game.title;
    
    const dateStr = new Date(game.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    let detailsHtml = `
        <p><strong>Ngày tạo:</strong> ${dateStr}</p>
        <p><strong>Chế độ chơi:</strong> ${game.mode === GAME_MODES.SECRET ? "Tìm câu nói bí mật" : "Túi mù thông thường"}</p>
        <p><strong>Trạng thái:</strong> ${getGamePhaseText(game.phase)}</p>
        <p><strong>Tổng lượt chơi đã thực hiện:</strong> ${game.turnNumber} lượt</p>
    `;
    
    if (game.winnerId !== null) {
        const winner = game.players.find(p => p.id === game.winnerId);
        detailsHtml += `<p style="color: var(--success); font-weight:700;"><strong>Người thắng cuộc:</strong> ${winner.name}</p>`;
    }
    
    document.getElementById("history-detail-info").innerHTML = detailsHtml;

    // Xem nhật ký khui
    let logHtml = '';
    if (game.history.length === 0) {
        logHtml = '<li>Chưa có lượt khui nào được ghi nhận.</li>';
    } else {
        game.history.forEach(item => {
            logHtml += `<li><strong>Lượt ${item.turnNumber}:</strong> ${item.summary}</li>`;
        });
    }
    document.getElementById("history-detail-logs").innerHTML = logHtml;

    // Nút xem lại câu nói bí mật (đảm bảo bảo mật)
    const revealContainer = document.getElementById("history-reveal-container");
    if (game.mode === GAME_MODES.SECRET) {
        revealContainer.classList.remove("hidden");
        revealContainer.innerHTML = `
            <button class="btn btn-tiny btn-secondary" onclick="toggleRevealSecretSentences('${game.id}')" id="btn-reveal-sentences"><i class="fa-solid fa-eye"></i> Xem lại câu nói bí mật</button>
            <div id="revealed-sentences-box" class="reveal-sentence-box hidden"></div>
        `;
    } else {
        revealContainer.classList.add("hidden");
    }
}

window.toggleRevealSecretSentences = function(gameId) {
    const game = appData.games.find(g => g.id === gameId);
    if (!game) return;

    const box = document.getElementById("revealed-sentences-box");
    const btn = document.getElementById("btn-reveal-sentences");
    if (!box || !btn) return;

    if (box.classList.contains("hidden")) {
        // Giải mã và hiển thị
        let sentenceHtml = '';
        game.players.forEach(p => {
            const dec = p.secretSentence ? decryptContent(p.secretSentence) : 'Không có';
            sentenceHtml += `<p><strong>${p.name}:</strong> "${dec}"</p>`;
        });
        box.innerHTML = sentenceHtml;
        box.classList.remove("hidden");
        btn.innerHTML = `<i class="fa-solid fa-eye-slash"></i> Ẩn câu nói bí mật`;
        playSound('pop');
    } else {
        box.classList.add("hidden");
        btn.innerHTML = `<i class="fa-solid fa-eye"></i> Xem lại câu nói bí mật`;
    }
};

window.goBackToHistoryList = function() {
    window.location.hash = `#/${APP_ROUTES.HISTORY}`;
};

// 12. RENDER TRANG CÀI ĐẶT (SETTINGS VIEW)
function renderSettingsView() {
    // Đồng bộ trạng thái UI Settings
    const themeSelect = document.getElementById("settings-theme-select");
    const soundCheckbox = document.getElementById("settings-sound-effects");
    const effectsCheckbox = document.getElementById("settings-effects-toggle");

    if (themeSelect) themeSelect.value = appData.settings.theme || "system";
    if (soundCheckbox) soundCheckbox.checked = appData.settings.soundEnabled;
    if (effectsCheckbox) effectsCheckbox.checked = appData.settings.effectsEnabled;
}

window.changeSettingsTheme = function(val) {
    setTheme(val);
};

window.changeSettingsSound = function(checked) {
    appData.settings.soundEnabled = checked;
    saveAppData();
    if (checked) playSound('pop');
};

window.changeSettingsEffects = function(checked) {
    appData.settings.effectsEnabled = checked;
    saveAppData();
};

// Reset cài đặt gốc dữ liệu
window.triggerResetAppData = function() {
    if (confirm("Cảnh báo: Hành động này sẽ xóa sạch tất cả lịch sử, các ván chơi đang dở và đưa ứng dụng về cài đặt gốc. Bạn có chắc muốn tiếp tục?")) {
        clearAllLocalStorageData();
        showToast("Đã khôi phục cài đặt gốc thành công!");
        setTheme("system");
        setTimeout(() => {
            window.location.reload();
        }, 800);
    }
};

// 13. RENDER TRANG HƯỚNG DẪN (HELP VIEW)
let helpActiveTab = "normal";
function renderHelpView() {
    const tabNormal = document.getElementById("help-tab-normal");
    const tabSecret = document.getElementById("help-tab-secret");
    
    // Tab buttons
    const btnNormal = document.getElementById("btn-help-tab-normal");
    const btnSecret = document.getElementById("btn-help-tab-secret");

    if (helpActiveTab === "normal") {
        tabNormal.classList.add("active");
        tabSecret.classList.remove("active");
        btnNormal.classList.add("active");
        btnSecret.classList.remove("active");
    } else {
        tabNormal.classList.remove("active");
        tabSecret.classList.add("active");
        btnNormal.classList.remove("active");
        btnSecret.classList.add("active");
    }
}

window.switchHelpTab = function(tabName) {
    playSound('pop');
    helpActiveTab = tabName;
    renderHelpView();
};

// 14. HELPER LOGIC KHUI Ô VÀ CHỈ BÁO CUỘN

function resetBoardScrollIndicator() {
    const helper = document.getElementById("scroll-helper-text");
    const gradient = document.getElementById("scroll-gradient-indicator");
    if (helper && gradient) {
        helper.classList.remove("fade-out");
        gradient.classList.remove("fade-out");
    }
}

// Ẩn mờ chỉ báo cuộn
window.handleBoardScroll = function() {
    const helper = document.getElementById("scroll-helper-text");
    const gradient = document.getElementById("scroll-gradient-indicator");
    if (helper && gradient) {
        helper.classList.add("fade-out");
        gradient.classList.add("fade-out");
    }
};

function getNextEligiblePlayerIndex(currentIndex) {
    const game = getCurrentGame();
    if (!game) return -1;
    const numPlayers = game.players.length;
    let checkIndex = currentIndex;
    for (let i = 0; i < numPlayers; i++) {
        checkIndex = (checkIndex + 1) % numPlayers;
        const nextPlayer = game.players[checkIndex];
        const hasPlayable = nextPlayer && game.boxes.some(
            b => b.isPlayable !== false && !b.isOpened && b.ownerId !== nextPlayer.id
        );
        if (hasPlayable) {
            return checkIndex;
        }
    }
    return -1;
}

function getRandomPlayerIndex(game) {
    if (!game || !Array.isArray(game.players) || game.players.length === 0) {
        return 0;
    }
    return Math.floor(Math.random() * game.players.length);
}

// Xuất/Nhập dữ liệu cài đặt lưu trữ
window.exportAppDataToJSON = function() {
    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", "tui_mu_bi_mat_backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast("Đã tải xuống tệp sao lưu dữ liệu!");
    } catch (e) {
        console.error("Lỗi xuất dữ liệu:", e);
        showToast("Lỗi xuất tệp sao lưu!");
    }
};

window.importAppDataFromJSON = function(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.version && parsed.games && parsed.settings) {
                appData = parsed;
                saveAppData();
                showToast("Nhập dữ liệu thành công!");
                setTimeout(() => window.location.reload(), 800);
            } else {
                playSound('error');
                showToast("Tệp sao lưu không đúng định dạng!");
            }
        } catch (err) {
            console.error("Lỗi đọc file backup:", err);
            playSound('error');
            showToast("Lỗi đọc tệp sao lưu!");
        }
    };
    reader.readAsText(file);
};
