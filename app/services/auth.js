const { runAsync, getAsync, allAsync, writeLog } = require('./database-utils'); 
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

module.exports.getAllUsers = async () => {
    return await allAsync("SELECT id, name_surname, username, email, role, created_at FROM users ORDER BY created_at DESC");
};

module.exports.updateUserInfo = async ({ id, username, email }) => {
    const check = await getAsync(
        `SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?`, 
        [username, email, id]
    );
    if (check) throw new Error('Bu Kullanıcı Adı veya E-posta başka biri tarafından kullanılıyor.');
    
    await runAsync(`UPDATE users SET username = ?, email = ? WHERE id = ?`, [username, email, id]);
    return await getAsync('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [id]);
};

module.exports.updatePassword = async ({ id, oldPassword, newPassword, user_id }) => {
    const user = await getAsync('SELECT password_hash FROM users WHERE id = ?', [id]);
    if (!user) throw new Error('Kullanıcı bulunamadı.');
    
    const match = await bcrypt.compare(oldPassword, user.password_hash);
    if (!match) throw new Error('Mevcut şifrenizi yanlış girdiniz.');
    
    const newHash = await bcrypt.hash(newPassword, 10);
    await runAsync('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, id]);
    await writeLog(user_id, 'pass_updated', '{}');
    return { success: true };
};

module.exports.registerUser = async ({ name_surname, username, email, phone_number, password }) => {
  if (!email || !password || !username || !name_surname) throw new Error('Zorunlu alanları doldurun.');
  
  const existing = await getAsync('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) throw new Error('Bu e-posta adresi zaten kayıtlı.');

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const res = await runAsync(
      'INSERT INTO users (name_surname, username, email, phone_number, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)', 
      [name_surname, username, email, phone_number || null, hash, 'user']
  );
  
  await writeLog(res.lastID, 'register', JSON.stringify({ email }));
  return { id: res.lastID, username, role: 'user' };
};

module.exports.loginUser = async ({ email, password }) => {
  if (!email || !password) throw new Error('Bilgiler eksik.');

  const user = await getAsync('SELECT * FROM users WHERE email = ? OR username = ?', [email, email]);
  if (!user) throw new Error('Kullanıcı bulunamadı.');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error('Şifre hatalı.');

  await writeLog(user.id, 'login', JSON.stringify({}));
  return { id: user.id, username: user.username, email: user.email, role: user.role, settings: user.settings };
};