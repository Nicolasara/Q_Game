import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  nextState: () => ipcRenderer.send('next-state'),
  previousState: () => ipcRenderer.send('previous-state'),
  saveState: () => ipcRenderer.send('save-state'),
  updateViewHandler: (
    updateView: (_event: Electron.IpcRendererEvent, html: string) => void
  ) => ipcRenderer.on('update-view', updateView),
  endGameHandler: (
    endGame: (
      _event: Electron.IpcRendererEvent,
      gameStateHtml: string,
      endGameCardHtml: string
    ) => void
  ) => ipcRenderer.on('end-game', endGame)
});
