# Sahada & Ödeme Sistemi & Kapıda Express - Ubuntu 24 VPS Kurulum ve Yayınlama Rehberi

Bu döküman, aşağıdaki sistemlerin kurulumu için gerekli adımları içerir:
1.  **Sahada (React Frontend)** -> `sahamerkezi.com`
2.  **Ödeme API (PHP)** -> `odeme.sahamerkezi.com`
3.  **Kapıda Express (Next.js)** -> `kapidaexpress.com`

## 📋 Ön Gereksinimler

1.  **Ubuntu 24.04 VPS**: Root erişimine sahip bir sunucu.
2.  **Domain Yönetimi**: Tüm domainlerin DNS panelinden VPS IP adresine (A Kaydı) yönlendirilmiş olması gerekir.

---

## 🌐 Adım 0: DNS Yönlendirmesi

| Site | Tip | Host / Ad | Değer / Hedef | Açıklama |
| :--- | :--- | :--- | :--- | :--- |
| **Sahada** | A | `@` | `VPS_IP_ADRESINIZ` | Ana domain (sahamerkezi.com) için |
| **Sahada** | A | `www` | `VPS_IP_ADRESINIZ` | www.sahamerkezi.com için |
| **Ödeme** | A | `odeme` | `VPS_IP_ADRESINIZ` | Ödeme sistemi (odeme.sahamerkezi.com) için |
| **Kapıda** | A | `@` | `VPS_IP_ADRESINIZ` | kapidaexpress.com için |
| **Kapıda** | A | `www` | `VPS_IP_ADRESINIZ` | www.kapidaexpress.com için |

---

## 🚀 Adım 1: Sunucu Hazırlığı

```bash
# Sistemi Güncelle ve Temel Araçları Kur
sudo apt update && sudo apt upgrade -y
sudo apt install git curl unzip nginx -y

# Node.js (v20) Kurulumu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 Kurulumu (Next.js uygulamasını yönetmek için)
sudo npm install -g pm2

# PHP ve Eklentilerinin Kurulumu (Ödeme API İçin)
sudo apt install php-fpm php-mysql php-curl php-xml php-mbstring php-zip -y

# Composer Kurulumu
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

---

## 📦 Adım 2: React Frontend (Sahada) Kurulumu

React uygulaması statik dosya olarak sunulacaktır.

### 2.1. Build
```bash
cd /var/www/sahada
npm install
npm run build
```

### 2.2. Nginx Konfigürasyonu
`/etc/nginx/sites-available/sahamerkezi` dosyası:
```nginx
server {
    listen 80;
    server_name sahamerkezi.com www.sahamerkezi.com;

    root /var/www/sahada/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 💳 Adım 3: PHP Ödeme API (Sahada) Kurulumu

Ödeme sistemi PHP ile çalışır.

### 3.1. Kurulum
```bash
cd /var/www/sahada/payment-api
composer install
```

### 3.2. Nginx Konfigürasyonu
`/etc/nginx/sites-available/odeme` dosyası:
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
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock; # PHP versiyonunuza göre düzenleyin
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

---

## ⚡ Adım 4: Next.js (Kapıda Express) Kurulumu

Next.js uygulaması bir sunucu (Node process) olarak çalıştırılacak ve Nginx bu porta "Reverse Proxy" yapacaktır.

### 4.1. Klasör ve Kurulum
```bash
# Klasör oluştur ve yetki ver
sudo mkdir -p /var/www/kapidaexpress
sudo chown -R $USER:$USER /var/www/kapidaexpress

# Dosyaları atın...

# Build Al
cd /var/www/kapidaexpress
npm install
npm run build
```

### 4.2. Uygulamayı PM2 ile Başlatma
Next.js uygulamasını 3000 portunda başlatacağız.

```bash
# PM2 ile uygulamayı başlat (name: kapida-app, port: 3000)
pm2 start npm --name "kapida-app" -- start -- -p 3000

# PM2 listesini kaydet (Sunucu resetlenirse otomatik başlasın)
pm2 save
pm2 startup
```

### 4.3. Nginx Reverse Proxy Konfigürasyonu
`/etc/nginx/sites-available/kapidaexpress` dosyasını oluşturun:

```bash
sudo nano /etc/nginx/sites-available/kapidaexpress
```

**İçerik:**
```nginx
server {
    listen 80;
    server_name kapidaexpress.com www.kapidaexpress.com;

    location / {
        proxy_pass http://localhost:3000; # Next.js'in çalıştığı port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Gerçek IP'leri iletmek için
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔗 Adım 5: Siteleri Aktifleştirme

```bash
# Linkleri oluştur
sudo ln -s /etc/nginx/sites-available/sahamerkezi /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/odeme /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/kapidaexpress /etc/nginx/sites-enabled/

# Varsayılanı sil ve restart et
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Adım 6: SSL Sertifikası (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx -y

# Tüm siteler için SSL al
sudo certbot --nginx -d sahamerkezi.com -d www.sahamerkezi.com
sudo certbot --nginx -d odeme.sahamerkezi.com
sudo certbot --nginx -d kapidaexpress.com -d www.kapidaexpress.com
```

**Tebrikler!** 
- `sahamerkezi.com` -> React (Statik/Dist)
- `odeme.sahamerkezi.com` -> PHP (FPM)
- `kapidaexpress.com` -> Next.js (PM2/Node - Port 3000)
olarak çalışmaktadır.
