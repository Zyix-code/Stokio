const { runAsync, getAsync, allAsync, writeLog } = require('./database-utils'); 
const db = require('./database'); 
const path = require('path');
const fs = require('fs/promises'); 

const PROJECT_ROOT = path.join(__dirname, '..', '..'); 
const PRODUCT_IMAGE_DIR = path.join(PROJECT_ROOT, 'product_images');

async function ensureImageDir() {
  try { await fs.mkdir(PRODUCT_IMAGE_DIR, { recursive: true }); } catch (e) {}
}
ensureImageDir();

async function deleteOldImage(imagePath) {
    if (imagePath) {
        try { await fs.unlink(path.join(PROJECT_ROOT, imagePath)).catch(() => {}); } catch (e) {}
    }
}

module.exports.getProducts = async () => {
  return await allAsync('SELECT * FROM products ORDER BY name ASC');
};

module.exports.getProductSerials = async (product_id) => {
    return await allAsync(
        "SELECT id, serial_number, import_date, sold_date, status, source, notes, invoice_no, recipient FROM product_serials WHERE product_id = ? ORDER BY import_date DESC",
        [product_id]
    );
};

module.exports.getDashboardStats = async () => {
    const inMove = await getAsync(`SELECT SUM(qty) as total FROM stock_movements WHERE type = 'IN' AND created_at >= date('now', '-30 days')`);
    const outMove = await getAsync(`SELECT SUM(qty) as total FROM stock_movements WHERE type = 'OUT' AND created_at >= date('now', '-30 days')`);
    const topProducts = await allAsync(`
        SELECT p.name, COUNT(sm.id) as count 
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        WHERE sm.type = 'OUT'
        GROUP BY sm.product_id
        ORDER BY count DESC LIMIT 5
    `);
    return {
        totalIn: inMove ? (inMove.total || 0) : 0,
        totalOut: outMove ? (outMove.total || 0) : 0,
        topProducts
    };
};

module.exports.createProductDefinition = async ({ model_code, name, min_stock, image_temp_path, description, user_id }) => {
    const finalCode = model_code?.trim().toUpperCase();
    if (!name || !finalCode) throw new Error('Ürün adı ve Model kodu zorunludur.');

    const checkExisting = await getAsync('SELECT id FROM products WHERE model_code = ?', [finalCode]);
    if (checkExisting) throw new Error('Bu model kodu zaten kayıtlı.');

    let image_path_db = null;
    if (image_temp_path) {
        const fileName = `${finalCode}_${Date.now()}${path.extname(image_temp_path)}`;
        const targetPath = path.join(PRODUCT_IMAGE_DIR, fileName);
        try {
            await fs.copyFile(image_temp_path, targetPath);
            image_path_db = path.relative(PROJECT_ROOT, targetPath).replace(/\\/g, '/');
        } catch(e) { console.error("Görsel hatası:", e); }
    }

    await runAsync(
        `INSERT INTO products (model_code, name, min_stock, image_path, description) VALUES (?, ?, ?, ?, ?)`,
        [finalCode, name, min_stock || 5, image_path_db, description || '']
    );
    await writeLog(user_id, 'create_product', JSON.stringify({ name, code: finalCode }));
    return { success: true };
};

module.exports.updateProductDefinition = async ({ id, model_code, name, min_stock, image_temp_path, delete_current_image, description, user_id }) => {
    const finalCode = model_code?.trim().toUpperCase();
    if (!id || !name || !finalCode) throw new Error('Zorunlu alanlar eksik.');
    
    const oldProduct = await getAsync('SELECT * FROM products WHERE id = ?', [id]);
    if (!oldProduct) throw new Error('Ürün bulunamadı.');

    if (oldProduct.model_code !== finalCode) {
        const check = await getAsync('SELECT id FROM products WHERE model_code = ? AND id != ?', [finalCode, id]);
        if (check) throw new Error('Bu model kodu kullanımda.');
    }
    
    let changes = [];
    if(oldProduct.name !== name) changes.push(`İsim: ${oldProduct.name} -> ${name}`);
    if(oldProduct.model_code !== finalCode) changes.push(`Kod: ${oldProduct.model_code} -> ${finalCode}`);
    if(oldProduct.min_stock != min_stock) changes.push(`Min Stok: ${oldProduct.min_stock} -> ${min_stock}`);

    let final_image_path = oldProduct.image_path;
    if (delete_current_image) {
        await deleteOldImage(oldProduct.image_path);
        final_image_path = null;
        changes.push('Görsel silindi');
    } else if (image_temp_path && !image_temp_path.includes('DELETE_IMAGE')) { 
        await deleteOldImage(oldProduct.image_path); 
        const fileName = `${finalCode}_${Date.now()}${path.extname(image_temp_path)}`;
        const targetPath = path.join(PRODUCT_IMAGE_DIR, fileName);
        try {
            await fs.copyFile(image_temp_path, targetPath);
            final_image_path = path.relative(PROJECT_ROOT, targetPath).replace(/\\/g, '/');
            changes.push('Görsel değişti');
        } catch(e) {}
    }

    if(changes.length === 0) return { success: true };

    await runAsync(
        `UPDATE products SET model_code = ?, name = ?, min_stock = ?, image_path = ?, description = ? WHERE id = ?`,
        [finalCode, name, min_stock, final_image_path, description, id]
    );
    await writeLog(user_id, 'update_product', JSON.stringify({ product: name, changes: changes.join(', ') }));
    return { success: true };
};

module.exports.addStockWithSerials = async ({ product_id, serials, source, invoice_no, import_date, notes, user_id }) => {
    if (!product_id || !serials?.length || !source) throw new Error('Eksik bilgi: Ürün, seri no ve kaynak zorunludur.');
    
    const product = await getAsync('SELECT name FROM products WHERE id = ?', [product_id]);
    const finalDate = import_date ? new Date(import_date).toISOString() : new Date().toISOString(); 
    let addedCount = 0;
    let errors = [];

    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            db.run("BEGIN TRANSACTION");
            try {
                for (const sn of serials) {
                    const cleanSN = sn.toString().trim().toUpperCase(); 
                    if(!cleanSN) continue;
                    try {
                        await runAsync(
                            `INSERT INTO product_serials (product_id, serial_number, status, source, invoice_no, import_date, notes) VALUES (?, ?, 'IN_STOCK', ?, ?, ?, ?)`,
                            [product_id, cleanSN, source, invoice_no || '', finalDate, notes || '']
                        );
                        addedCount++;
                    } catch (e) {
                        errors.push(`${cleanSN}: Zaten kayıtlı.`);
                    }
                }

                if (addedCount > 0) {
                    await runAsync(
                        'INSERT INTO stock_movements (product_id, type, qty, user_id, source, invoice_no, batch_notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [product_id, 'IN', addedCount, user_id, source, invoice_no || '', notes || '', finalDate]
                    );
                    await runAsync(`UPDATE products SET quantity = quantity + ? WHERE id = ?`, [addedCount, product_id]);
                    
                    await writeLog(user_id, 'stock_in', JSON.stringify({ 
                        product: product ? product.name : 'Bilinmeyen Ürün', 
                        qty: addedCount,
                        source: source
                    }));
                }
                db.run("COMMIT", () => resolve({ success: true, added: addedCount, failed: errors.length, errorDetails: errors }));
            } catch (err) {
                db.run("ROLLBACK");
                reject(err);
            }
        });
    });
};

module.exports.removeStockBySerials = async ({ serials, recipient, invoice_no, user_id }) => {
    if (!recipient || !serials?.length) throw new Error('Alıcı ve Seri numaraları zorunludur.');
    
    let removedCount = 0;
    let notFound = [];
    let alreadySold = [];
    let affectedProductIds = new Set(); 

    for (const sn of serials) {
        const cleanSN = sn.toString().trim().toUpperCase(); 
        const record = await getAsync('SELECT id, product_id, status FROM product_serials WHERE serial_number = ?', [cleanSN]);
        
        if (!record) { notFound.push(cleanSN); continue; }
        if (record.status !== 'IN_STOCK') { alreadySold.push(cleanSN); continue; }

        affectedProductIds.add(record.product_id);
        await runAsync(
            `UPDATE product_serials SET status = 'SOLD', sold_date = CURRENT_TIMESTAMP, recipient = ?, invoice_no = ? WHERE id = ?`, 
            [recipient, invoice_no || '', record.id]
        );
        removedCount++;
    }

    if (removedCount > 0) {
        for (const productId of affectedProductIds) {
            await runAsync(`UPDATE products SET quantity = (SELECT COUNT(*) FROM product_serials WHERE product_id = ? AND status = 'IN_STOCK') WHERE id = ?`, [productId, productId]);
            await runAsync('INSERT INTO stock_movements (product_id, type, qty, user_id, batch_notes, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [productId, 'OUT', 1, user_id, `Toplu Çıkış: ${recipient}`]);

            const p = await getAsync('SELECT name FROM products WHERE id = ?', [productId]);
            const pName = p ? p.name : 'Silinmiş Ürün';

            await writeLog(user_id, 'stock_out', JSON.stringify({ 
                qty: removedCount,
                product: pName, 
                recipient 
            }));
        }
    }
    return { success: true, removed: removedCount, notFound, alreadySold };
};

module.exports.deleteProduct = async (id, user_id) => {
    const p = await getAsync('SELECT name, image_path FROM products WHERE id = ?', [id]);
    if (!p) return { success: true }; 
    
    await deleteOldImage(p.image_path); 
    await runAsync('DELETE FROM stock_movements WHERE product_id = ?', [id]);
    await runAsync('DELETE FROM product_serials WHERE product_id = ?', [id]);
    await runAsync('DELETE FROM products WHERE id = ?', [id]); 
    
    await writeLog(user_id, 'product_deleted', JSON.stringify({ name: p.name }));
    return { success: true };
};

module.exports.deleteSingleSerial = async ({ serial_id, user_id }) => {
    const serial = await getAsync('SELECT * FROM product_serials WHERE id = ?', [serial_id]);
    if (!serial) throw new Error('Seri numarası bulunamadı.');

    await runAsync('DELETE FROM product_serials WHERE id = ?', [serial_id]);

    if (serial.status === 'IN_STOCK') {
        await runAsync('UPDATE products SET quantity = quantity - 1 WHERE id = ?', [serial.product_id]);
    }
    await writeLog(user_id, 'serial_deleted', JSON.stringify({ sn: serial.serial_number, product_id: serial.product_id }));
    return { success: true };
};