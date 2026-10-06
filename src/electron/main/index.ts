import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let secureWindow: BrowserWindow | null = null;
let launchArgUrl: string | null = null;

// Register custom protocol 'saraexam'
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('saraexam', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('saraexam');
}

// Handle second-instance when user clicks saraexam:// while app is running
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Find protocol argument in Windows commandLine
    const url = commandLine.find((arg) => arg.startsWith('saraexam://'));
    if (url) {
      handleProtocolLaunch(url);
    }
  });
}

function parseProtocolUrl(rawUrl: string): { examId?: string; attemptId: string; token: string; domain?: string } | null {
  try {
    const urlObj = new URL(rawUrl);
    const examId = urlObj.searchParams.get('examId');
    const attemptId = urlObj.searchParams.get('attemptId');
    const token = urlObj.searchParams.get('token');
    const domain = urlObj.searchParams.get('domain');
    if (attemptId && token) {
      return { examId: examId || undefined, attemptId, token, domain: domain || undefined };
    }
  } catch (e) {
    console.error('Failed to parse protocol URL:', rawUrl, e);
  }
  return null;
}

function createSecureExamWindow(examTargetUrl: string) {
  if (secureWindow) {
    secureWindow.focus();
    return;
  }

  secureWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    kiosk: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    closable: false,
    icon: path.join(app.getAppPath(), 'public', 'LOGO.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
      webSecurity: false
    }
  });

  secureWindow.loadURL(examTargetUrl);

  // Restrict navigation strictly to SARA EXAMS web application origin
  secureWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const allowedOrigin = new URL(examTargetUrl).origin;
      if (!navigationUrl.startsWith(allowedOrigin) && !navigationUrl.startsWith('file://')) {
        event.preventDefault();
        console.warn('Blocked external navigation attempt to:', navigationUrl);
      }
    } catch (e) {
      event.preventDefault();
    }
  });

  // Allow Google Auth & Firebase popups to open floating above secureWindow
  secureWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isAuthUrl =
      url.includes('google.com') ||
      url.includes('accounts.google.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('identitytoolkit.googleapis.com');

    if (isAuthUrl) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          alwaysOnTop: true,
          center: true,
          width: 520,
          height: 650,
          frame: true,
          autoHideMenuBar: true,
          title: 'Sign in - Google Accounts',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }
    return { action: 'deny' };
  });

  // Security auditing: Monitor window focus loss
  secureWindow.on('blur', () => {
    if (secureWindow && !secureWindow.isDestroyed()) {
      // Do not steal focus or flag security events if an allowed child/auth window is focused
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow && focusedWindow !== secureWindow) {
        return;
      }

      secureWindow.webContents.send('security-event', {
        type: 'FOCUS_LOST',
        timestamp: new Date().toISOString()
      });
      // Attempt to restore focus & fullscreen
      setTimeout(() => {
        if (secureWindow && !secureWindow.isDestroyed()) {
          const currentFocused = BrowserWindow.getFocusedWindow();
          if (!currentFocused || currentFocused === secureWindow) {
            secureWindow.setFullScreen(true);
            secureWindow.focus();
          }
        }
      }, 500);
    }
  });

  // Prevent Alt+F4 / Window Close while exam attempt is active
  secureWindow.on('close', (event) => {
    // If close action was explicitly invoked by submission handler, allow it
    if (secureWindow && (secureWindow as any).isSubmittedCleanly) {
      return;
    }
    event.preventDefault();
    if (secureWindow && !secureWindow.isDestroyed()) {
      secureWindow.webContents.send('security-event', {
        type: 'APPLICATION_CLOSE_ATTEMPT',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Block keyboard shortcuts
  const shortcutsToBlock = [
    'CommandOrControl+C',
    'CommandOrControl+V',
    'CommandOrControl+X',
    'CommandOrControl+A',
    'CommandOrControl+R',
    'CommandOrControl+W',
    'CommandOrControl+N',
    'CommandOrControl+T',
    'CommandOrControl+Shift+I',
    'F5',
    'F11',
    'F12',
    'Alt+Left',
    'Alt+Right'
  ];
  shortcutsToBlock.forEach((shortcut) => {
    try {
      globalShortcut.register(shortcut, () => {});
    } catch (_) {}
  });
}

function handleProtocolLaunch(rawUrl: string) {
  const parsed = parseProtocolUrl(rawUrl);
  if (!parsed) {
    console.error('Invalid protocol launch payload:', rawUrl);
    return;
  }
  const defaultBaseUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5176';
  const baseUrl = parsed.domain ? decodeURIComponent(parsed.domain) : defaultBaseUrl;
  const targetExamId = parsed.examId || parsed.attemptId;
  const examUrl = `${baseUrl}/exam/${targetExamId}?token=${parsed.token}`;

  if (app.isReady()) {
    createSecureExamWindow(examUrl);
  } else {
    launchArgUrl = examUrl;
  }
}

// Check initial process arguments on app launch (Windows cold start)
const initialProtocolUrl = process.argv.find((arg) => arg.startsWith('saraexam://'));
if (initialProtocolUrl) {
  handleProtocolLaunch(initialProtocolUrl);
}

app.whenReady().then(() => {
  if (launchArgUrl) {
    createSecureExamWindow(launchArgUrl);
  } else if (process.env.NODE_ENV === 'development') {
    // Development fallback
    const baseUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5176';
    ipcMain.handle('open-secure-exam', (_event, targetUrl: string) => {
      createSecureExamWindow(targetUrl);
    });
  }

  // Admin kiosk test handler (enabled in development or when ADMIN_KIOSK_TEST=true)
  if (process.env.NODE_ENV === 'development' || process.env.ADMIN_KIOSK_TEST === 'true') {
    ipcMain.handle('open-kiosk-test', async (_event, targetUrl: string) => {
      // Force kiosk mode window for admin testing purposes
      createSecureExamWindow(targetUrl);
    });
  }

  ipcMain.handle('close-secure-exam', () => {
    if (secureWindow && !secureWindow.isDestroyed()) {
      (secureWindow as any).isSubmittedCleanly = true;
      secureWindow.close();
      secureWindow = null;
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
