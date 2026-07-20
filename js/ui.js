/* ==========================================================================
   UI.JS - QUẢN LÝ TIỆN ÍCH GIAO DIỆN, ÂM THANH, HIỆU ỨNG & THEME
   ========================================================================== */

let isAudioInitialized = false;

// 1. QUẢN LÝ THEME (LIGHT / DARK / SYSTEM)
function setTheme(theme) {
    if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", systemTheme);
    } else {
        document.documentElement.setAttribute("data-theme", theme);
    }
    
    appData.settings.theme = theme;
    saveAppData();
    updateThemeUI(theme);
}

// Cập nhật giao diện nút theme tương ứng
function updateThemeUI(theme) {
    const themeIcon = document.getElementById("btn-toggle-theme");
    if (!themeIcon) return;
    
    const icon = themeIcon.querySelector("i");
    if (!icon) return;

    if (theme === "dark") {
        icon.className = "fa-solid fa-sun";
        themeIcon.classList.add("active");
        themeIcon.setAttribute("title", "Chuyển sang chế độ Sáng");
    } else if (theme === "light") {
        icon.className = "fa-solid fa-moon";
        themeIcon.classList.remove("active");
        themeIcon.setAttribute("title", "Chuyển sang chế độ Tối");
    } else {
        // Chế độ hệ thống
        icon.className = "fa-solid fa-circle-half-stroke";
        themeIcon.classList.remove("active");
        themeIcon.setAttribute("title", "Chuyển sang chế độ Tối (Theo hệ thống)");
    }
}

// Tự động lắng nghe thay đổi theme của hệ thống
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (appData.settings.theme === "system") {
        document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    }
});

// 2. HỆ THỐNG ÂM THANH WEB AUDIO API TẬP TRUNG
function initAudioContext() {
    if (!isAudioInitialized) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        isAudioInitialized = true;
    }
}

function playSound(type) {
    if (!appData.settings.soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.50, now + 0.3);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
    } 
    else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.25);
        gainNode.gain.setValueAtTime(0.16, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
    } 
    else if (type === 'lock') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }
    else if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
    }
    else if (type === 'hover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.015, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    }
}

// 3. TOAST NOTIFICATION HỆ THỐNG
let uiToastTimeout = null;
function showToast(message) {
    const toast = document.getElementById("toast-notification");
    const toastMsg = document.getElementById("toast-message");
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.remove("hidden");
    
    if (uiToastTimeout) clearTimeout(uiToastTimeout);
    uiToastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, 2500);
}

// 4. CONFETTI HIỆU ỨNG CHIẾN THẮNG
function runConfetti() {
    if (!appData.settings.effectsEnabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
    });
}

// 5. TRẠNG THÁI LOADING (SKELETON / LOADING OVERLAY)
function setLoadingState(isLoading, message = "Đang xử lý...") {
    let loader = document.getElementById("app-global-loader");
    
    // Nếu chưa có loader DOM, tạo động
    if (!loader) {
        loader = document.createElement("div");
        loader.id = "app-global-loader";
        loader.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 13, 25, 0.6);
            backdrop-filter: blur(4px);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 15px;
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
            font-weight: 700;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        `;
        loader.innerHTML = `
            <div class="game-loader-card">
                <div class="game-loader-bag"><i class="fa-solid fa-question"></i></div>
                <div id="app-global-loader-text">${message}</div>
                <div class="game-loader-dots"><i></i><i></i><i></i></div>
            </div>`;
        document.body.appendChild(loader);
    }

    const textNode = document.getElementById("app-global-loader-text");
    if (textNode) textNode.textContent = message;

    if (isLoading) {
        loader.style.opacity = "1";
        loader.style.pointerEvents = "auto";
    } else {
        loader.style.opacity = "0";
        loader.style.pointerEvents = "none";
    }
}
