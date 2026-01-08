const db = require('./database'); 

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function writeLog(user_id, action, details = '') {
    try {
        await runAsync('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)', [user_id, action, details]);
    } catch (e) { console.error('Loglama Hatası:', e.message); }
}

module.exports = { runAsync, getAsync, allAsync, writeLog };