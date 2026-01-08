const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const xlsx = require('xlsx'); 
const fs = require('fs');

const authService = require('./app/services/auth');
const productService = require('./app/services/products');
const logService = require('./app/services/logs');
const warningService = require('./app/services/warnings');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280, height: 800, minWidth: 1024,
        webPreferences: {
            preload: path.join(__dirname, 'app/main/preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'app/renderer/assets/icon.png') // İkon varsa
    });

    mainWindow.loadFile('app/renderer/login.html');
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

async function handleResponse(promise) {
    try {
        const data = await promise;
        return { success: true, data };
    } catch (error) {
        console.error('IPC Hatası:', error.message);
        return { success: false, error: error.message };
    }
}

// --- IPC HANDLERS ---

// Auth
ipcMain.handle('auth:login', (_, v) => handleResponse(authService.loginUser(v)));
ipcMain.handle('auth:register', (_, v) => handleResponse(authService.registerUser(v)));
ipcMain.handle('auth:update-info', (_, v) => handleResponse(authService.updateUserInfo(v)));
ipcMain.handle('auth:update-pass', (_, v) => handleResponse(authService.updatePassword(v)));
ipcMain.handle('auth:get-users', () => handleResponse(authService.getAllUsers()));

// Products
ipcMain.handle('product:get-all', () => handleResponse(productService.getProducts()));
ipcMain.handle('product:create', (_, v) => handleResponse(productService.createProductDefinition(v)));
ipcMain.handle('product:update', (_, v) => handleResponse(productService.updateProductDefinition(v)));
ipcMain.handle('product:delete', (_, {id, user_id}) => handleResponse(productService.deleteProduct(id, user_id)));
ipcMain.handle('product:get-serials', (_, id) => handleResponse(productService.getProductSerials(id)));
ipcMain.handle('product:delete-serial', (_, data) => handleResponse(productService.deleteSingleSerial(data)));
ipcMain.handle('dashboard:stats', () => handleResponse(productService.getDashboardStats()));

// Stock
ipcMain.handle('stock:add', (_, v) => handleResponse(productService.addStockWithSerials(v)));
ipcMain.handle('stock:remove', (_, v) => handleResponse(productService.removeStockBySerials(v)));

// Utils
ipcMain.handle('logs:get', (_, {id, role, limit}) => handleResponse(logService.getLogs(id, role, limit)));
ipcMain.handle('logs:dashboard', () => handleResponse(logService.getDashboardLogs()));
ipcMain.handle('warnings:get', () => handleResponse(warningService.getLowStockWarnings()));

// Files
ipcMain.handle('file:select', async (_, filters) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ 
        properties: ['openFile'], 
        filters: filters || [
            { name: 'Veri Dosyaları', extensions: ['xlsx', 'xls', 'txt'] },
            { name: 'Görseller', extensions: ['jpg', 'png', 'jpeg'] }
        ] 
    });
    return canceled ? null : filePaths[0];
});

ipcMain.handle('file:read-serials', async (_, filePath) => {
    try {
        const ext = path.extname(filePath).toLowerCase();
        let serials = [];

        if (ext === '.txt') {
            const content = fs.readFileSync(filePath, 'utf-8');
            serials = content.split(/\r?\n/).map(s => s.trim()).filter(s => s);
        } else if (ext === '.xlsx' || ext === '.xls') {
            const workbook = xlsx.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            serials = data.flat().map(s => String(s).trim()).filter(s => s);
        } else {
            return { success: false, error: 'Desteklenmeyen dosya formatı.' };
        }
        return { success: true, serials };
    } catch (e) { 
        return { success: false, error: 'Dosya okunamadı: ' + e.message }; 
    }
});