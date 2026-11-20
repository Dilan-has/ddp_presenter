const { app, BrowserWindow } = require('electron')
const path = require('path')
const http = require('http')

let mainWindow

function waitForServer(port, maxAttempts = 40) {
  return new Promise((resolve) => {
    let attempts = 0

    function check() {
      attempts++
      const req = http.get(`http://localhost:${port}/api/projection/state`, (res) => {
        resolve(true)
      })
      req.on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(check, 300)
        } else {
          resolve(false)
        }
      })
      req.end()
    }

    setTimeout(check, 500)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'DDP Presenter',
    autoHideMenuBar: true,
  })

  mainWindow.loadURL('http://localhost:3001')

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  // Datos en Documentos/DDP Presenter — fácil de encontrar y hacer backup
  process.env.DATA_DIR = path.join(app.getPath('documents'), 'DDP Presenter')

  // Start the Express + WebSocket server (runs in-process)
  await import('./server.js')

  const ready = await waitForServer(3001)
  if (!ready) {
    console.error('[Electron] El servidor no pudo iniciarse.')
    app.quit()
    return
  }

  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
