# Mineflayer Speedrun Bot

Tam otomatik Minecraft speedrun botu. OP yetkisi gerektirmez, tamamen otomatik çalışır ve detaylı terminal logları sağlar.

## Özellikler

✅ **Tek dosyada tüm fonksiyonlar** - `speedrun-bot.js` içinde her şey var
✅ **OP yetkisi gerektirmez** - `/locate`, `/setblock` gibi admin komutları kullanmaz
✅ **Tamamen otomatik** - Chat komutları gerektirmez, baştan sona otomatik çalışır
✅ **Detaylı loglar** - Her adım ve karar terminalde görünür
✅ **Tek komutla çalıştırma** - `npm start` ile başlatılır

## Kurulum

```bash
# Bağımlılıkları yükle
npm install
```

## Kullanım

### Temel Kullanım

```bash
npm start
```

### Özelleştirilmiş Ayarlar

Çevre değişkenleri ile sunucu bilgilerini özelleştirebilirsiniz:

```bash
# Linux/Mac
export MC_HOST=localhost
export MC_PORT=25565
export MC_USERNAME=SpeedrunBot
export MC_VERSION=1.16.5
npm start

# Windows
set MC_HOST=localhost
set MC_PORT=25565
set MC_USERNAME=SpeedrunBot
set MC_VERSION=1.16.5
npm start
```

## Bot Stratejisi

Bot otomatik olarak şu aşamaları takip eder:

### 1. Köy Bulma
- OP komutları olmadan otomatik köy arama
- Yatak, saman balyası, sandık gibi köy bloklarını tarar
- Spiral arama deseni ile geniş alan taraması

### 2. Köy Yağmalama
- 3 odun toplama
- Ahşap kazma yapma
- Taş toplama
- Taş kazma ve balta yapma
- 4+ yatak toplama
- Sandıkları toplama
- 8+ saman balyası toplama

### 3. Demir Fazı
- 20 toprak toplama
- Demir golemlerini bulup savaşma
- 4+ demir toplama
- Ekmek ve kova yapma
- Su toplama
- Çakıl toplama ve çakmaktaş elde etme

### 4. Lava Fazı
- Lava havuzu arama
- Nether portalı yapımı

## Geliştirme Notları

Bu bot, [MinecraftSpeedrunBot](https://github.com/ccalhoun1999/MinecraftSpeedrunBot) projesinden esinlenilerek geliştirilmiştir. Tüm fonksiyonlar tek bir dosyada birleştirilmiş ve OP yetkisi gerektirmeyen bir yapıya dönüştürülmüştür.

### Önemli Değişiklikler

- ❌ `/locate village` komutu kaldırıldı → Otomatik köy arama eklendi
- ❌ `/setblock` komutu kaldırıldı → Manuel blok yerleştirme kullanılıyor
- ❌ Chat komutları kaldırıldı → Tamamen otomatik çalışma
- ✅ Kapsamlı terminal logları eklendi
- ✅ Tek dosya yapısı oluşturuldu

## Bağımlılıklar

- `mineflayer` - Minecraft bot API
- `mineflayer-pathfinder` - Yol bulma
- `mineflayer-collectblock` - Blok toplama
- `minecraft-data` - Minecraft veri API
- `vec3` - 3D vektör işlemleri

## Lisans

MIT
