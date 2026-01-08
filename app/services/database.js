const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', '..', 'database', 'stokio.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_surname TEXT,
    username TEXT,
    email TEXT UNIQUE,
    phone_number TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'user', 
    settings TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_code TEXT UNIQUE,
    name TEXT,
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    supplier TEXT, 
    image_path TEXT,        
    description TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS product_serials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    serial_number TEXT UNIQUE,
    status TEXT DEFAULT 'IN_STOCK',
    source TEXT,       
    invoice_no TEXT,   
    recipient TEXT,
    import_date DATETIME DEFAULT CURRENT_TIMESTAMP, 
    sold_date DATETIME,
    notes TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_serial_number ON product_serials(serial_number)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_product_id ON product_serials(product_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_status ON product_serials(status)`);

  db.run(`CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    type TEXT,
    qty INTEGER,
    user_id INTEGER,
    source TEXT,      
    invoice_no TEXT,
    batch_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = db;