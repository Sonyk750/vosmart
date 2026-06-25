@AGENTS.md

## Blog automat — VoSmart

VoSmart este **firma de cenzorat cu AI** pentru asociatii de proprietari. NU se ocupa de administrare imobile — face EXCLUSIV cenzorat asociatii de proprietari.

Tagline: **"Primul cenzorat cu AI"**

Scrie saptamanal (luni) cate un articol nou de blog despre cenzorat asociatii proprietari, obligatii legale ale cenzorului, digitalizarea cenzoratului sau legislatie asociatii din Romania.

### Reguli obligatorii pentru fiecare articol:

1. **Format fisier**: `content/blog/slug-articol.md`
2. **Frontmatter obligatoriu**:
```
---
title: "Titlul articolului"
description: "Descriere SEO (max 160 caractere)"
date: "YYYY-MM-DD"
category: "Cenzorat"
readTime: "X min"
keywords: ["cuvant1", "cuvant2", ...]
---
```
3. **Lungime**: minim 600 cuvinte, structurat cu `##` si `###`
4. **Ton**: profesional si de incredere, in limba romana
5. **VoSmart = cenzorat EXCLUSIV** — nu mentiona "administrare imobile" ca serviciu VoSmart
6. **Cross-links obligatorii la finalul articolului**:
   - Link spre **[SpokInvoice](https://www.spokinvoice.ro)** — facturare online (primul an gratuit)
   - Link spre **[SpokApp](https://www.spokapp.ro)** — ecosistemul din care face parte VoSmart
7. **Nu repeta subiecte** — verifica fisierele existente din `content/blog/` inainte de a scrie

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
