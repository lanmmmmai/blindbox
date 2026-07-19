/* ==========================================================================
   ROUTER.JS - BỘ ĐIỀU HƯỚNG SINGLE PAGE APPLICATION (SPA) HASH-BASED
   ========================================================================== */

const APP_ROUTES = {
    HOME: "home",
    CREATE: "create",
    LOBBY: "lobby",
    INPUT: "input",
    PRIVACY: "privacy",
    READY: "ready",
    GAME: "game",
    HISTORY: "history",
    SETTINGS: "settings",
    HELP: "help"
};

// Route mặc định
let currentActiveRoute = APP_ROUTES.HOME;

// 1. KHỞI TẠO BỘ ĐIỀU HƯỚNG
function initRouter() {
    window.addEventListener("hashchange", handleRouting);
    window.addEventListener("load", handleRouting);
    
    // Đăng ký sự kiện click điều hướng cho bottom navigation & sidebar
    const navButtons = document.querySelectorAll(".nav-item, .sidebar-item");
    navButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const route = btn.getAttribute("data-route");
            if (route) {
                navigateTo(route);
            }
        });
    });
}

// 2. CHUYỂN TRANG
function navigateTo(route, options = {}) {
    playSound('pop');
    
    // Nếu chuyển sang ván chơi, kiểm tra xem có ván đang hoạt động không
    if (route === APP_ROUTES.GAME) {
        const currentGame = getCurrentGame();
        if (!currentGame) {
            // Nếu không có ván nào đang dở, chuyển hướng sang Tạo ván chơi mới
            window.location.hash = `#/${APP_ROUTES.CREATE}`;
            return;
        } else {
            // Khôi phục phase ván chơi tương ứng
            restoreGamePhaseRoute(currentGame);
            return;
        }
    }

    window.location.hash = `#/${route}`;
}
window.navigateTo = navigateTo;

// Khôi phục route ván chơi dựa trên gameState.phase
function restoreGamePhaseRoute(game) {
    if (!game) return;
    
    // Phân phối phase sang route
    if (game.phase === "setup") {
        window.location.hash = `#/${APP_ROUTES.CREATE}`;
    } else if (game.phase === "input-intro" || game.phase === "player-input") {
        window.location.hash = `#/${APP_ROUTES.INPUT}`;
    } else if (game.phase === "privacy-screen") {
        window.location.hash = `#/${APP_ROUTES.PRIVACY}`;
    } else if (game.phase === "ready-to-play") {
        window.location.hash = `#/${APP_ROUTES.READY}`;
    } else if (game.phase === "opening" || game.phase === "turn-transition") {
        window.location.hash = `#/${APP_ROUTES.GAME}`;
    } else if (game.phase === "result") {
        window.location.hash = `#/${APP_ROUTES.GAME}`; // Hiển thị board kết thúc
    }
}

// 3. XỬ LÝ ĐIỀU HƯỚNG
function handleRouting() {
    let hash = window.location.hash || `#/home`;
    let route = hash.replace(/^#\//, "");
    
    // Tách param nếu có (ví dụ: game-details/game-uuid)
    let params = null;
    if (route.includes("/")) {
        const parts = route.split("/");
        route = parts[0];
        params = parts.slice(1).join("/");
    }

    // Kiểm tra route hợp lệ
    const validRoutes = Object.values(APP_ROUTES);
    if (!validRoutes.includes(route)) {
        route = APP_ROUTES.HOME;
        window.location.hash = `#/home`;
    }

    currentActiveRoute = route;
    
    // Ẩn tất cả các màn hình view
    const views = document.querySelectorAll(".app-view");
    views.forEach(v => v.classList.remove("active"));

    // Hiển thị view hiện tại
    const targetView = document.getElementById(`view-${route}`);
    if (targetView) {
        targetView.classList.add("active");
        focusScreenTitle(targetView);
    }

    // Cập nhật trạng thái active trên Bottom Nav & Sidebar
    updateNavigationUI(route);

    // Quản lý việc ẩn hiện thanh điều hướng bảo mật thông tin
    controlNavigationVisibility(route);

    // Gọi các hàm render đặc trưng của từng route
    dispatchViewRenderer(route, params);
}

// Cập nhật class active trên nút điều hướng
function updateNavigationUI(route) {
    const navItems = document.querySelectorAll(".nav-item, .sidebar-item");
    navItems.forEach(item => {
        const itemRoute = item.getAttribute("data-route");
        if (itemRoute === route) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });
}

// Ẩn Bottom Nav & Sidebar trên các màn hình bảo mật/nhập liệu
function controlNavigationVisibility(route) {
    const sensitiveRoutes = [
        APP_ROUTES.CREATE,
        APP_ROUTES.LOBBY,
        APP_ROUTES.INPUT,
        APP_ROUTES.PRIVACY,
        APP_ROUTES.READY
    ];

    const bottomNav = document.querySelector(".bottom-navigation");
    const sidebarNav = document.querySelector(".sidebar-navigation");
    const mainShell = document.querySelector(".app-shell");

    const isSensitive = sensitiveRoutes.includes(route);

    if (bottomNav) {
        if (isSensitive) {
            bottomNav.classList.add("hidden");
            mainShell.classList.remove("app-shell-padding");
        } else {
            bottomNav.classList.remove("hidden");
            mainShell.classList.add("app-shell-padding");
        }
    }

    if (sidebarNav) {
        if (isSensitive) {
            sidebarNav.style.display = "none";
        } else {
            // Chỉ hiện sidebar trên màn hình lớn
            if (window.innerWidth >= 769) {
                sidebarNav.style.display = "flex";
            }
        }
    }
}

// Phân phối render view tương ứng
function dispatchViewRenderer(route, params) {
    if (route === APP_ROUTES.HOME) {
        renderHomeView();
    } else if (route === APP_ROUTES.CREATE) {
        renderCreateGameView();
    } else if (route === APP_ROUTES.LOBBY) {
        renderLobbyView();
    } else if (route === APP_ROUTES.INPUT) {
        renderInputView();
    } else if (route === APP_ROUTES.PRIVACY) {
        renderPrivacyView();
    } else if (route === APP_ROUTES.READY) {
        renderReadyView();
    } else if (route === APP_ROUTES.GAME) {
        renderGamePlayView();
    } else if (route === APP_ROUTES.HISTORY) {
        renderHistoryView(params);
    } else if (route === APP_ROUTES.SETTINGS) {
        renderSettingsView();
    } else if (route === APP_ROUTES.HELP) {
        renderHelpView();
    }
}

// Focus tiêu đề chính khi đổi route
function focusScreenTitle(viewNode) {
    if (!viewNode) return;
    const title = viewNode.querySelector("h2, h1");
    if (title) {
        title.setAttribute("tabindex", "-1");
        title.focus();
        title.addEventListener("blur", () => title.removeAttribute("tabindex"), { once: true });
    }
}
