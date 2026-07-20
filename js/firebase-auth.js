let firebaseRuntimePromise = null;
let anonymousUserPromise = null;

function isOnlineConfigured() {
    const c = window.FIREBASE_CONFIG || {};
    return Boolean(c.apiKey && c.projectId && c.appId);
}

async function initFirebaseRuntime() {
    if (!isOnlineConfigured()) return null;
    if (firebaseRuntimePromise) return firebaseRuntimePromise;
    firebaseRuntimePromise = (async () => {
        const version = "10.12.5";
        const [appSdk, authSdk, firestoreSdk, functionsSdk] = await Promise.all([
            import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
            import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
            import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`),
            import(`https://www.gstatic.com/firebasejs/${version}/firebase-functions.js`)
        ]);
        const app = appSdk.initializeApp(window.FIREBASE_CONFIG);
        if (window.FIREBASE_CONFIG.appCheckSiteKey && !["localhost", "127.0.0.1"].includes(location.hostname)) {
            const appCheckSdk = await import(`https://www.gstatic.com/firebasejs/${version}/firebase-app-check.js`);
            appCheckSdk.initializeAppCheck(app, { provider: new appCheckSdk.ReCaptchaV3Provider(window.FIREBASE_CONFIG.appCheckSiteKey), isTokenAutoRefreshEnabled: true });
        }
        const auth = authSdk.getAuth(app);
        await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
        const db = firestoreSdk.getFirestore(app);
        const functions = functionsSdk.getFunctions(app, window.FIREBASE_CONFIG.functionsRegion || "asia-southeast1");
        if (location.hostname === "localhost" && window.FIREBASE_USE_EMULATORS) {
            authSdk.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
            firestoreSdk.connectFirestoreEmulator(db, "127.0.0.1", 8080);
            functionsSdk.connectFunctionsEmulator(functions, "127.0.0.1", 5001);
        }
        return { app, auth, db, functions, authSdk, firestoreSdk, functionsSdk };
    })().catch(error => { firebaseRuntimePromise = null; throw error; });
    return firebaseRuntimePromise;
}

async function ensureAnonymousUser() {
    const runtime = await initFirebaseRuntime();
    if (!runtime) throw new Error("ONLINE_NOT_CONFIGURED");
    if (runtime.auth.currentUser) return runtime.auth.currentUser;
    if (!anonymousUserPromise) {
        anonymousUserPromise = runtime.authSdk.signInAnonymously(runtime.auth)
            .then(credential => credential.user)
            .finally(() => { anonymousUserPromise = null; });
    }
    return anonymousUserPromise;
}

async function observeAuthState(callback) {
    const runtime = await initFirebaseRuntime();
    return runtime.authSdk.onAuthStateChanged(runtime.auth, callback);
}

function clearOnlineRoomSession() {
    localStorage.removeItem("currentOnlineRoomCode");
    localStorage.removeItem("currentRoomCode");
    localStorage.removeItem("currentPlayerId");
}
