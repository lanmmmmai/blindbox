const onlineGame = {
    state: null,
    connection: "disconnected",
    loading: false,
    opening: false,
    refreshTimer: null,
    selectedSecretBox: null,
    renderedWritingKey: null
};
let onlineBoxModalActive = false;
let onlineDraftSaveTimer = null;
const onlineDraftState = {
    roomCode: null,
    playerUid: null,
    selectedBagCount: 1,
    selectedBagIds: [],
    contents: {},
    contentTypes: {},
    updatedAt: null
};

function getOnlineDraftStorageKey(roomCode, playerUid) {
    return `onlineDraft:${roomCode}:${playerUid}`;
}

function resetOnlineDraft(state) {
    const roomCode = state.room.roomCode;
    const playerUid = state.me.id;
    if (onlineDraftState.roomCode === roomCode && onlineDraftState.playerUid === playerUid) return;
    const maximum = state.room.boxesPerPlayer;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(getOnlineDraftStorageKey(roomCode, playerUid))); } catch (_) {}
    onlineDraftState.roomCode = roomCode;
    onlineDraftState.playerUid = playerUid;
    onlineDraftState.selectedBagCount = Math.max(1, Math.min(Number(saved?.selectedBagCount) || maximum, maximum));
    onlineDraftState.selectedBagIds = Array.isArray(saved?.selectedBagIds)
        ? saved.selectedBagIds.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= maximum).slice(0, onlineDraftState.selectedBagCount)
        : [];
    onlineDraftState.contents = saved?.contents && typeof saved.contents === "object" ? saved.contents : {};
    onlineDraftState.contentTypes = saved?.contentTypes && typeof saved.contentTypes === "object" ? saved.contentTypes : {};
    onlineDraftState.updatedAt = saved?.updatedAt || null;
    onlineGame.selectedSecretBox = Number(saved?.selectedSecretBox) || null;
}

function scheduleOnlineDraftSave() {
    clearTimeout(onlineDraftSaveTimer);
    onlineDraftSaveTimer = setTimeout(() => {
        if (!onlineDraftState.roomCode || !onlineDraftState.playerUid) return;
        onlineDraftState.updatedAt = Date.now();
        localStorage.setItem(getOnlineDraftStorageKey(onlineDraftState.roomCode, onlineDraftState.playerUid), JSON.stringify({
            selectedBagCount: onlineDraftState.selectedBagCount,
            selectedBagIds: onlineDraftState.selectedBagIds,
            contents: onlineDraftState.contents,
            contentTypes: onlineDraftState.contentTypes,
            selectedSecretBox: onlineGame.selectedSecretBox,
            updatedAt: onlineDraftState.updatedAt
        }));
    }, 400);
}

function clearOnlineDraft() {
    clearTimeout(onlineDraftSaveTimer);
    if (onlineDraftState.roomCode && onlineDraftState.playerUid) {
        localStorage.removeItem(getOnlineDraftStorageKey(onlineDraftState.roomCode, onlineDraftState.playerUid));
    }
    onlineDraftState.roomCode = null;
    onlineDraftState.playerUid = null;
}

function onlineEscape(value) {
    const node = document.createElement("div");
    node.textContent = String(value ?? "");
    return node.innerHTML;
}

function setOnlineButtonLoading(button, loading, text) {
    if (!button) return;
    if (!button.dataset.label) button.dataset.label = button.innerHTML;
    button.disabled = loading;
    button.innerHTML = loading ? `<i class="fa-solid fa-circle-notch fa-spin"></i> ${text}` : button.dataset.label;
}

function showOnlineInlineError(id, message) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("hidden", !message);
}

function renderOnlineCreateView() {
    document.getElementById("online-config-warning")?.classList.toggle("hidden", isOnlineConfigured());
}

function renderOnlineJoinView(query) {
    const code = normalizeRoomCode(query?.get("room") || "");
    if (code) document.getElementById("online-join-code").value = code;
}

window.formatOnlineRoomCode = function(input) { input.value = normalizeRoomCode(input.value); };

window.selectOnlineGameMode = function(mode) {
    const select = document.getElementById("online-game-mode");
    if (select) select.value = mode;
    document.querySelectorAll(".game-mode-card").forEach(card => card.classList.toggle("selected", card.dataset.mode === mode));
};

window.selectOnlineBoxCount = function(count) {
    const select = document.getElementById("online-box-count");
    if (select) select.value = String(count);
    document.querySelectorAll(".game-count-chips button").forEach(button => button.classList.toggle("selected", button.textContent.trim().startsWith(String(count))));
    const preview = document.getElementById("online-bag-preview");
    if (preview) {
        const order = Array.from({ length: count }, (_, index) => index + 1).sort((a, b) => ((a - 1) % 3) - ((b - 1) % 3) || a - b);
        preview.innerHTML = order.map(number => `<span>${number}</span>`).join("");
        preview.style.gridTemplateColumns = `repeat(${Math.ceil(count / 3)}, 34px)`;
    }
};

window.submitCreateOnlineRoom = async function(event) {
    event.preventDefault();
    const button = document.getElementById("btn-create-online-room");
    showOnlineInlineError("online-create-error", "");
    if (!isOnlineConfigured()) return showOnlineInlineError("online-create-error", "Chưa cấu hình kết nối Firebase.");
    try {
        setOnlineButtonLoading(button, true, "Đang tạo phòng...");
        const result = await roomService.createRoom({
            displayName: document.getElementById("online-host-name").value.trim(),
            title: document.getElementById("online-room-title").value.trim(),
            gameMode: document.getElementById("online-game-mode").value,
            boxesPerPlayer: Number(document.getElementById("online-box-count").value)
        });
        saveOnlineSession(result);
        window.location.hash = "#/online-room";
    } catch (error) {
        showOnlineInlineError("online-create-error", getOnlineError(error).message);
    } finally { setOnlineButtonLoading(button, false); }
};

window.submitJoinOnlineRoom = async function(event) {
    event.preventDefault();
    const button = document.getElementById("btn-join-online-room");
    const code = normalizeRoomCode(document.getElementById("online-join-code").value);
    showOnlineInlineError("online-join-error", "");
    if (code.length !== 6) return showOnlineInlineError("online-join-error", "Mã phòng phải có đúng 6 ký tự.");
    try {
        setOnlineButtonLoading(button, true, "Đang tham gia...");
        const result = await roomService.joinRoom(code, document.getElementById("online-join-name").value.trim());
        saveOnlineSession(result);
        window.location.hash = "#/online-room";
    } catch (error) { showOnlineInlineError("online-join-error", getOnlineError(error).message); }
    finally { setOnlineButtonLoading(button, false); }
};

function saveOnlineSession(result) {
    localStorage.setItem("currentOnlineRoomCode", result.roomCode);
    localStorage.setItem("currentRoomCode", result.roomCode);
    if (result.playerId) localStorage.setItem("currentPlayerId", result.playerId);
}

async function renderOnlineRoomView() {
    const code = localStorage.getItem("currentOnlineRoomCode") || localStorage.getItem("currentRoomCode");
    if (!code) { window.location.hash = "#/join"; return; }
    await refreshOnlineRoom(true);
}

async function refreshOnlineRoom(subscribe = false) {
    const code = localStorage.getItem("currentOnlineRoomCode") || localStorage.getItem("currentRoomCode");
    if (!code || onlineGame.loading) return;
    onlineGame.loading = true;
    try {
        onlineGame.state = await roomService.getState(code);
        renderOnlineState();
        if (subscribe) await subscribeOnlineRoom(onlineGame.state, scheduleOnlineRefresh, setOnlineConnection);
    } catch (error) {
        const parsed = getOnlineError(error);
        setOnlineConnection("disconnected");
        if (["ROOM_NOT_FOUND", "NOT_ROOM_MEMBER", "PLAYER_NOT_FOUND"].includes(parsed.code)) clearOnlineRoomSession();
        showToast(parsed.message);
    } finally { onlineGame.loading = false; }
}

function scheduleOnlineRefresh() {
    clearTimeout(onlineGame.refreshTimer);
    onlineGame.refreshTimer = setTimeout(() => refreshOnlineRoom(false), 120);
}

function setOnlineConnection(status) {
    onlineGame.connection = status;
    const pill = document.getElementById("online-connection-pill");
    const banner = document.getElementById("online-connection-banner");
    if (!pill || !banner) { updateOnlineWritingUI(); return; }
    const labels = { connected: "Đã kết nối", reconnecting: "Đang kết nối lại", disconnected: "Mất kết nối" };
    pill.className = `online-connection-pill ${status}`;
    pill.innerHTML = `<span></span> ${labels[status] || "Đang đồng bộ"}`;
    banner.className = `connection-banner ${status === "connected" ? "hidden" : "danger"}`;
    banner.textContent = status === "reconnecting" ? "Kết nối đang bị gián đoạn. Game sẽ tiếp tục khi kết nối được khôi phục." : "Mất kết nối với phòng. Đang thử kết nối lại...";
    updateOnlineWritingUI();
}

function renderOnlineState() {
    const state = onlineGame.state;
    if (!state) return;
    document.getElementById("online-room-code").textContent = state.room.roomCode;
    document.getElementById("online-room-title-display").textContent = state.room.title;
    const writingPhase = state.room.phase === "writing" || state.room.phase === "waiting-for-content";
    const writingKey = `${state.room.roomCode}:${state.room.gameMode}:${state.me.id}:${state.me.hasLockedContent}`;
    if (writingPhase && onlineGame.renderedWritingKey === writingKey) {
        updateOnlineWritingUI();
        setOnlineConnection(onlineGame.connection);
        return;
    }
    ["online-lobby-panel","online-writing-panel","online-ready-panel","online-game-panel","online-result-panel"].forEach(id => document.getElementById(id).classList.add("hidden"));
    if (state.room.phase === "lobby") renderOnlineLobby();
    else if (writingPhase) { onlineGame.renderedWritingKey = writingKey; renderOnlineWriting(); }
    else if (state.room.phase === "ready") renderOnlineReady();
    else if (state.room.phase === "opening") renderOnlineBoard();
    else renderOnlineResult();
}

function onlinePlayersHtml() {
    const canRemove = onlineGame.state.me.role === "host" && onlineGame.state.room.phase === "lobby";
    return onlineGame.state.players.map(player => {
        const isRecentlyOnline = player.isConnected && Date.now() - new Date(player.lastSeenAt).getTime() < 60000;
        return `
        <div class="online-player-row">
            <div class="online-player-avatar">${onlineEscape(player.displayName.charAt(0))}</div>
            <div><strong>${onlineEscape(player.displayName)}</strong><small>${player.role === "host" ? "Chủ phòng" : "Người chơi"}</small></div>
            <span class="player-presence ${isRecentlyOnline ? "online" : "offline"}">${isRecentlyOnline ? "Đang online" : "Mất kết nối"}</span>
            <span class="ready-badge ${player.isReady ? "ready" : ""}">${player.isReady ? "Đã sẵn sàng" : "Chưa sẵn sàng"}</span>
            ${canRemove && player.role !== "host" ? `<button class="btn btn-mini btn-danger-light" onclick="removeOnlinePlayer('${player.id}')">Xóa</button>` : ""}
        </div>`;
    }).join("");
}

function renderOnlineLobby() {
    const panel = document.getElementById("online-lobby-panel"); panel.classList.remove("hidden");
    const s = onlineGame.state; const isHost = s.me.role === "host"; const allReady = s.players.length === 2 && s.players.every(p => p.isReady && p.isConnected);
    panel.innerHTML = `<div class="online-section-title"><h3>Phòng chờ</h3><span>${s.room.gameMode === "normal" ? "Túi mù thông thường" : "Tìm câu bí mật"} · ${s.room.boxesPerPlayer} ô/người</span></div>
        <div class="room-code-hero"><span>MÃ PHÒNG</span><strong>${s.room.roomCode}</strong><div><button class="btn btn-mini btn-secondary" onclick="copyOnlineRoomCode()">Sao chép</button><button class="btn btn-mini btn-secondary" onclick="shareOnlineRoom()">Chia sẻ</button></div></div>
        <div class="online-players">${onlinePlayersHtml()}</div>
        ${s.players.length < 2 ? '<p class="waiting-message"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang chờ người chơi khác tham gia...</p>' : ''}
        <div class="online-form-actions"><button class="btn btn-danger-light" onclick="leaveOnlineRoom()">${isHost ? "Hủy phòng" : "Rời phòng"}</button><button class="btn btn-secondary" onclick="toggleOnlineReady()">${s.me.isReady ? "Hủy sẵn sàng" : "Đã sẵn sàng"}</button>${isHost ? `<button class="btn btn-primary" ${allReady ? "" : "disabled"} onclick="startOnlineRoom()">Bắt đầu chuẩn bị</button>` : ''}</div>`;
}

window.copyOnlineRoomCode = async function() { await navigator.clipboard.writeText(onlineGame.state.room.roomCode); showToast("Đã sao chép mã phòng!"); };
window.shareOnlineRoom = async function() {
    const code = onlineGame.state.room.roomCode; const url = `${location.origin}${location.pathname}#/join?room=${code}`;
    if (navigator.share) await navigator.share({ title: "Túi Mù Bí Mật", text: `Tham gia phòng ${code}`, url });
    else { await navigator.clipboard.writeText(url); showToast("Đã sao chép đường dẫn phòng!"); }
};
window.toggleOnlineReady = async function() { try { await roomService.setReady(onlineGame.state.room.id, !onlineGame.state.me.isReady); await refreshOnlineRoom(); } catch(e){ showToast(getOnlineError(e).message); } };
window.startOnlineRoom = async function() { await runOnlineAction(() => roomService.start(onlineGame.state.room.id), "Đang bắt đầu..."); };
window.removeOnlinePlayer = async function(playerId) { if (confirm("Xóa người chơi này khỏi phòng?")) await runOnlineAction(() => roomService.removePlayer(onlineGame.state.room.id, playerId), "Đang xóa người chơi..."); };

function renderOnlineWriting() {
    const panel = document.getElementById("online-writing-panel"); panel.classList.remove("hidden"); const s=onlineGame.state;
    if (s.me.hasLockedContent) {
        clearOnlineDraft();
        const opponent=s.players.find(p=>p.id!==s.me.id);
        panel.innerHTML=`<div class="online-wait-state"><i class="fa-solid fa-lock"></i><h3>Nội dung của bạn đã được khóa</h3><p>${opponent?.hasLockedContent ? "Cả hai đã hoàn thành. Đang chuyển sang bước tiếp theo..." : `Đang chờ ${onlineEscape(opponent?.displayName || "đối phương")} hoàn thành...`}</p></div><div class="online-players">${onlinePlayersHtml()}</div>`;
        return;
    }
    resetOnlineDraft(s);
    const boxes=Array.from({length:s.room.boxesPerPlayer},(_,i)=>i+1);
    if(s.room.gameMode==="find-secret-sentence"){
        panel.innerHTML=`<div class="online-section-title"><h3>Viết câu bí mật của bạn</h3><span>Chỉ thiết bị này nhìn thấy trước khi khóa</span></div><div class="form-group"><textarea id="online-secret-content" data-online-secret-input maxlength="200" placeholder="Nhập một câu bí mật...">${onlineEscape(onlineDraftState.contents.secret || "")}</textarea><small id="online-secret-counter">${String(onlineDraftState.contents.secret || "").length}/200</small></div><h4>Chọn một ô để giấu</h4><div class="online-secret-picker">${boxes.map(n=>`<button class="picker-box ${onlineGame.selectedSecretBox===n?"selected":""}" data-number="${n}" onclick="selectOnlineSecretBox(${n})">Túi ${n}</button>`).join("")}</div><p id="online-writing-error" class="inline-error hidden"></p><button id="online-lock-button" class="btn btn-primary btn-large" onclick="lockOnlineContent()"><i class="fa-solid fa-lock"></i> Khóa câu bí mật</button>`;
    } else {
        panel.innerHTML=`<div class="online-section-title"><h3>${onlineEscape(s.me.displayName)} đang tạo túi mù</h3><span>Đối phương không nhận được nội dung này</span></div><div class="online-bag-count"><span>Số túi bạn muốn dùng</span><div><button type="button" data-count-delta="-1">−</button><strong id="online-selected-count-value">${onlineDraftState.selectedBagCount}</strong><button type="button" data-count-delta="1">+</button></div><p id="online-selected-progress"></p><p id="online-writing-progress"></p></div><div class="online-writing-grid">${boxes.map(n=>renderOnlineWritingCard(n)).join("")}</div><p id="online-writing-error" class="inline-error hidden"></p><button id="online-lock-button" class="btn btn-primary btn-large" onclick="lockOnlineContent()"><i class="fa-solid fa-lock"></i> Khóa & Lưu túi mù</button>`;
    }
    bindOnlineWritingEvents(panel);
    updateOnlineWritingUI();
}

function renderOnlineWritingCard(number) {
    const selected = onlineDraftState.selectedBagIds.includes(number);
    const content = String(onlineDraftState.contents[number] || "");
    const type = onlineDraftState.contentTypes[number] || "question";
    return `<article class="input-box-card online-writing-card ${selected ? "selected-empty" : "not-selected input-box-disabled"}" data-online-card="${number}"><div class="input-box-header"><strong><i class="fa-solid fa-gift"></i><span>Túi mù <b>${number}</b></span></strong><button type="button" class="btn btn-mini ${selected ? "btn-primary" : "btn-secondary"}" data-toggle-online-bag="${number}">${selected ? "✓ Đã chọn" : "+ Chọn túi"}</button></div><div class="online-writing-field"><textarea data-online-bag-input data-bag-id="${number}" maxlength="150" ${selected ? "" : "disabled"} placeholder="Viết điều bất ngờ vào đây...">${onlineEscape(content)}</textarea><small data-counter-for="${number}">${content.length}/150</small></div><label class="online-type-field"><span><i class="fa-solid fa-shapes"></i> Loại nội dung</span><select data-online-bag-type data-bag-id="${number}" ${selected ? "" : "disabled"}><option value="question" ${type==="question"?"selected":""}>💬 Câu hỏi</option><option value="dare" ${type==="dare"?"selected":""}>⚡ Thử thách</option><option value="gift" ${type==="gift"?"selected":""}>🎁 Món quà</option><option value="punish" ${type==="punish"?"selected":""}>💌 Lời nhắn</option></select></label><span class="online-card-status"></span></article>`;
}

function bindOnlineWritingEvents(panel) {
    if (panel.dataset.writingEventsBound) return;
    panel.dataset.writingEventsBound = "true";
    panel.addEventListener("input", event => {
        const input = event.target.closest("[data-online-bag-input]");
        if (input) onlineDraftState.contents[input.dataset.bagId] = input.value;
        if (event.target.matches("[data-online-secret-input]")) onlineDraftState.contents.secret = event.target.value;
        scheduleOnlineDraftSave();
        updateOnlineWritingUI();
    });
    panel.addEventListener("change", event => {
        const select = event.target.closest("[data-online-bag-type]");
        if (!select) return;
        onlineDraftState.contentTypes[select.dataset.bagId] = select.value;
        scheduleOnlineDraftSave();
        updateOnlineWritingUI();
    });
    panel.addEventListener("click", event => {
        const countButton = event.target.closest("[data-count-delta]");
        if (countButton) changeOnlineSelectedBagCount(Number(countButton.dataset.countDelta));
        const bagButton = event.target.closest("[data-toggle-online-bag]");
        if (bagButton) toggleOnlineBag(Number(bagButton.dataset.toggleOnlineBag));
    });
}

function changeOnlineSelectedBagCount(delta) {
    const maximum = onlineGame.state.room.boxesPerPlayer;
    const next = Math.max(1, Math.min(maximum, onlineDraftState.selectedBagCount + delta));
    if (next === onlineDraftState.selectedBagCount) return;
    if (next < onlineDraftState.selectedBagIds.length) {
        const removed = onlineDraftState.selectedBagIds.slice(next);
        if (removed.some(number => String(onlineDraftState.contents[number] || "").trim()) && !confirm("Giảm số lượng túi? Nội dung trong các túi bị bỏ chọn sẽ bị xóa.")) return;
        removed.forEach(number => { delete onlineDraftState.contents[number]; delete onlineDraftState.contentTypes[number]; });
        onlineDraftState.selectedBagIds = onlineDraftState.selectedBagIds.slice(0, next);
        removed.forEach(updateOnlineWritingCard);
    }
    onlineDraftState.selectedBagCount = next;
    scheduleOnlineDraftSave();
    updateOnlineWritingUI();
}

function toggleOnlineBag(number) {
    const selectedIndex = onlineDraftState.selectedBagIds.indexOf(number);
    if (selectedIndex >= 0) {
        if (String(onlineDraftState.contents[number] || "").trim() && !confirm("Bỏ chọn túi này? Nội dung đang nhập trong túi sẽ bị xóa.")) return;
        onlineDraftState.selectedBagIds.splice(selectedIndex, 1);
        delete onlineDraftState.contents[number];
        delete onlineDraftState.contentTypes[number];
    } else {
        if (onlineDraftState.selectedBagIds.length >= onlineDraftState.selectedBagCount) return showToast(`Bạn đã chọn đủ ${onlineDraftState.selectedBagCount} vị trí túi.`);
        onlineDraftState.selectedBagIds.push(number);
    }
    updateOnlineWritingCard(number);
    scheduleOnlineDraftSave();
    updateOnlineWritingUI();
}

function updateOnlineWritingCard(number) {
    const card = document.querySelector(`[data-online-card="${number}"]`);
    if (!card) return;
    const selected = onlineDraftState.selectedBagIds.includes(number);
    card.classList.toggle("not-selected", !selected);
    card.classList.toggle("input-box-disabled", !selected);
    card.querySelector("textarea").disabled = !selected;
    card.querySelector("select").disabled = !selected;
    const button = card.querySelector("[data-toggle-online-bag]");
    button.textContent = selected ? "✓ Đã chọn" : "+ Chọn túi";
    button.className = `btn btn-mini ${selected ? "btn-primary" : "btn-secondary"}`;
    if (!selected) card.querySelector("textarea").value = "";
}

function updateOnlineWritingUI() {
    const s = onlineGame.state;
    if (!s || s.me.hasLockedContent) return;
    if (s.room.gameMode === "find-secret-sentence") {
        const content = String(onlineDraftState.contents.secret || "");
        const counter = document.getElementById("online-secret-counter");
        if (counter) counter.textContent = `${content.length}/200`;
        const button = document.getElementById("online-lock-button");
        if (button) button.disabled = !content.trim() || !onlineGame.selectedSecretBox || onlineGame.connection !== "connected" || onlineGame.loading;
        return;
    }
    const selected = onlineDraftState.selectedBagIds;
    const filled = selected.filter(number => String(onlineDraftState.contents[number] || "").trim()).length;
    const selectedProgress = document.getElementById("online-selected-progress");
    const writingProgress = document.getElementById("online-writing-progress");
    const countValue = document.getElementById("online-selected-count-value");
    if (countValue) countValue.textContent = onlineDraftState.selectedBagCount;
    if (selectedProgress) selectedProgress.textContent = `Đã chọn ${selected.length}/${onlineDraftState.selectedBagCount} vị trí.`;
    if (writingProgress) writingProgress.textContent = `Đã viết: ${filled}/${onlineDraftState.selectedBagCount} ô · Chưa điền: ${onlineDraftState.selectedBagCount - filled} ô`;
    selected.forEach(number => {
        const content = String(onlineDraftState.contents[number] || "");
        const counter = document.querySelector(`[data-counter-for="${number}"]`);
        if (counter) counter.textContent = `${content.length}/150`;
        const card = document.querySelector(`[data-online-card="${number}"]`);
        if (card) {
            card.classList.toggle("selected-filled", Boolean(content.trim()));
            card.classList.toggle("selected-empty", !content.trim());
            const status = card.querySelector(".online-card-status");
            if (status) status.textContent = content.trim() ? "✓ Đã nhập" : "Chưa nhập nội dung";
        }
    });
    document.querySelectorAll("[data-toggle-online-bag]").forEach(button => {
        const number = Number(button.dataset.toggleOnlineBag);
        button.disabled = !selected.includes(number) && selected.length >= onlineDraftState.selectedBagCount;
    });
    const button = document.getElementById("online-lock-button");
    if (button) button.disabled = selected.length !== onlineDraftState.selectedBagCount || filled !== onlineDraftState.selectedBagCount || onlineGame.connection !== "connected" || onlineGame.loading;
}

window.selectOnlineSecretBox=function(number){onlineGame.selectedSecretBox=number;scheduleOnlineDraftSave();document.querySelectorAll(".online-secret-picker .picker-box").forEach(b=>b.classList.toggle("selected",Number(b.dataset.number)===number));updateOnlineWritingUI();};
window.lockOnlineContent=async function(){
    const s=onlineGame.state;let items=[];
    if(s.room.gameMode==="find-secret-sentence"){
        const content=String(onlineDraftState.contents.secret||"").trim();
        if(!content||!onlineGame.selectedSecretBox)return showOnlineInlineError("online-writing-error","Hãy nhập câu bí mật và chọn một ô giấu.");
        items=[{boxNumber:onlineGame.selectedSecretBox,content,contentType:"secret",isSecret:true}];
    }else{
        const missingSelection=onlineDraftState.selectedBagCount-onlineDraftState.selectedBagIds.length;if(missingSelection>0)return showOnlineInlineError("online-writing-error",`Bạn cần chọn thêm ${missingSelection} vị trí túi mù.`);
        for(const n of onlineDraftState.selectedBagIds){const content=String(onlineDraftState.contents[n]||"").trim();if(!content)return showOnlineInlineError("online-writing-error",`Túi số ${n} chưa có nội dung.`);items.push({boxNumber:n,content,contentType:onlineDraftState.contentTypes[n]||"question",isSecret:false});}
    }
    await runOnlineAction(()=>roomService.saveContent(s.room.id,items,items.length),"Đang khóa nội dung...");
};

function renderOnlineReady(){const panel=document.getElementById("online-ready-panel");panel.classList.remove("hidden");const s=onlineGame.state;panel.innerHTML=`<div class="online-wait-state"><i class="fa-solid fa-circle-check"></i><h3>Cả hai đã hoàn thành</h3><p>Nội dung đã được khóa an toàn trên máy chủ.</p></div><div class="online-players">${onlinePlayersHtml()}</div>${s.me.role==="host"?'<button class="btn btn-primary btn-large" onclick="startOnlineRoom()">Bắt đầu khui túi mù</button>':'<p class="waiting-message">Đang chờ chủ phòng bắt đầu...</p>'}`;}

function renderOnlineMysteryBag(box, player, disabled) {
    return `<button aria-label="Túi mù số ${box.boxNumber} của ${onlineEscape(player.displayName)}" class="online-mystery-box ${box.isOpened ? "opened" : ""}" ${disabled || box.isOpened ? "disabled" : ""} onclick="openOnlineBox('${box.id}',this)"><i class="fa-solid ${box.isOpened ? "fa-box-open" : "fa-question"}"></i><span>Túi ${String(box.boxNumber).padStart(2, "0")}</span></button>`;
}

function renderOnlinePlayerZone(player, state, myTurn) {
    const isMine = player.id === state.me.id;
    const boxes = state.boxes.filter(box => box.ownerPlayerId === player.id).sort((a, b) => a.boxNumber - b.boxNumber);
    const locked = isMine || !myTurn || onlineGame.connection !== "connected";
    return `<section class="online-player-zone ${isMine ? "is-mine" : "is-opponent"}"><div class="online-zone-ribbon"><i class="fa-solid ${isMine ? "fa-lock" : "fa-wand-magic-sparkles"}"></i><span>${isMine ? "Khu vực của bạn" : `Khu vực của ${onlineEscape(player.displayName)}`}</span><small>${boxes.filter(box => !box.isOpened).length} túi</small></div><div class="online-box-grid">${boxes.map(box => renderOnlineMysteryBag(box, player, locked)).join("")}</div></section>`;
}

function renderOnlineTurnStatus(state, current, myTurn) {
    return `<div class="turn-indicator-panel"><div class="active-player-avatar">${onlineEscape(current?.displayName?.charAt(0) || "?")}</div><div class="turn-panel-info"><span class="turn-number-label">LƯỢT ${state.room.turnNumber}</span><h3>${myTurn ? "Đến lượt của bạn" : `Đến lượt ${onlineEscape(current?.displayName || "")}`}</h3><p>${myTurn ? "Chạm vào một túi mù của đối phương để mở." : "Túi của bạn đang được khóa. Hãy chờ đối phương."}</p></div></div>`;
}

function renderOnlineCollectionTray(state) {
    return `<div class="collection-tray"><strong><i class="fa-solid fa-heart"></i> Bộ sưu tập lượt mở</strong><span>${state.boxes.filter(box => box.isOpened).length}/${state.boxes.length} túi đã mở</span></div>`;
}

function renderOnlineBoard() {
    const panel = document.getElementById("online-game-panel");
    panel.classList.remove("hidden");
    const state = onlineGame.state;
    const current = state.players.find(player => player.id === state.room.currentTurnPlayerId);
    const myTurn = current?.id === state.me.id;
    panel.innerHTML = `${renderOnlineTurnStatus(state, current, myTurn)}<div class="online-player-zones">${state.players.map(player => renderOnlinePlayerZone(player, state, myTurn)).join("")}</div>${renderOnlineCollectionTray(state)}`;
}

window.openOnlineBox=async function(boxId,button){if(onlineGame.opening||onlineGame.connection!=="connected")return;onlineGame.opening=true;button?.classList.add("opening");try{const result=await roomService.openBox(onlineGame.state.room.id,boxId,crypto.randomUUID());await new Promise(resolve=>setTimeout(resolve,window.matchMedia("(prefers-reduced-motion: reduce)").matches?40:560));showOnlineBoxResult(result);await refreshOnlineRoom();}catch(e){button?.classList.remove("opening");showToast(getOnlineError(e).message);}finally{onlineGame.opening=false;}};
function showOnlineBoxResult(result){onlineBoxModalActive=true;DOM.modalCardInner.classList.remove("flipped");DOM.modalCardBack.className=`card-back ${result.result==="empty"?"type-empty":"type-secret"}`;DOM.modalOwnerBadge.textContent=`Túi mù của ${result.ownerName}`;DOM.modalTypeIcon.className=result.result==="empty"?"fa-solid fa-box-open":"fa-solid fa-gift";DOM.modalTypeLabel.textContent=result.result==="secret-found"?"Tìm thấy câu bí mật!":result.result==="empty"?"Túi trống":"Nội dung túi mù";DOM.modalSecretContent.textContent=result.content||"Túi này không có nội dung.";DOM.modalActionTip.textContent=result.gameFinished?"Ván chơi đã kết thúc.":"Lượt tiếp theo đã được đồng bộ.";DOM.boxModal.classList.add("active");setTimeout(()=>DOM.modalCardInner.classList.add("flipped"),100);}
window.closeOnlineBoxModal=function(){onlineBoxModalActive=false;DOM.boxModal.classList.remove("active");};

function renderOnlineResult(){const panel=document.getElementById("online-result-panel");panel.classList.remove("hidden");const s=onlineGame.state;const winner=s.players.find(p=>p.id===s.room.winnerPlayerId);const won=winner?.id===s.me.id;const allWantRematch=s.players.length===2&&s.players.every(p=>p.isReady);panel.innerHTML=`<div class="online-result-hero"><i class="fa-solid ${won?"fa-trophy":"fa-flag-checkered"}"></i><h2>${won?"Bạn chiến thắng!":winner?`${onlineEscape(winner.displayName)} chiến thắng!`:"Ván chơi đã kết thúc"}</h2><p>Kết quả đã được đồng bộ trên cả hai thiết bị.</p>${s.room.revealedContent?`<div class="winner-sentence-box"><p>“${onlineEscape(s.room.revealedContent)}”</p></div>`:""}</div><div class="online-players">${onlinePlayersHtml()}</div><div class="online-form-actions"><button class="btn btn-secondary" onclick="leaveOnlineRoom()">Rời phòng</button>${s.me.role==="host"&&allWantRematch?'<button class="btn btn-primary" onclick="confirmOnlineRematch()">Bắt đầu vòng mới</button>':`<button class="btn btn-primary" ${s.me.isReady?"disabled":""} onclick="requestOnlineRematch()">${s.me.isReady?"Đang chờ đối phương":"Chơi lại"}</button>`}</div>`;}

window.requestOnlineRematch=async function(){await runOnlineAction(()=>roomService.requestRematch(onlineGame.state.room.id),"Đang gửi yêu cầu...");};
window.confirmOnlineRematch=async function(){await runOnlineAction(()=>roomService.confirmRematch(onlineGame.state.room.id),"Đang tạo vòng mới...");};
window.leaveOnlineRoom=async function(){if(!confirm("Bạn có chắc muốn rời phòng?"))return;try{if(onlineGame.state)await roomService.leave(onlineGame.state.room.id);}catch(e){}await unsubscribeOnlineRoom();clearOnlineRoomSession();window.location.hash="#/home";};

async function runOnlineAction(action,message){if(onlineGame.loading)return;onlineGame.loading=true;setLoadingState(true,message);try{await action();onlineGame.loading=false;await refreshOnlineRoom(false);}catch(e){showToast(getOnlineError(e).message);}finally{onlineGame.loading=false;setLoadingState(false);}}

async function attemptOnlineReconnect(){const code=localStorage.getItem("currentOnlineRoomCode")||localStorage.getItem("currentRoomCode");if(!code||!isOnlineConfigured())return;try{await roomService.reconnect(code);showToast(`Đã kết nối lại với phòng ${code}.`);if(location.hash==="#/home"||!location.hash)location.hash="#/online-room";}catch(error){const parsed=getOnlineError(error);if(["ROOM_NOT_FOUND","PLAYER_NOT_FOUND","NOT_ROOM_MEMBER"].includes(parsed.code))clearOnlineRoomSession();}}
