const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Platform info
  platform: process.platform,
  
  // Listen for menu events
  onMenuNewCase: (callback) => ipcRenderer.on('menu-new-case', callback),
  onMenuNewClient: (callback) => ipcRenderer.on('menu-new-client', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Expose minimal API for knowing we're in Electron
contextBridge.exposeInMainWorld('isElectron', true);
