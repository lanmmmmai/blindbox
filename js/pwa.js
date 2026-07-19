/* ==========================================================================
   PWA.JS - ĐĂNG KÝ SERVICE WORKER & QUẢN LÝ CÀI ĐẶT PWA
   ========================================================================== */

let deferredInstallPrompt = null;

// 1. ĐĂNG KÝ SERVICE WORKER (SW)
function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./service-worker.js")
                .then((reg) => {
                    console.log("[PWA] Service Worker đăng ký thành công với scope:", reg.scope);
                })
                .catch((err) => {
                    console.error("[PWA] Service Worker đăng ký thất bại:", err);
                });
        });
    }
}

// 2. LẮNG NGHE SỰ KIỆN CÀI ĐẶT
function initPwaInstallControls() {
    window.addEventListener("beforeinstallprompt", (e) => {
        // Ngăn chặn trình duyệt hiển thị popup cài đặt mặc định
        e.preventDefault();
        // Lưu trữ sự kiện để kích hoạt sau
        deferredInstallPrompt = e;
        
        // Hiển thị nút cài đặt trong view settings
        showInstallButton();
    });

    window.addEventListener("appinstalled", (e) => {
        console.log("[PWA] Ứng dụng đã được cài đặt lên thiết bị!");
        deferredInstallPrompt = null;
        hideInstallButton();
        showToast("Cài đặt ứng dụng thành công!");
    });
}

function showInstallButton() {
    const installRow = document.getElementById("settings-install-pwa-row");
    const installBtn = document.getElementById("btn-install-pwa");
    if (installRow && installBtn) {
        installRow.classList.remove("hidden");
        installBtn.addEventListener("click", triggerPwaInstall);
    }
}

function hideInstallButton() {
    const installRow = document.getElementById("settings-install-pwa-row");
    if (installRow) {
        installRow.classList.add("hidden");
    }
}

function triggerPwaInstall() {
    if (!deferredInstallPrompt) {
        showToast("Trình duyệt của bạn không hỗ trợ cài đặt trực tiếp.");
        return;
    }
    
    playSound('lock');
    // Hiển thị banner cài đặt
    deferredInstallPrompt.prompt();
    
    // Đợi phản hồi của người dùng
    deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
            console.log("[PWA] Người dùng đã đồng ý cài đặt ứng dụng!");
        } else {
            console.log("[PWA] Người dùng từ chối cài đặt ứng dụng.");
        }
        deferredInstallPrompt = null;
        hideInstallButton();
    });
}
