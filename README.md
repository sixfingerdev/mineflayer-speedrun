# Mineflayer Speedrun Bot

Tam otomatik Minecraft speedrun botu - Ender Dragon'u yenmeye kadar. OP yetkisi gerektirmez, tamamen otomatik çalışır ve detaylı terminal logları sağlar.

## Özellikler

✅ **Tek dosyada tüm fonksiyonlar** - `speedrun-bot.js` içinde her şey var
✅ **OP yetkisi gerektirmez** - `/locate`, `/setblock` gibi admin komutları kullanmaz
✅ **Tamamen otomatik** - Chat komutları gerektirmez, baştan sona otomatik çalışır
✅ **Detaylı loglar** - Her adım ve karar terminalde görünür
✅ **Tek komutla çalıştırma** - `npm start` ile başlatılır
✅ **Ender Dragon Fight** - Oyunu bitirene kadar tam otomatik

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

## Bot Stratejisi - Tam Speedrun

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

### 4. Nether Portal
- Lava havuzu arama
- Nether portalı yapımı
- Portal ile çakmaktaş kullanarak ateşleme
- Nether'a giriş

### 5. Nether Fazı
- Nether Fortress bulma
- Nether brick bloklarını tespit etme
- Blaze spawner bulma
- Blaze'leri öldürme ve blaze rod toplama (6+ adet)
- Overworld'e dönüş

### 6. Enderman Avı
- Blaze powder yapma
- Enderman bulma ve provoke etme
- Enderman öldürme ve ender pearl toplama (12+ adet)
- Eye of Ender yapma

### 7. Stronghold Bulma
- Eye of Ender kullanarak stronghold konumu belirleme
- Stronghold'a yol bulma
- Yeraltında stronghold'a kazma
- Portal odasını bulma

### 8. End Portal Aktivasyonu
- End portal frame'lerini bulma
- Eksik frame'lere Eye of Ender yerleştirme
- The End dimension'ına giriş

### 9. Ender Dragon Savaşı
- End Crystal'larını yok etme
- Yüksek crystal'lara ulaşmak için pillar yapma
- Dragon'un perch yapmasını bekleme
- Dragon'a saldırma
- Dragon breath'ten kaçınma
- Dragon öldürülene kadar devam etme

### 10. Zafer
- Exit portal'dan geçme
- Speedrun tamamlandı!

## Geliştirme Notları

Bu bot, [MinecraftSpeedrunBot](https://github.com/ccalhoun1999/MinecraftSpeedrunBot) projesinden esinlenilerek geliştirilmiş ve Ender Dragon fight'ını da içerecek şekilde genişletilmiştir. Tüm fonksiyonlar tek bir dosyada birleştirilmiş ve OP yetkisi gerektirmeyen bir yapıya dönüştürülmüştür.

### Önemli Değişiklikler

- ❌ `/locate village` komutu kaldırıldı → Otomatik köy arama eklendi
- ❌ `/setblock` komutu kaldırıldı → Manuel blok yerleştirme kullanılıyor
- ❌ Chat komutları kaldırıldı → Tamamen otomatik çalışma
- ✅ Kapsamlı terminal logları eklendi
- ✅ Tek dosya yapısı oluşturuldu
- ✅ Nether phase eklendi
- ✅ Stronghold finding eklendi
- ✅ End dimension ve Dragon fight eklendi

## Bağımlılıklar

- `mineflayer` - Minecraft bot API
- `mineflayer-pathfinder` - Yol bulma
- `mineflayer-collectblock` - Blok toplama
- `minecraft-data` - Minecraft veri API
- `vec3` - 3D vektör işlemleri

## Lisans

MIT
