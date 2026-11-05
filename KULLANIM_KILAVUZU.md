# 📱 Altın & Döviz Portföyüm — Mobil Takip Uygulaması

Altın ve döviz yatırımlarınızı tarihli olarak kaydedebileceğiniz, satış yaptığınızda otomatik olarak portföyden düşen, canlı piyasa kurları ile anlık kâr/zararınızı ve getiri oranlarınızı hesaplayan **Mobil Uyumlu PWA (Web Uygulaması)**.

---

## 🚀 Öne Çıkan Özellikler

1. **Tarihli Alış ve Satış Kayıtları:**
   - Gram Altın (24K, 22K), Çeyrek, Yarım, Tam, Ata/Cumhuriyet, Reşat, Gram Gümüş, Ons Altın.
   - Dolar (USD), Euro (EUR), Sterlin (GBP), İsviçre Frangı (CHF) ve diğer tüm ana döviz birimleri.
   - Alış yaparken miktar veya toplam ödenen tutarı girmeniz yeterlidir; birim maliyet otomatik hesaplanır.
   - Satış yaparken elinizdeki güncel bakiye gösterilir; satış yapıldığında portföyden otomatik düşülür.

2. **Canlı Piyasa Fiyatları (Kapalıçarşı & Serbest Piyasa):**
   - Otomatik canlı kur güncellemesi (her 60 saniyede bir veya yenile butonuyla).
   - Günlük değişim yüzdeleri (% artış/azalış) ve canlı alış/satış makasları.

3. **Gelişmiş Kâr / Zarar Hesaplama Motoru:**
   - **Ortalama Maliyet Yöntemi (Ağırlıklı Ortalama):** Farklı tarihlerde farklı fiyatlardan alınan varlıkların maliyetini hatasız hesaplar.
   - **Açık Kâr / Zarar:** Portföyünüzdeki mevcut varlıkların güncel piyasa değeri ile maliyet arasındaki anlık fark ve getiri yüzdesi.
   - **Cebe Giren (Gerçekleşen) Kâr:** Yaptığınız satışlardan nakite dönen toplam net kâr.

4. **Portföy Dağılım Grafiği (Analiz):**
   - Varlıklarınızın toplam portföy içindeki yüzdesel dağılımı (pasta grafik).

5. **%100 Gizlilik, PIN Güvenliği ve Sunucu Senkronizasyonu:**
   - **4 Haneli Hızlı PIN Kodu Kilidi:** Uygulama açılışında mobil bankacılık tarzı sayısal tuş takımı ile portföyünüz kilitlenir; izinsiz kimse yatırımlarınızı göremez.
   - **Bilgisayar Tabanlı Veritabanı (`veritabani.json`):** Yatırımlarınız ve şifreniz bilgisayarınızdaki veritabanında saklanır. Telefonunuzu değiştirseniz veya tarayıcı geçmişini temizleseniz dahi tüm verileriniz bilgisayarınızda güvende kalır.
   - **Otomatik Kilitleme:** Telefon ekranı kapandığında, uygulama arka plana atıldığında veya başlık çubuğundaki **kilit (🔒)** butonuna basıldığında portföy anında kilitlenir.
   - **Yedekleme:** Tek tıkla JSON ve Excel (CSV) indirip yükleyebilme imkanı.

---

## 📲 Telefonunuzdan Nasıl Açıp Kullanırsınız?

### Seçenek 1: Ev / Ofis Wi-Fi Ağı Üzerinden (Hemen Şimdi)

1. Bilgisayarınızda `YatirimTakip` klasöründeki **`sunucu_baslat.bat`** dosyasına çift tıklayın.
2. Açılan siyah pencerede telefonunuz için sarı renkle bir adres gösterilecektir (Örn: `http://192.168.2.55:8080`).
3. Bilgisayarınızla **aynı Wi-Fi ağına bağlı olan** telefonunuzu elinize alın:
   - **iPhone (Safari):** Safari'yi açıp bu adresi yazın.
   - **Android (Chrome):** Chrome'u açıp bu adresi yazın.
4. **Telefona Uygulama Olarak Yükleme:**
   - **iPhone'da:** Ekranın altındaki **Paylaş** (kare içinden yukarı ok) simgesine dokunun ➡️ **"Ana Ekrana Ekle"** seçeneğini seçin.
   - **Android'de:** Sağ üstteki **üç nokta (⋮)** simgesine dokunun ➡️ **"Ana Ekrana Ekle"** veya **"Uygulamayı Yükle"** butonuna dokunun.
5. Artık telefonunuzun ana ekranında tıpkı App Store / Google Play'den inmiş gibi altın logolu bir uygulama ikonu belirecektir!

---

### Seçenek 2: İnternete Yükleyerek (Bilgisayara Gerek Kalmadan 7/24 Her Yerden)

Eğer evde değilken (mobil veri 4G/5G ile) veya bilgisayarınız kapalıyken de telefonunuzdan girmek isterseniz, uygulamayı tamamen **ücretsiz** olarak internete yayınlayabilirsiniz:

1. [Netlify Drop](https://app.netlify.com/drop) veya [Vercel](https://vercel.com) sitesini açın.
2. `YatirimTakip` klasörünü fareyle sürükleyip tarayıcıya bırakın.
3. Size özel ücretsiz bir web adresi oluşturulacaktır (Örn: `portfoyum.netlify.app`).
4. Telefonunuzdan bu adrese girip **"Ana Ekrana Ekle"** yaptığınızda, dünyanın neresinde olursanız olun uygulamanızı kullanabilirsiniz!

---

## 💡 Pratik İpuçları
- **Hızlı Alış / Satış:** "Piyasalar" sekmesindeki herhangi bir kura dokunarak anında o kurun fiyatıyla alım veya satım penceresini açabilirsiniz.
- **Satış Kârı Önizleme:** Satış penceresinde satacağınız miktarı ve fiyatı yazarken, sistem size satışı onaylamadan önce bu satıştan ne kadar kâr edeceğinizi anlık olarak yeşil/kırmızı kutucukta gösterir.
- **Örnek Veriler:** Denemek için Ayarlar sekmesindeki **"Örnek Yatırım Verileri Yükle"** butonuna basarak sistemi hazır kayıtlarla hemen inceleyebilirsiniz.
