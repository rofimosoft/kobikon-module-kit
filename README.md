# Kobikon modül tezgahı

Bu bağlantıyı gönderin. Açan kişi kurulum yapmadan modülü dener.

**https://rofimosoft.github.io/kobikon-module-kit/**

1. Örnek modüle bakın ya da kendi `module.json` dosyanızı yükleyin.
2. İşletmeyi değiştirip kayıt ekleyin.
3. **Paketi indir** ile zip dosyasını alın.

Zipin içinde `page.tsx`, `data.ts`, `navigation.snippet.ts` ve `NASIL.md` vardır. `NASIL.md`, dosyaların nereye konacağını yazar.

Kaynak kod: https://github.com/rofimosoft/kobikon-module-kit

## Kendi bilgisayarında

Node 20 veya üstü gerekir.

```bash
git clone https://github.com/rofimosoft/kobikon-module-kit.git
cd kobikon-module-kit
npm install
npm run dev
```

Önizleme `http://127.0.0.1:5174` adresinde açılır.

```bash
node bin/kobikon-mod.mjs create gorevler --label "Görevler"
npm run check
node bin/kobikon-mod.mjs pack gorevler
```

`pack` aynı dosyaları `handoff/gorevler/` altına yazar. Sayfadaki indirme bu klasörün zip halidir.

## Sözleşme

Modül kimliği küçük harf ve tiredir, bir daha değişmez. Her kaynakta `kobikon`, `ege` ve `marmara` işletmelerinin üçünde de başlangıç kaydı bulunur. Alan türleri `text`, `number`, `date` ve `select`. İkonlar: `users`, `package`, `wallet`, `warehouse`, `briefcase`, `cart`, `truck`, `handshake`, `settings`, `mark`.

Eklenen kayıt yalnız bu oturumda durur. Paketi indirmeden sayfa kapanırsa yeni kayıtlar kaybolur.

## Kabuk

İkon şeridi ince durur. Simgenin üstüne gelince adı görünür. Aynı sekmeye veya logo üstündeki açma tuşuna basınca şerit yana doğru genişler. İşletme adı şeridin üstündedir ve oradan değişir. Alt sayfalar satırın altında kayarak açılır. Sayfa başlığı aynı modülün alt sayfalarına geçer.

