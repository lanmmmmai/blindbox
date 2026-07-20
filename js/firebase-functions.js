async function callFirebaseFunction(name, data = {}) {
    await ensureAnonymousUser();
    const runtime = await initFirebaseRuntime();
    const callable = runtime.functionsSdk.httpsCallable(runtime.functions, name);
    const result = await callable(data);
    return result.data;
}
