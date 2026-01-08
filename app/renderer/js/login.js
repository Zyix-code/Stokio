const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
});

const usernameInput = document.getElementById('identity');
const passwordInput = document.getElementById('password');
const msg = document.getElementById('msg'); 

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    const rememberMe = localStorage.getItem('pref_remember') === 'true';
    const autoLogin = localStorage.getItem('pref_autologin') === 'true';
    
    const savedUser = localStorage.getItem('saved_username');
    const savedPass = localStorage.getItem('saved_password');

    if (rememberMe && savedUser && savedPass) {
        usernameInput.value = savedUser;
        passwordInput.value = savedPass; 

        if (autoLogin) {
            msg.style.color = 'blue';
            msg.innerText = 'Otomatik giriş yapılıyor...';
            setTimeout(() => performLogin(), 500); 
        }
    }
});

async function performLogin() {
    const identityValue = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!identityValue || !password) {
        msg.style.color = 'red';
        msg.innerText = 'Lütfen bilgileri giriniz.';
        Toast.fire({ icon: 'warning', title: 'Bilgileri eksiksiz girin.' });
        return;
    }
    
    msg.style.color = 'blue'; 
    msg.innerText = 'Giriş yapılıyor...'; 

    const res = await window.api.login({ email: identityValue, password: password });

    if (res.success) {        
        const rememberMe = localStorage.getItem('pref_remember') === 'true';
        
        if (rememberMe) {
            localStorage.setItem('saved_username', identityValue);
            localStorage.setItem('saved_password', password);
        } else {
            localStorage.removeItem('saved_username');
            localStorage.removeItem('saved_password');
            localStorage.setItem('pref_autologin', 'false');
        }

        window.api.setStorage('user', JSON.stringify(res.data));
        
        msg.style.color = 'green';
        msg.innerText = `Giriş başarılı, Hoşgeldin ${res.data.username}!`;
        Toast.fire({ icon: 'success', title: `Hoşgeldin ${res.data.username}!` });
        
        setTimeout(() => window.location.href = 'main.html', 500);

    } else {
        msg.style.color = 'red';
        msg.innerText = res.error || 'Kullanıcı adı veya şifre hatalı.';
        Toast.fire({ icon: 'error', title: res.error || 'Giriş Başarısız' });
        
        if(localStorage.getItem('pref_autologin') === 'true') {
            localStorage.setItem('pref_autologin', 'false');
            msg.innerText += ' (Otomatik giriş durduruldu)';
        }
    }
}

document.getElementById('btnLogin').addEventListener('click', (e) => {
    e.preventDefault();
    performLogin();
});

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performLogin();
});