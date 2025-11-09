const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ElectronGoogleOAuth2 = require('electron-google-oauth2').default;

const isDev = !app.isPackaged || process.env.ELECTRON_START_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('auth:google', async () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  if (!clientId) throw new Error('Missing GOOGLE_OAUTH_CLIENT_ID');

  const scopes = ['openid', 'email', 'profile'];
  const oauth = new ElectronGoogleOAuth2(clientId, '', scopes, {
    successRedirectURL: 'urn:ietf:wg:oauth:2.0:oob',
  });

  const tokens = await oauth.openAuthWindowAndGetTokens();
  return tokens;
});