const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appEnv", {
  electronVersion: process.versions.electron,
});

contextBridge.exposeInMainWorld("electronAPI", {
  googleOAuth: () => ipcRenderer.invoke("auth:google"),
});

