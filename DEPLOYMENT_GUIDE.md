# Sahada & Ödeme Sistemi - Ubuntu 24 VPS Kurulum ve Yayınlama Rehberi

Bu döküman, **Sahada (React Frontend)** uygulamasını `sahamerkezi.com` adresine ve **Ödeme API (PHP)** servisini `odeme.sahamerkezi.com` adresine kurmak için gerekli tüm adımları içerir.

## 📋 Ön Gereksinimler

1.  **Ubuntu 24.04 VPS**: Root erişimine sahip bir sunucu.
2.  **Domain Yönetimi**: `sahamerkezi.com` ve `odeme.sahamerkezi.com` domainlerinin DNS panelinden VPS IP adresine (A Kaydı) yönlendirilmiş olması gerekir.

---

## 🚀 Adım 1: Sunucu Hazırlığı ve Gerekli Paketlerin Kurulumu

Sunucuya SSH ile bağlandıktan sonra sistem güncellemelerini yapın ve gerekli yazılımları (Nginx, Node.js, PHP) kurun.

```bash
# 1. Sistemi Güncelle
sudo apt update && sudo apt upgrade -y

# 2. Temel Araçları Kur (Git, Curl, Unzip, Nginx)
sudo apt install git curl unzip nginx -y

# 3. Node.js (v20) Kurulumu (Frontend Build İçin)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. PHP ve Gerekli Eklentilerin Kurulumu (Ödeme API İçin)
# Ubuntu 24 üzerinde PHP 8.3 varsayılan olarak gelebilir.
sudo apt install php-fpm php-mysql php-curl php-xml php-mbstring php-zip -y

# 5. Composer Kurulumu (PHP Bağımlılıkları İçin)
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

---

## 📦 Adım 2: Dosyaların Sunucuya Aktarılması

Projeyi sunucuda `/var/www` dizini altında tutacağız.

```bash
# Ana dizine git
cd /var/www

# Proje klasörünü oluştur (Github kullanmıyorsanız SFTP/FileZilla ile dosyaları buraya atın)
# Eğer Git kullanıyorsanız:
# git clone <REPO_ADRESI> sahada

# Manuel dosya yükleme yapacaksanız:
sudo mkdir -p /var/www/sahada
sudo chown -R $USER:$USER /var/www/sahada
```

**Dosya Yapısı Şöyle Olmalı:**
*   `/var/www/sahada/` (Ana React Projesi - package.json, vite.config.js burada olmalı)
*   `/var/www/sahada/payment-api/` (PHP Ödeme Servisi)

---

## 💻 Adım 3: Frontend (Sahada) Kurulumu - `sahamerkezi.com`

Bu adımda React uygulamasını "build" alıp statik dosya haline getireceğiz ve Nginx ile sunacağız.

### 3.1. Build İşlemi

```bash
cd /var/www/sahada

# Bağımlılıkları yükle
npm install

# Build al (Bu işlem 'dist' klasörünü oluşturur)
npm run build
```

### 3.2. Nginx Konfigürasyonu (Frontend)

`/etc/nginx/sites-available/sahamerkezi` dosyasını oluşturun:

```bash
sudo nano /etc/nginx/sites-available/sahamerkezi
```

**İçeriğine şunları yapıştırın:**

```nginx
server {
    listen 80;
    server_name sahamerkezi.com www.sahamerkezi.com;

    root /var/www/sahada/dist; # Build alınan klasör
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Statik dosyalar için cache ayarları (Opsiyonel)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

**Kaydetmek için:** `CTRL + X` -> `Y` -> `Enter`

---

## 💳 Adım 4: Ödeme API Kurulumu - `odeme.sahamerkezi.com`

PHP tabanlı ödeme sistemini kuracağız.

### 4.1. Bağımlılıkların Yüklenmesi

```bash
cd /var/www/sahada/payment-api

# PHP bağımlılıklarını yükle
composer install
```

### 4.2. Nginx Konfigürasyonu (Ödeme API)

`/etc/nginx/sites-available/odeme` dosyasını oluşturun:

```bash
sudo nano /etc/nginx/sites-available/odeme
```

**İçeriğine şunları yapıştırın:**

```nginx
server {
    listen 80;
    server_name odeme.sahamerkezi.com;

    root /var/www/sahada/payment-api;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock; # PHP versiyonunuza göre burayı kontrol edin (örn: php8.1-fpm.sock)
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Güvenlik: Gizli dosyalara erişimi engelle
    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

> **Not:** PHP versiyonunuzu kontrol etmek için `php -v` komutunu, FPM soketini kontrol etmek için `ls /var/run/php/` komutunu kullanabilirsiniz. Ubuntu 24 genellikle PHP 8.3 kullanır.

---

## 🔗 Adım 5: Siteleri Aktifleştirme ve DNS

### 5.1. Nginx Sitelerini Etkinleştir

```bash
# Sembolik linkleri oluştur
sudo ln -s /etc/nginx/sites-available/sahamerkezi /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/odeme /etc/nginx/sites-enabled/

# Varsayılan nginx sayfasını kaldır (Çakışma olmaması için)
sudo rm /etc/nginx/sites-enabled/default

# Konfigürasyonu test et
sudo nginx -t

# Hata yoksa Nginx'i yeniden başlat
sudo systemctl restart nginx
```

### 5.2. İzinleri Ayarlama

Nginx'in dosyaları okuyabilmesi için izinleri düzeltin:

```bash
sudo chown -R www-data:www-data /var/www/sahada
sudo chmod -R 755 /var/www/sahada
```

---

## 🔒 Adım 6: SSL Sertifikası Kurulumu (HTTPS)

Certbot kullanarak her iki domain için de ücretsiz SSL sertifikası alın.

```bash
# Certbot ve Nginx eklentisini kur
sudo apt install certbot python3-certbot-nginx -y

# Sertifikaları al ve Nginx'i otomatik yapılandır
sudo certbot --nginx -d sahamerkezi.com -d www.sahamerkezi.com
sudo certbot --nginx -d odeme.sahamerkezi.com
```

Kurulum sırasında yönlendirme (redirect) sorulursa **2** (Redirect - Make all requests redirect to secure HTTPS access) seçeneğini seçin.

---

## ✅ Kontrol Listesi

1.  [ ] `sahamerkezi.com` adresine gidin. React uygulamanızın açıldığını, sayfalar arası geçişlerin (Client-side routing) çalıştığını doğrulayın.
2.  [ ] `odeme.sahamerkezi.com` adresini test edin (veya bir test.php dosyası çağırın). PHP'nin çalıştığından emin olun.
3.  [ ] SSL (Kilit ikonu) her iki sitede de görünüyor mu kontrol edin.

**Tebrikler! Kurulum tamamlandı.**
