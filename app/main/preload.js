const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Auth
    login: (d) => ipcRenderer.invoke('auth:login', d),
    register: (d) => ipcRenderer.invoke('auth:register', d),
    updateUserInfo: (d) => ipcRenderer.invoke('auth:update-info', d),
    updatePassword: (d) => ipcRenderer.invoke('auth:update-pass', d),
    getAllUsers: () => ipcRenderer.invoke('auth:get-users'),

    // Products
    getProducts: () => ipcRenderer.invoke('product:get-all'),
    createProduct: (d) => ipcRenderer.invoke('product:create', d),
    updateProduct: (d) => ipcRenderer.invoke('product:update', d),
    deleteProduct: (d) => ipcRenderer.invoke('product:delete', d),
    getProductSerials: (id) => ipcRenderer.invoke('product:get-serials', id),
    deleteSingleSerial: (data) => ipcRenderer.invoke('product:delete-serial', data),
    
    // Stock
    addStockSerials: (d) => ipcRenderer.invoke('stock:add', d),
    removeStockSerials: (d) => ipcRenderer.invoke('stock:remove', d),
    
    // Utils & Logs
    getRecentLogs: (d) => ipcRenderer.invoke('logs:get', d),
    getLowStock: () => ipcRenderer.invoke('warnings:get'),
    getDashboardLogs: () => ipcRenderer.invoke('logs:dashboard'),
    
    // Files
    selectFile: (f) => ipcRenderer.invoke('file:select', f),
    readExcelSerials: (p) => ipcRenderer.invoke('file:read-serials', p),

    // Storage
    setStorage: (k, v) => localStorage.setItem(k, v),
    getStorage: (k) => localStorage.getItem(k),
    clearStorage: () => localStorage.clear(),

    // Dashboard
    getDashboardStats: () => ipcRenderer.invoke('dashboard:stats')
});