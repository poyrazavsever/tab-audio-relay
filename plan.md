Harika bir fikir, Poyraz. Bu dokümanı GitHub reponun README.md dosyası olarak kullanabilir veya proje planın için bir roadmap olarak saklayabilirsin. Teknik mantığı ve kullanıcı deneyimini (UX) ön plana çıkaracak şekilde hazırladım.
🎵 Audio Bridge: Seamless Tab Sync

Audio Bridge, farklı tarayıcı sekmeleri arasındaki ses oynatma durumlarını birbirine bağlayan, odaklanma (Deep Work) süreçlerini optimize etmek için tasarlanmış açık kaynaklı bir tarayıcı eklentisidir.
📌 Problem Tanımı

Yazılım çalışırken veya ders izlerken (Udemy, YouTube vb.) videoyu durdurup soru çözmeye geçtiğimizde, manuel olarak müzik açmak; soru çözümü bittiğinde ise müziği kapatıp videoya dönmek bilişsel bir yük oluşturur ve akışı (flow state) bozar.
🚀 Çözüm

Bu eklenti, kullanıcı tarafından belirlenen iki sekme (Kaynak A ve Kaynak B) arasında bir "ses köprüsü" kurar.

    Kaynak A (Eğitim) oynatılırken, Kaynak B (Müzik) otomatik olarak duraklatılır.

    Kaynak A duraklatıldığında, Kaynak B otomatik olarak oynatılmaya başlar.

🧠 Çalışma Mantığı (Core Logic)
1. Dinleme Modülü (Observer)

Eklenti, tarayıcının chrome.tabs API'sini kullanarak sekmelerdeki iki ana durumu takip eder:

    audible: Sekmeden o an ses çıkıp çıkmadığı.

    status: Sekmenin "playing" veya "paused" olma durumu.

2. Karar Mekanizması (Controller)

Arka planda çalışan bir Service Worker, belirlenen sekmelerden gelen sinyalleri işler:

    IF Tab_A (Video) -> play THEN Tab_B (Music) -> pause

    IF Tab_A (Video) -> pause THEN Tab_B (Music) -> play

3. Komut Gönderimi (Executor)

Eklenti, hedef sekmeye bir Content Script veya chrome.scripting aracılığıyla medya komutları gönderir. Bu sayede sekmenin içine girmeden "Play/Pause" işlemini gerçekleştirir.
🗺️ Proje Yol Haritası (Roadmap)
Faz 1: Temel Kurulum (MVP)

    [ ] Manifest V3 yapısının kurulması.

    [ ] Arka plan (Background script) ile sekme ses durumlarının konsola yazdırılması.

    [ ] Manuel sekme ID eşleştirmesi ile ilk Play/Pause testinin yapılması.

Faz 2: Kullanıcı Arayüzü (UI/UX)

    [ ] Popup Ekranı: Aktif sekmelerin listelenmesi.

    [ ] Eşleştirme: "Kaynak" ve "Hedef" sekmeyi seçmek için görsel butonlar.

    [ ] Durum Göstergesi: Köprünün (Bridge) aktif olup olmadığını belirten toggle switch.

Faz 3: Gelişmiş Özellikler

    [ ] Akıllı Algılama: Sadece YouTube/Spotify gibi popüler platformlar için özel medya kontrolleri.

    [ ] Gecikme Ayarı (Delay): Geçişler arasına 500ms gibi yumuşatıcı bir bekleme süresi ekleme.

    [ ] Kısayol Desteği: Köprüyü klavye kombinasyonu ile hızlıca açıp kapatma.

🛠️ Kullanılacak Teknolojiler

    Dil: JavaScript (Vanilla JS)

    API: Chrome Extension API (Manifest V3)

    UI: HTML5, CSS3 (Modern ve minimalist bir tasarım)

    Storage: chrome.storage.local (Kullanıcı seçimlerini kaydetmek için)

📈 Potansiyel Geliştirmeler

    Çoklu Köprü: Birden fazla sekme grubu oluşturma.

    Otomatik Sessize Alma: Duraklatmak yerine sadece sesi kısma (Mute) opsiyonu.

    İstatistikler: Gün içinde kaç kez "Focus" geçişi yapıldığını raporlayan bir dashboard.

🤝 Katkıda Bulunma

Bu proje bir Open Source girişimidir. Kod yapısı, UI iyileştirmeleri veya yeni özellik fikirleri için her zaman PR (Pull Request) ve Issue'lara açıktır.