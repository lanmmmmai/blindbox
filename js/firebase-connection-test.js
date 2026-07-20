const firebaseState = {
    authStatus: "loading",
    connectionStatus: "idle",
    currentUser: null,
    error: null
};
let unsubscribeFirebaseConnectionTest = null;

function getFirebaseErrorMessage(error) {
    const code = String(error?.code || "");
    if (code.includes("auth/operation-not-allowed") || code.includes("auth/admin-restricted-operation")) return "Anonymous Authentication chưa được bật.";
    if (code.includes("auth/network-request-failed")) return "Không thể kết nối đến Firebase Authentication.";
    if (code.includes("permission-denied")) return "Firestore Rules đang từ chối yêu cầu.";
    if (code.includes("not-found")) return "Cloud Firestore chưa được tạo.";
    if (code.includes("unavailable")) return "Cloud Firestore hiện không khả dụng.";
    return "Không thể kết nối Firebase.";
}

function updateFirebaseConnectionUI(message, isError = false) {
    const status = document.getElementById("firebase-connection-status");
    const uid = document.getElementById("firebase-user-id");
    if (status) { status.textContent = message; status.className = `firebase-status-message ${isError ? "error" : firebaseState.connectionStatus}`; }
    if (uid) uid.textContent = firebaseState.currentUser ? `UID ẩn danh: ${firebaseState.currentUser.uid}` : "";
    document.querySelectorAll("[data-online-entry]").forEach(button => { button.disabled = firebaseState.connectionStatus !== "connected"; });
    const notice = document.getElementById("firebase-home-notice");
    if (notice) {
        notice.classList.toggle("hidden", firebaseState.connectionStatus === "connected");
        notice.textContent = isError ? `${message} Bạn vẫn có thể chơi trên cùng một thiết bị.` : "Đang chuẩn bị chức năng online...";
    }
}

async function testFirebaseConnection(uid, callback) {
    const runtime = await initFirebaseRuntime();
    const { doc, getDoc, onSnapshot, serverTimestamp, setDoc } = runtime.firestoreSdk;
    const ref = doc(runtime.db, "connection_tests", uid);
    await setDoc(ref, { uid, status: "connected", message: "Firebase đã kết nối thành công", updatedAt: serverTimestamp() }, { merge: true });
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new Error("FIRESTORE_TEST_DOCUMENT_MISSING");
    if (unsubscribeFirebaseConnectionTest) unsubscribeFirebaseConnectionTest();
    unsubscribeFirebaseConnectionTest = onSnapshot(ref, snap => callback({ success: snap.exists(), data: snap.data() }), error => callback({ success: false, error }));
    return stopFirebaseConnectionTest;
}

function stopFirebaseConnectionTest() {
    if (unsubscribeFirebaseConnectionTest) unsubscribeFirebaseConnectionTest();
    unsubscribeFirebaseConnectionTest = null;
}

async function initializeFirebaseConnection() {
    if (!isOnlineConfigured()) {
        firebaseState.authStatus = "error"; firebaseState.connectionStatus = "error";
        return updateFirebaseConnectionUI("Chưa cấu hình Firebase.", true);
    }
    firebaseState.authStatus = "loading"; firebaseState.connectionStatus = "idle";
    updateFirebaseConnectionUI("Đang đăng nhập ẩn danh...");
    try {
        const user = await ensureAnonymousUser();
        firebaseState.currentUser = user; firebaseState.authStatus = "authenticated"; firebaseState.connectionStatus = "loading";
        updateFirebaseConnectionUI("Đang kết nối Cloud Firestore...");
        await testFirebaseConnection(user.uid, result => {
            if (!result.success) {
                firebaseState.connectionStatus = "disconnected"; firebaseState.error = result.error;
                updateFirebaseConnectionUI("Mất kết nối Firebase.", true); return;
            }
            firebaseState.connectionStatus = "connected"; firebaseState.error = null;
            updateFirebaseConnectionUI("Firebase đã kết nối thành công.");
        });
    } catch (error) {
        firebaseState.authStatus = "error"; firebaseState.connectionStatus = "error"; firebaseState.error = error;
        console.error("Firebase initialization failed:", error?.code || error?.message);
        updateFirebaseConnectionUI(getFirebaseErrorMessage(error), true);
    }
}

window.retryFirebaseConnection = initializeFirebaseConnection;
