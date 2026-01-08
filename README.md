# 📦 Stokio Pro – Stok ve Seri Numarası Takip Sistemi

<p align="center">
  <img src="https://media.giphy.com/media/Y4ak9Ki2GZCbJxAnJD/giphy.gif" width="150px">
</p>

<p align="center">
  <b>Electron.js ve SQLite mimarisi üzerine kurulu, modern arayüzlü masaüstü stok yönetim paneli.</b><br>
  Ürünleri seri numarası bazında takip etmek, toplu giriş-çıkış yapmak ve detaylı log takibi sağlamak için tasarlanmıştır.
</p>

---

## 🚀 Özellikler

- ✔ **Seri Numarası Takibi:** Her ürünün benzersiz seri numaralarıyla (IMEI/Serial) tek tek takibi ve yönetimi.
- ✔ **Toplu İşlem (Excel/Txt):** Tedarikçiden gelen veya satılan ürünlerin seri numaralarını dosya yükleyerek toplu işleme.
- ✔ **Gelişmiş Dashboard:** Kritik stok uyarıları, son 30 günlük giriş-çıkış grafikleri ve son hareketler özeti.
- ✔ **İşlem Geçmişi (Logs):** Kimin, ne zaman, hangi ürünü eklediği veya sildiği detaylı log kayıtları (Audit Logs).
- ✔ **Modern Arayüz:** Göz yormayan, animasyonlu **Koyu Mod (Dark Mode)** ve Açık Mod desteği.

<p align="center">
  <img src="https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black&style=flat-square">
  <img src="https://img.shields.io/badge/Framework-Electron-47848F?logo=electron&logoColor=white&style=flat-square">
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white&style=flat-square">
  <img src="https://img.shields.io/badge/Style-Bootstrap_5-7952B3?logo=bootstrap&logoColor=white&style=flat-square">
  <img src="https://img.shields.io/badge/License-GPLv3-blue.svg?style=flat-square">
</p>

---

## 🧠 Sistem Nasıl Çalışır?

Uygulama, **yerel masaüstü (Local Desktop)** mimarisi ile çalışır ve kurulum gerektirmez:

### 1️⃣ Kimlik Doğrulama
- Uygulama açılışında güvenli `Login` ekranı karşılar. Veritabanında kayıtlı olmayan kullanıcılar erişemez.
- Yeni personel kayıtları `Register` ekranından veya Admin panelinden yapılabilir.

### 2️⃣ Ürün ve Stok Yönetimi
- Ürünler resimli ve kategorili olarak eklenir.
- Stok girişi, sadece adet arttırmakla kalmaz; her bir ürünün **Seri Numarası** sisteme işlenir. Bu sayede hangi serili ürünün ne zaman girdiği ve kime satıldığı bilinir.

### 3️⃣ Veritabanı (Yerel Yapı)
- Sistem, verileri proje klasörü içindeki `database/stokio.db` dosyasında tutar. 
- Ekstra bir SQL Server kurulumuna ihtiyaç duymaz, taşınabilir ve hafiftir.

---

## 🛠️ Kurulum ve Çalıştırma

Bu proje Node.js tabanlıdır. Bilgisayarınızda Node.js yüklü olmalıdır.

### 1️⃣ Projeyi İndirin
```bash
git clone [https://github.com/Zyix-code/Stokio.git](https://github.com/Zyix-code/Stokio.git)
cd Stokio
```

### 2️⃣ Kütüphaneleri Yükleyin
Gerekli paketlerin (Electron, SQLite3, Chart.js vb.) yüklenmesi için:
```Bash
npm install
```

### 3️⃣ Veritabanı Hazırlığı (Otomatik)
Ekstra bir ayar yapmanıza gerek yoktur. Uygulama ilk açıldığında database/stokio.db dosyası ve gerekli tablolar otomatik olarak oluşturulur.

### 4️⃣ Başlatma
Uygulamayı geliştirici modunda başlatmak için:

```Bash
npm start
```

### ⚖️ Lisans
Bu proje GNU General Public License v3.0 ile lisanslanmıştır. Projenin tüm kullanıcıları, lisansın koşullarına uymak kaydıyla projeyi özgürce kullanabilir, değiştirebilir ve paylaşabilir.

### 🤝 İletişim
<p align="left"> <a href="https://discordapp.com/users/481831692399673375"><img src="https://img.shields.io/badge/Discord-Zyix%231002-7289DA?logo=discord&style=flat-square"></a> <a href="https://www.youtube.com/channel/UC7uBi3y2HOCLde5MYWECynQ?view_as=subscriber"><img src="https://img.shields.io/badge/YouTube-Subscribe-red?logo=youtube&style=flat-square"></a> <a href="https://www.reddit.com/user/_Zyix"><img src="https://img.shields.io/badge/Reddit-Profile-orange?logo=reddit&style=flat-square"></a> <a href="https://open.spotify.com/user/07288iyoa19459y599jutdex6"><img src="https://img.shields.io/badge/Spotify-Follow-green?logo=spotify&style=flat-square"></a> </p>

