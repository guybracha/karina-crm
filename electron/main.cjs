const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const express = require("express");
const ElectronGoogleOAuth2 = require("electron-google-oauth2").default;

const isDev = process.env.ELECTRON_START_URL !== undefined;

let staticServer;
let staticPort;

async function ensureStaticServer() {
  if (staticServer) return staticPort;
  const srvApp = express();
  const distDir = path.join(__dirname, "../dist");
  srvApp.use(express.static(distDir));
  srvApp.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
  await new Promise((resolve) => {
    staticServer = srvApp.listen(0, () => {
      staticPort = staticServer.address().port;
      resolve();
    });
  });
  return staticPort;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
    win.webContents.openDevTools();
  } else {
    const port = await ensureStaticServer();
    win.loadURL(`http://localhost:${port}`);
    // Uncomment for debugging packaged app
    // win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  if (staticServer) {
    try { staticServer.close(); } catch (_) {}
  }
});

ipcMain.handle("auth:google", async () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
  if (!clientId) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID");
  }

  const scopes = ["openid", "email", "profile"];
  const oauth = new ElectronGoogleOAuth2(clientId, "", scopes, {
    successRedirectURL: "urn:ietf:wg:oauth:2.0:oob",
  });

  try {
    const tokens = await oauth.openAuthWindowAndGetTokens();
    return tokens;
  } catch (err) {
    const message = err?.message || "Google OAuth failed";
    throw new Error(message);
  }
});
