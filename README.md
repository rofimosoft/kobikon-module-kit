# Kobikon modül tezgahı

Kobikon modüllerini ana depoyu paylaşmadan yazıp denemek için araç. Modül bir `module.json` dosyasıdır. Tezgah onu Discord düzenindeki kabukta açar. `pack` komutu, çekirdek ekibinin yerine koyacağı `page.tsx` ve `data.ts` dosyalarını üretir.

Ana deponun adresi, servisleri ve veritabanı bu araçta yoktur.

## Kurulum

```bash
npm install
npm run dev
```

Önizleme `http://127.0.0.1:5174` adresinde açılır. Soldaki şerit modül, yan liste kanaldır. İşletme seçimi kayıtları süzer. Eklenen kayıt yalnız bu oturumda durur.

Depo: https://github.com/rofimosoft/kobikon-module-kit

## Modül yazmak

```bash
node bin/kobikon-mod.mjs create gorevler --label "Görevler" --channel acik --noun görev
npm run check
npm run dev
```

Dosya `modules/gorevler/module.json` olur. `id` küçük harf ve tiredir, bir daha değişmez. Her kaynakta `kobikon`, `ege` ve `marmara` işletmelerinin üçünde de başlangıç kaydı bulunur. Kanal, `resources` içindeki bir kaynağı gösterir.

```json
{
  "id": "gorevler",
  "label": "Görevler",
  "description": "Açık işler",
  "searchPlaceholder": "Görev ara",
  "tone": "bg-teal-700",
  "icon": "briefcase",
  "groups": [
    {
      "id": "is",
      "label": "İş",
      "channels": [
        { "id": "acik", "label": "açık", "resource": "tasks" }
      ]
    }
  ],
  "resources": {
    "tasks": {
      "noun": "görev",
      "createLabel": "Yeni görev",
      "titleField": "title",
      "fields": [
        { "name": "title", "label": "Başlık", "required": true }
      ],
      "seeds": []
    }
  }
}
```

Alan türleri `text`, `number`, `date` ve `select`. İkonlar: `users`, `package`, `wallet`, `warehouse`, `briefcase`, `cart`, `truck`, `handshake`, `settings`, `mark`.

`npm run check` sözleşmeyi denetler. `npm test` aynı denetimin birim testlerini çalıştırır.

## Çekirdeğe bırakmak

```bash
node bin/kobikon-mod.mjs pack gorevler
```

`handoff/gorevler/` dört dosya üretir. `NASIL.md` ekibin bu dosyaları nereye koyacağını yazar. Paket kendi kayıtlarını tutar ve seçili işletmeyi okur. Servis bağlanana kadar bu pakete `fetch` eklenmez.

## Kimlikler

İşletme kimlikleri çekirdekteki örnek işletmelerle aynıdır: `kobikon`, `ege`, `marmara`. Böylece paketteki başlangıç verisi çekirdeğe konunca aynı süzgece uyar.
