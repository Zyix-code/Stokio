let currentUser = null;
let productsCache = [];
let dashboardChart = null; 
let tooltipInstances = [];

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
});

function formatDateOnly(isoString) {
    if (!isoString) return '-';
    try { return new Date(isoString).toLocaleDateString('tr-TR'); } catch { return isoString.split('T')[0]; }
}
function formatDateTime(isoString) {
    if (!isoString) return '-';
    try {
        let dateObj;
        
        if (isoString.indexOf('T') === -1 && isoString.indexOf('Z') === -1) {
            dateObj = new Date(isoString.replace(' ', 'T') + 'Z');
        } else {
            dateObj = new Date(isoString);
        }

        return dateObj.toLocaleString('tr-TR', { 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
        });
    } catch { return isoString; }
}

function toggleSidebar() { 
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed'); 
    
    if (sidebar.classList.contains('collapsed')) {
        tooltipInstances.forEach(t => t.enable());
    } else {
        tooltipInstances.forEach(t => t.disable());
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const userStr = window.api.getStorage('user');
    if (!userStr) { window.location = 'login.html'; return; }
    
    currentUser = JSON.parse(userStr);
    document.getElementById('user-display').innerText = currentUser.username;

    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.body.classList.add('dark-mode');
    document.getElementById('check-dark-mode').checked = (theme === 'dark');

    document.getElementById('check-dark-mode').addEventListener('change', (e) => {
        if(e.target.checked) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
    });

    document.getElementById('btnLogout').onclick = () => {
        localStorage.removeItem('user'); 
        window.location = 'login.html';
    };
    
    attachCounter('as-manual-serials', 'as-count-badge');
    attachCounter('rs-serials', 'rs-count-badge');

    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipInstances = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, { trigger: 'hover', delay: { "show": 500, "hide": 100 } });
    });
    if (!document.getElementById('sidebar').classList.contains('collapsed')) {
        tooltipInstances.forEach(t => t.disable());
    }

    const rememberSwitch = document.getElementById('set-remember');
    const autoLoginSwitch = document.getElementById('set-autologin');

    rememberSwitch.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        localStorage.setItem('pref_remember', isChecked);
        autoLoginSwitch.disabled = !isChecked; 
        if (!isChecked) {
            autoLoginSwitch.checked = false;
            localStorage.setItem('pref_autologin', 'false');
            Toast.fire({ icon: 'info', title: 'Beni Hatırla kapandı, Otomatik Giriş devre dışı.' });
        } else {
            Toast.fire({ icon: 'success', title: 'Beni Hatırla açıldı.' });
        }
    });

    autoLoginSwitch.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        if (isChecked && !rememberSwitch.checked) {
            e.target.checked = false; 
            Swal.fire({ icon: 'warning', title: 'Önce Beni Hatırla!', text: 'Otomatik giriş için "Beni Hatırla" açık olmalı.' });
            return;
        }
        localStorage.setItem('pref_autologin', isChecked);
        Toast.fire({ icon: 'success', title: `Otomatik Giriş ${isChecked ? 'açıldı.' : 'kapatıldı.'}` });
    });

    loadProducts();
    loadDashboard();
    loadLogs();
});

function attachCounter(inputId, badgeId) {
    const input = document.getElementById(inputId);
    const badge = document.getElementById(badgeId);
    if(input && badge) {
        input.addEventListener('input', () => {
            const count = input.value.split(/\r?\n/).filter(s => s.trim() !== '').length;
            badge.innerText = `${count} Adet`;
            if(count > 0) { badge.classList.remove('bg-secondary'); badge.classList.add('bg-primary'); }
            else { badge.classList.remove('bg-primary'); badge.classList.add('bg-secondary'); }
        });
    }
}

function showPage(pageId) {
    document.querySelectorAll('.main-content > div').forEach(div => div.style.display = 'none');
    document.getElementById('page-' + pageId).style.display = 'block';
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    document.getElementById('link-' + pageId).classList.add('active');

    if(pageId === 'products') loadProducts();
    if(pageId === 'logs') loadLogs();
    if(pageId === 'dashboard') loadDashboard();    
    if(pageId === 'settings') {
        document.getElementById('set-username').value = currentUser.username;
        document.getElementById('set-email').value = currentUser.email;

        const isRemembered = localStorage.getItem('pref_remember') === 'true';
        document.getElementById('set-remember').checked = isRemembered;
        document.getElementById('set-autologin').checked = localStorage.getItem('pref_autologin') === 'true';
        document.getElementById('set-autologin').disabled = !isRemembered;
    }
}

async function loadProducts() {
    const list = document.getElementById('product-list');
    list.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Yükleniyor...</td></tr>';
    const res = await window.api.getProducts();
    if(!res.success) return list.innerHTML = `<tr><td colspan="6" class="text-danger text-center">${res.error}</td></tr>`;
    productsCache = res.data;
    if(!productsCache.length) return list.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Kayıtlı ürün bulunamadı.</td></tr>';

    list.innerHTML = productsCache.map(p => {
        const imgUrl = p.image_path ? `../../${p.image_path}` : ''; 
        const stockClass = p.quantity <= p.min_stock ? 'text-danger fw-bold' : 'text-success fw-bold';
        const imgEl = imgUrl ? `<img src="${imgUrl}" class="product-thumb shadow-sm" onclick="previewImg('${imgUrl}')">` : `<div class="no-image" onclick="previewImg('')">Görsel<br>Yok</div>`;
        return `
        <tr class="align-middle">
            <td class="ps-3">${imgEl}</td>
            <td><span class="badge bg-light text-dark border">${p.model_code}</span></td>
            <td class="fw-semibold">${p.name}</td>
            <td class="${stockClass}" style="font-size: 1.1rem">${p.quantity}</td>
            <td class="text-muted small">${p.min_stock}</td>
            <td class="pe-3">
                <div class="d-flex gap-2 justify-content-end">
                    <button class="btn btn-sm btn-outline-primary" onclick="openEditProduct(${p.id})" title="Düzenle"><i class="bi bi-pencil-fill"></i></button>
                    <button class="btn btn-sm btn-outline-info" onclick="viewSerials(${p.id})" title="Seri Numaraları"><i class="bi bi-list-ol"></i></button>
                    <button class="btn btn-sm btn-outline-success" onclick="openAddStock(${p.id})" title="Stok Girişi"><i class="bi bi-box-arrow-in-down"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="openRemoveStock()" title="Stok Çıkışı"><i class="bi bi-box-arrow-up"></i></button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="deleteProduct(${p.id})" title="Ürünü Sil"><i class="bi bi-trash3"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function createProduct() {
    const data = {
        model_code: document.getElementById('cp-model').value.trim(),
        name: document.getElementById('cp-name').value.trim(),
        min_stock: document.getElementById('cp-min').value,
        image_temp_path: document.getElementById('cp-image-path').value, 
        user_id: currentUser.id
    };
    if(!data.model_code || !data.name) return Swal.fire('Hata', 'Zorunlu alanlar eksik.', 'warning');
    Swal.showLoading();
    const res = await window.api.createProduct(data);
    Swal.close();
    if(res.success) { Toast.fire({ icon: 'success', title: 'Ürün eklendi' }); bootstrap.Modal.getInstance(document.getElementById('createProductModal')).hide(); document.getElementById('createForm').reset(); document.getElementById('cp-file-name').innerText=''; loadProducts(); } 
    else Swal.fire('Hata', res.error, 'error');
}

function openEditProduct(id) {
    const p = productsCache.find(x => x.id === id);
    if(!p) return;
    document.getElementById('ep-id').value = p.id;
    document.getElementById('ep-model').value = p.model_code;
    document.getElementById('ep-name').value = p.name;
    document.getElementById('ep-min').value = p.min_stock;
    document.getElementById('ep-image-path').value = ''; 
    const hasImage = !!p.image_path;
    document.getElementById('ep-status').innerText = hasImage ? 'Mevcut görsel var.' : 'Görsel yok.';
    document.getElementById('btn-delete-img').disabled = !hasImage; 
    new bootstrap.Modal(document.getElementById('editProductModal')).show();
}

async function updateProduct() {
    const imgPath = document.getElementById('ep-image-path').value;
    const data = {
        id: document.getElementById('ep-id').value,
        model_code: document.getElementById('ep-model').value.trim(),
        name: document.getElementById('ep-name').value.trim(),
        min_stock: document.getElementById('ep-min').value,
        image_temp_path: (imgPath !== 'DELETE_IMAGE' && imgPath !== '') ? imgPath : null,
        delete_current_image: (imgPath === 'DELETE_IMAGE'),
        user_id: currentUser.id
    };

    if(!data.model_code || !data.name) return Swal.fire('Hata', 'Zorunlu alanlar.', 'warning');
    
    const oldProduct = productsCache.find(x => x.id === parseInt(data.id));
    let changesDetected = false;
    if (data.model_code !== oldProduct.model_code) changesDetected = true;
    if (data.name !== oldProduct.name) changesDetected = true;
    if (parseInt(data.min_stock) !== oldProduct.min_stock) changesDetected = true;
    const imageChange = data.image_temp_path || data.delete_current_image;

    if (!changesDetected && !imageChange) {
        bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
        return Swal.fire('Değişiklik Yok', 'Ürün bilgisinde hiçbir değişiklik yapılmadı.', 'info');
    }

    Swal.showLoading();
    const res = await window.api.updateProduct(data);
    Swal.close();
    
    if(res.success) { 
        Toast.fire({ icon: 'success', title: 'Güncellendi' }); 
        bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide(); 
        loadProducts(); 
    } else Swal.fire('Hata', res.error, 'error');
}

async function deleteProduct(id) {
    Swal.fire({ title: 'Silinsin mi?', text: "Bu işlem geri alınamaz!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Evet, Sil', cancelButtonText: 'Hayır' }).then(async (r) => {
        if (r.isConfirmed) { Swal.showLoading(); const res = await window.api.deleteProduct({id, user_id: currentUser.id}); Swal.close(); if(res.success) { loadProducts(); Toast.fire({ icon: 'success', title: 'Silindi' }); } else Swal.fire('Hata', res.error, 'error'); }
    });
}

function openAddStock(id) {
    const p = productsCache.find(x => x.id === id);
    document.getElementById('as-product-id').value = id;
    document.getElementById('as-product-title').innerText = `${p.name} (${p.model_code})`;
    document.getElementById('as-manual-serials').value = '';
    document.getElementById('as-source').value = ''; 
    document.getElementById('as-notes').value = '';
    document.getElementById('as-count-badge').innerText = '0 Adet';
    document.getElementById('as-count-badge').className = 'badge bg-secondary';
    new bootstrap.Modal(document.getElementById('addStockModal')).show();
}

async function confirmAddStock() {
    const serials = document.getElementById('as-manual-serials').value.split(/\r?\n/).map(s=>s.trim().toUpperCase()).filter(s=>s); 
    const source = document.getElementById('as-source').value.trim(); 
    if(!source) return Swal.fire('Uyarı', 'Tedarikçi adı zorunludur.', 'warning');
    if(!serials.length) return Swal.fire('Uyarı', 'Seri no girin.', 'warning');
    Swal.showLoading();
    const res = await window.api.addStockSerials({ product_id: document.getElementById('as-product-id').value, serials, source, notes: document.getElementById('as-notes').value, user_id: currentUser.id });
    Swal.close();
    if(res.success) { let msg = `<b>${res.data.added}</b> adet eklendi.`; if(res.data.failed > 0) msg += `<br>⚠️ <b>${res.data.failed}</b> mükerrer.`; Swal.fire({ icon: res.data.failed > 0 ? 'warning' : 'success', title: 'Tamamlandı', html: msg }); bootstrap.Modal.getInstance(document.getElementById('addStockModal')).hide(); loadProducts(); } else Swal.fire('Hata', res.error, 'error');
}

function openRemoveStock() {
    document.getElementById('rs-serials').value = '';
    document.getElementById('rs-recipient').value = '';
    document.getElementById('rs-invoice').value = '';
    document.getElementById('rs-count-badge').innerText = '0 Adet';
    document.getElementById('rs-count-badge').className = 'badge bg-secondary';
    new bootstrap.Modal(document.getElementById('removeStockModal')).show();
}

async function confirmRemoveStock() {
    const serials = document.getElementById('rs-serials').value.split(/\r?\n/).map(s=>s.trim().toUpperCase()).filter(s=>s); 
    const recipient = document.getElementById('rs-recipient').value.trim();
    if(!recipient) return Swal.fire('Uyarı', 'Alıcı adı zorunludur.', 'warning');
    if(!serials.length) return Swal.fire('Uyarı', 'Seri no girin.', 'warning');
    Swal.showLoading();
    const res = await window.api.removeStockSerials({ serials, recipient, invoice_no: document.getElementById('rs-invoice').value, user_id: currentUser.id });
    Swal.close();
    if(res.success) { let msg = `<b>${res.data.removed}</b> çıkış yapıldı.`; if(res.data.notFound.length) msg += `<br>❓ ${res.data.notFound.length} bulunamadı.`; if(res.data.alreadySold.length) msg += `<br>❌ ${res.data.alreadySold.length} satılmış.`; Swal.fire({ icon: 'success', title: 'İşlem Tamam', html: msg }); bootstrap.Modal.getInstance(document.getElementById('removeStockModal')).hide(); loadProducts(); } else Swal.fire('Hata', res.error, 'error');
}

async function viewSerials(id) {
    const modal = new bootstrap.Modal(document.getElementById('viewSerialsModal'));
    const list = document.getElementById('vs-list');
    window.currentViewingProductId = id; 
    list.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Veriler yükleniyor...</td></tr>';
    modal.show();
    
    const res = await window.api.getProductSerials(id);
    if(res.success && res.data.length) {
        list.innerHTML = res.data.map(i => {
            const isSold = i.status !== 'IN_STOCK';
            const tedarikci = i.source || '<span class="text-muted">-</span>';
            const musteri = isSold ? (i.recipient || '-') : '-';
            const siparis = i.invoice_no || '-';
            const rowClass = isSold ? 'table-danger fw-bold' : 'align-middle'; 
            const statusBadge = isSold 
                ? '<span class="badge bg-danger shadow-sm"><i class="bi bi-box-arrow-right"></i> SATILDI</span>' 
                : '<span class="badge bg-success shadow-sm"><i class="bi bi-check-circle"></i> STOKTA</span>';
            
            return `
            <tr class="${rowClass}" style="font-size: 0.95rem;">
                <td class="font-monospace">${i.serial_number}</td>
                <td>${statusBadge}</td>
                <td>${formatDateOnly(i.import_date)}</td>
                <td>${isSold ? formatDateOnly(i.sold_date) : '-'}</td>
                <td>${tedarikci}</td>
                <td>${musteri}</td>
                <td>${siparis}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteSerial(${i.id}, '${i.serial_number}')" title="Bu seriyi sil"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    } else {
        list.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">Kayıtlı seri numarası yok.</td></tr>';
    }
}

async function deleteSerial(serial_id, serial_number) {
    const result = await Swal.fire({
        title: 'Emin misiniz?',
        text: `${serial_number} seri numarası silinecek! Bu işlem stok sayısını 1 azaltır.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Hayır'
    });

    if (result.isConfirmed) {
        Swal.showLoading();
        const res = await window.api.deleteSingleSerial({ serial_id: serial_id, user_id: currentUser.id });
        Swal.close();
        if (res.success) {
            Toast.fire({ icon: 'success', title: 'Seri numarası silindi.' });
            if(window.currentViewingProductId) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('viewSerialsModal'));
                modal.hide();
                loadProducts();
                setTimeout(() => viewSerials(window.currentViewingProductId), 300);
            }
        } else { Swal.fire('Hata', res.error, 'error'); }
    }
}

async function uploadFileToTextarea(textareaId) {
    const path = await window.api.selectFile([{ name: 'Veri Dosyaları', extensions: ['xlsx', 'xls', 'txt'] }]);
    if(!path) return;
    Swal.showLoading();
    const res = await window.api.readExcelSerials(path); 
    Swal.close();

    if(res.success) {
        const textarea = document.getElementById(textareaId);
        const currentVal = textarea.value.trim();
        const newVal = res.serials.join('\n');
        textarea.value = currentVal ? (currentVal + '\n' + newVal) : newVal;
        textarea.dispatchEvent(new Event('input'));
        Toast.fire({ icon: 'success', title: `${res.serials.length} adet seri no yüklendi.` });
    } else { Swal.fire('Hata', res.error, 'error'); }
}

async function selectImage(prefix) {
    const path = await window.api.selectFile([{ name: 'Images', extensions: ['jpg', 'png', 'jpeg'] }]);
    if(path) { document.getElementById(`${prefix}-image-path`).value = path; document.getElementById(prefix==='cp'?'cp-file-name':'ep-status').innerText = `Seçildi: ${path.split(/[\\/]/).pop()}`; if(prefix==='ep') document.getElementById('btn-delete-img').disabled=false; }
}
function deleteImageInEdit() { document.getElementById('ep-image-path').value='DELETE_IMAGE'; document.getElementById('ep-status').innerText='Silinecek.'; document.getElementById('btn-delete-img').disabled=true; }
function previewImg(src) { if(src){ document.getElementById('previewImage').src=src; new bootstrap.Modal(document.getElementById('imagePreviewModal')).show(); } }

async function updateProfile() { 
    const newUsername = document.getElementById('set-username').value.trim();
    const newEmail = document.getElementById('set-email').value.trim();

    if (!newUsername || !newEmail) return Swal.fire('Uyarı', 'Kullanıcı adı ve E-posta boş bırakılamaz.', 'warning');
    if (newUsername === currentUser.username && newEmail === currentUser.email) return Swal.fire('Değişiklik Yok', 'Herhangi bir bilgiyi değiştirmediniz.', 'info');
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) return Swal.fire('Hata', 'Geçerli bir e-posta girin.', 'error');

    Swal.showLoading();
    const res = await window.api.updateUserInfo({ id: currentUser.id, username: newUsername, email: newEmail, user_id: currentUser.id });
    Swal.close();

    if(res.success) { 
        currentUser = res.data; 
        window.api.setStorage('user', JSON.stringify(currentUser)); 
        document.getElementById('user-display').innerText = currentUser.username; 
        Toast.fire({ icon: 'success', title: 'Profil bilgileri güncellendi.' }); 
    } else { Swal.fire('Güncelleme Başarısız', res.error, 'error'); } 
}

async function updatePassword() { 
    const oldPass = document.getElementById('set-pass-old').value;
    const newPass = document.getElementById('set-pass-new').value;

    if (!oldPass || !newPass) return Swal.fire('Eksik Bilgi', 'Lütfen mevcut şifrenizi ve yeni şifrenizi girin.', 'warning');
    if (oldPass === newPass) return Swal.fire('Değişiklik Yok', 'Yeni şifreniz eski şifrenizle aynı olamaz.', 'info');
    if (newPass.length < 4) return Swal.fire('Zayıf Şifre', 'Yeni şifreniz en az 4 karakter olmalıdır.', 'warning');

    Swal.showLoading();
    const res = await window.api.updatePassword({ id: currentUser.id, oldPassword: oldPass, newPassword: newPass, user_id: currentUser.id });
    Swal.close();

    if(res.success) { 
        document.getElementById('set-pass-old').value = ''; document.getElementById('set-pass-new').value = '';
        Swal.fire({ title: 'Şifre Değiştirildi', text: 'Güvenliğiniz için tekrar giriş yapmalısınız.', icon: 'success', confirmButtonText: 'Tamam' }).then(() => { document.getElementById('btnLogout').click(); });
    } else { Swal.fire('Hata', res.error, 'error'); }
}

async function loadDashboard() {
    const [pRes, wRes, statsRes, logRes] = await Promise.all([
        window.api.getProducts(),
        window.api.getLowStock(),
        window.api.getDashboardStats(),
        window.api.getDashboardLogs()
    ]);

    if(pRes.success) document.getElementById('dash-total-types').innerText = pRes.data.length;
    
    if(wRes.success) {
        const count = wRes.data.length;
        document.getElementById('dash-low-stock').innerText = count;
        const wList = document.getElementById('warnings-list');
        if(count === 0) {
            wList.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-shield-check fs-1 text-success opacity-50"></i><br><span class="small">Stok sorunu yok.</span></div>';
        } else {
            wList.innerHTML = wRes.data.map(i => `
                <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-0 border-bottom">
                    <div class="ps-2">
                        <div class="fw-bold text-dark" style="font-size: 0.9rem;">${i.name}</div>
                        <small class="text-muted" style="font-size: 0.75rem;">${i.model_code}</small>
                    </div>
                    <div class="text-end pe-2">
                        <div class="text-danger fw-bold">${i.quantity} Adet</div>
                        <div style="font-size: 0.7rem; color: #999;">Min: ${i.min_stock}</div>
                    </div>
                </li>`).join('');
        }
    }

    if(statsRes.success) {
        document.getElementById('dash-total-in').innerText = statsRes.data.totalIn;
        document.getElementById('dash-total-out').innerText = statsRes.data.totalOut;
        
        const isDarkMode = document.body.classList.contains('dark-mode');
        const axisColor = isDarkMode ? '#aaa' : '#666';
        const gridColor = isDarkMode ? '#333' : '#eee';

        const ctx = document.getElementById('stockChart').getContext('2d');
        if(dashboardChart) dashboardChart.destroy();
        dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Giriş', 'Çıkış'],
                datasets: [{
                    label: 'Hareket',
                    data: [statsRes.data.totalIn, statsRes.data.totalOut],
                    backgroundColor: ['#2ecc71', '#e74c3c'],
                    borderRadius: 4, barThickness: 50
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { color: axisColor }, 
                        grid: { color: gridColor } 
                    },
                    x: { 
                        ticks: { color: axisColor }, 
                        grid: { color: gridColor } 
                    } 
                }
            }
        });
    }

    const logTable = document.getElementById('dash-recent-logs');
    if(logRes.success && logRes.data && logRes.data.length > 0) {
        logTable.innerHTML = logRes.data.map(l => {
            let msg = '', icon = 'bi-circle', color = 'text-dark', d = {};
            try { d = JSON.parse(l.details); } catch(e){}
            
            let pName = d.product;
            if (!pName || pName === 'undefined') pName = '<span class="text-muted fst-italic">Silinmiş Ürün</span>';

            switch(l.action) {
                case 'stock_in': msg = `Stok Girişi: <b>${d.qty}</b> adet <b>${pName}</b>`; icon = 'bi-arrow-down-circle-fill'; color = 'text-success'; break;
                case 'stock_out': msg = `Satış: <b>${d.qty}</b> adet <b>${pName}</b> <span class="text-muted small">(${d.recipient||'-'})</span>`; icon = 'bi-arrow-up-circle-fill'; color = 'text-danger'; break;
                case 'create_product': msg = `Yeni Ürün: <b>${d.name}</b>`; icon = 'bi-plus-circle-fill'; color = 'text-primary'; break;
                case 'product_deleted': msg = `Ürün Silindi: <b>${d.name}</b>`; icon = 'bi-trash-fill'; color = 'text-secondary'; break;
                case 'serial_deleted': msg = `Seri No Silindi: <b>${d.sn}</b>`; icon = 'bi-backspace-fill'; color = 'text-danger'; break;
                case 'update_product': msg = `Güncelleme: <b>${pName}</b>`; icon = 'bi-pencil-square'; color = 'text-warning'; break;
                case 'login': msg = 'Oturum açıldı.'; icon = 'bi-key-fill'; color = 'text-info'; break;
                
                case 'register': 
                    msg = 'Yeni kullanıcı oluşturuldu.'; 
                    icon = 'bi-person-plus-fill'; 
                    color = 'text-primary'; 
                    break;

                default: msg = `İşlem: ${l.action}`;
            }
            return `<tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <div class="me-3 fs-5 ${color}"><i class="bi ${icon}"></i></div>
                        <div>${msg}</div>
                    </div>
                </td>
                <td class="text-end pe-4 text-muted small font-monospace">${formatDateTime(l.created_at)}</td>
            </tr>`;
        }).join('');
    } else {
        logTable.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-4">Henüz bir işlem kaydı yok.</td></tr>';
    }
}

async function loadLogs() {
    const list = document.getElementById('log-list');
    list.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="text-muted mt-2">Yükleniyor...</p></div>`;
    const res = await window.api.getRecentLogs({id: currentUser.id, role: currentUser.role});
    if(!res.success || !res.data.length) { list.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-clock-history display-1 opacity-25"></i><p class="mt-3">Kayıt yok.</p></div>`; return; }
    list.innerHTML = res.data.map(l => {
        let title='', detailHtml='', iconHtml='', bgClass='bg-light', textClass='text-secondary', d={};
        try { d = JSON.parse(l.details); } catch(e) {}
        const pName = d.product || 'Silinmiş Ürün';
        switch(l.action) {
            case 'stock_in': title='Stok Girişi'; bgClass='bg-success'; textClass='text-success'; iconHtml='<i class="bi bi-arrow-down-circle-fill fs-4"></i>'; detailHtml=`<div class="fw-bold text-dark fs-5">${pName}</div><div class="text-success fw-bold">+${d.qty} Adet eklendi.</div>${d.source?`<div class="text-muted small mt-1"><i class="bi bi-truck"></i> ${d.source}</div>`:''}`; break;
            case 'stock_out': title='Satış / Çıkış'; bgClass='bg-danger'; textClass='text-danger'; iconHtml='<i class="bi bi-arrow-up-circle-fill fs-4"></i>'; detailHtml=`<div class="fw-bold text-dark fs-5">${pName}</div><div class="text-danger fw-bold">-${d.qty} Adet çıkış.</div>${d.recipient?`<div class="text-muted small mt-1"><i class="bi bi-person"></i> ${d.recipient}</div>`:''}`; break;
            case 'create_product': title='Yeni Ürün'; bgClass='bg-primary'; textClass='text-primary'; iconHtml='<i class="bi bi-plus-square-fill fs-4"></i>'; detailHtml=`<div class="fw-bold text-dark fs-5">${d.name}</div><div class="text-muted">Kod: <b>${d.code||'-'}</b></div>`; break;
            case 'product_deleted': title='Ürün Silindi'; bgClass='bg-secondary'; textClass='text-secondary'; iconHtml='<i class="bi bi-trash3-fill fs-4"></i>'; detailHtml=`<div class="text-decoration-line-through text-muted fs-5">${d.name}</div><div class="text-danger small mt-1 fw-bold">Kalıcı olarak silindi.</div>`; break;
            case 'serial_deleted': title='Seri No İptali'; bgClass='bg-danger'; textClass='text-danger'; iconHtml='<i class="bi bi-backspace-reverse-fill fs-4"></i>'; detailHtml=`<div class="font-monospace bg-light border px-2 py-1 rounded d-inline-block text-danger fw-bold">${d.sn}</div><div class="text-muted small mt-1">Manuel silindi.</div>`; break;
            case 'update_product': title='Güncelleme'; bgClass='bg-warning'; textClass='text-warning'; iconHtml='<i class="bi bi-pencil-square fs-4 text-dark"></i>'; detailHtml=`<div class="fw-bold text-dark fs-5">${pName}</div><div class="text-muted fst-italic mt-1 border-start border-3 ps-2 border-warning">${d.changes||'Detay yok.'}</div>`; break;
            case 'login': title='Oturum'; bgClass='bg-info'; textClass='text-info'; iconHtml='<i class="bi bi-shield-lock-fill fs-4"></i>'; detailHtml=`<div class="text-dark">Giriş yapıldı.</div>`; break;
            case 'register': title='Yeni Kayıt'; bgClass='bg-primary'; textClass='text-primary'; iconHtml='<i class="bi bi-person-plus-fill fs-4"></i>'; detailHtml=`<div class="text-dark">Yeni kullanıcı oluşturuldu.</div>`; break;
            default: title='İşlem'; bgClass='bg-light border'; textClass='text-muted'; iconHtml='<i class="bi bi-activity fs-4"></i>'; detailHtml=`<div class="text-muted">${l.action}</div>`;
        }
        return `<li class="list-group-item border-0 border-bottom py-4"><div class="d-flex align-items-start"><div class="me-4"><div class="${bgClass} bg-opacity-10 ${textClass} p-3 rounded-circle d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">${iconHtml}</div></div><div class="flex-grow-1"><div class="d-flex justify-content-between align-items-center mb-2"><h6 class="text-uppercase ${textClass} small fw-bold mb-0" style="letter-spacing: 1px;">${title}</h6><span class="badge bg-light text-secondary border fw-normal"><i class="bi bi-clock me-1"></i> ${formatDateTime(l.created_at)}</span></div><div>${detailHtml}</div></div></div></li>`;
    }).join('');
}