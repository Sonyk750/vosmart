@AGENTS.md

## Blog automat — VoSmart

VoSmart este **firma de cenzorat cu AI** pentru asociatii de proprietari. NU se ocupa de administrare imobile — face EXCLUSIV cenzorat asociatii de proprietari.

Tagline: **"Primul cenzorat cu AI"**

**Cadenta:** la fiecare **10 zile** scrie **2 articole noi** despre cenzorat asociatii proprietari, obligatii legale ale cenzorului, digitalizarea cenzoratului sau legislatie asociatii din Romania.

> **DecoImob** (`C:\Projects\decoimob`, administrare imobile) este firma separata din ecosistem. **NU adauga pagini noi in decoimob** — sitemap-ul lui e deja lansat in Search Console. Articolele VoSmart pot lega catre paginile DecoImob EXISTENTE (ex. `https://decoimob.ro/administrare-imobile`), ca firma separata de administrare, acolo unde e natural (cenzorul verifica administratorul). Fiecare proiect isi pastreaza subiectul EXCLUSIV: VoSmart doar cenzorat, DecoImob doar administrare.

### Reguli obligatorii pentru fiecare articol:

1. **Format fisier**: `content/blog/slug-articol.md`
2. **Frontmatter obligatoriu**:
```
---
title: "Titlul articolului"
description: "Descriere SEO (max 160 caractere)"
date: "YYYY-MM-DD"
dateModified: "YYYY-MM-DD"   # data ultimei actualizari (initial = date)
category: "Cenzorat"
readTime: "X min"
keywords: ["cuvant1", "cuvant2", ...]
---
```
3. **Lungime**: minim 600 cuvinte, structurat cu `##` si `###`
4. **Ton**: profesional si de incredere, in limba romana
5. **VoSmart = cenzorat EXCLUSIV** — nu mentiona "administrare imobile" ca serviciu VoSmart
6. **Sectiune FAQ obligatorie** — pentru ca schema `FAQPage` sa se genereze automat, fiecare articol trebuie sa contina o sectiune cu titlul exact `## Intrebari frecvente` (sau `## Întrebări frecvente ...`), iar fiecare intrebare sa fie pe o linie proprie in **bold**, urmata de raspuns:
```
## Intrebari frecvente

**Intrebarea 1?**
Raspunsul 1.

**Intrebarea 2?**
Raspunsul 2.
```
7. **Linking intern obligatoriu** — in corpul articolului, insereaza 2–3 linkuri contextuale catre alte articole existente din `content/blog/` (verifica lista inainte). Ex: `[verificarea listelor de intretinere](/blog/verificarea-listelor-de-intretinere-de-catre-cenzor)`. Foloseste cai relative `/blog/slug`. (Modulul "Articole similare" se genereaza automat din categorie + keywords, nu il scrie manual.)
8. **URL-uri canonice** — toate linkurile absolute catre VoSmart folosesc `https://www.vosmart.ro` (cu `www`, https).
9. **Cross-links obligatorii la finalul articolului**:
   - Link spre **[SpokInvoice](https://www.spokinvoice.ro)** — facturare online (cont gratuit de testare, fără card)
   - Link spre **[SpokApp](https://www.spokapp.ro)** — ecosistemul din care face parte VoSmart
   - Cand articolul atinge zona administrarii (administrator, gestiune, mentenanta), trimite catre **[DecoImob](https://decoimob.ro)** ca **firma separata de administrare imobile** — formulat ca serviciu complementar, independent de cenzorat (cenzorul verifica administratorul; nu sunt aceeasi firma). NU prezenta administrarea ca serviciu VoSmart.
10. **Nu repeta subiecte** — verifica fisierele existente din `content/blog/` inainte de a scrie

### Subiecte recomandate (rotatie):
- Obligatiile cenzorului conform Legii 196/2018
- Rapoarte de cenzorat trimestrial si anual
- Cum functioneaza cenzoratul cu AI
- Firma de cenzorat vs cenzor individual
- Verificarea listelor de intretinere de catre cenzor
- Adunari generale si rolul cenzorului
- Fondul de rulment — cum il verifica cenzorul
- Greseli frecvente in cenzoratul asociatiilor
- Ce documente verifica cenzorul

### Dupa scriere:
```
git add content/blog/articol-nou.md
git commit -m "Blog: titlul articolului"
git push
```
