import { BrowserWindow, app, ipcMain } from 'electron';
import path from 'path';
import { ObserverAPI } from '../../observer/observer';
import { QTile } from '../../game/map/tile';
import { dialog } from 'electron';

export const createWindow = (observer: ObserverAPI<QTile>) => {
  app.on('ready', () => {
    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      height: 500,
      width: 500,
      show: true,
      webPreferences: {
        offscreen: false,
        sandbox: false,
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, '..', 'preload', 'preload.js')
      }
    };
    const window = new BrowserWindow(windowOptions);

    window.on('ready-to-show', () => {
      window.show();
    });

    window.loadFile('src/electron/renderer/index.html');

    ipcMain.on('next-state', (_event) => observer.nextState());
    ipcMain.on('previous-state', (_event) => observer.previousState());
    ipcMain.on('save-state', (_event) => saveFileHelper(observer));
    observer.setUpdateViewCallback((html: string) => {
      window.webContents.send('update-view', html);
    });
    observer.setEndGameCallback(
      (gameStateHtml: string, endGameCardHtml: string) =>
        window.webContents.send('end-game', gameStateHtml, endGameCardHtml)
    );
  });
  return app.whenReady();
};

async function saveFileHelper(observer: ObserverAPI<QTile>) {
  const { canceled, filePath } = await openDialog();
  if (!canceled && filePath) {
    observer.saveState(filePath);
  }
}

async function openDialog() {
  try {
    // Open the save dialog
    const results = await dialog.showSaveDialog({
      title: 'Select the File Path to save',
      buttonLabel: 'Save',
      // Specify the file type filters here
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: []
    });
    return results;
  } catch (err) {
    console.error('An error occurred: ', err);
    throw err;
  }
}
