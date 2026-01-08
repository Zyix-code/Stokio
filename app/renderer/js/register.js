const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
});

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
});

document.getElementById('btnRegister').addEventListener('click', async () => {
  const name_surname = document.getElementById('name_surname').value.trim(); 
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone_number = document.getElementById('phone_number').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');
  
  if (!name_surname || !username || !email || !password) {
      return Toast.fire({ icon: 'error', title: 'Zorunlu alanları doldurun.' });
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
      return Toast.fire({ icon: 'error', title: 'Geçerli bir e-posta girin.' });
  }
  
  msg.innerText = 'İşleniyor...';
  const res = await window.api.register({ name_surname, username, email, phone_number, password });

  if (res.success) {
      Toast.fire({ icon: 'success', title: 'Kayıt başarılı! Yönlendiriliyorsunuz...' });
      setTimeout(() => window.location.href = 'login.html', 1500);
  } else {
      msg.className = 'text-danger'; 
      msg.innerText = res.error || 'Hata oluştu.'; 
      Toast.fire({ icon: 'error', title: res.error });
  }
});