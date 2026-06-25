@AGENTS.md

## Blog automat — VoSmart

Scrie saptamanal (luni) cate un articol nou de blog despre cenzorat asociatii proprietari, administrare imobile, digitalizare blocuri sau legislatie asociatii din Romania.

### Reguli obligatorii pentru fiecare articol:

1. **Format fisier**: `content/blog/slug-articol.md`
2. **Frontmatter obligatoriu**:
```
---
title: "Titlul articolului"
description: "Descriere SEO (max 160 caractere)"
date: "YYYY-MM-DD"
category: "Cenzorat" | "Administrare Imobile"
readTime: "X min"
keywords: ["cuvant1", "cuvant2", ...]
---
```
3. **Lungime**: minim 600 cuvinte, structurat cu `##` si `###`
4. **Ton**: profesional si de incredere, in limba romana
5. **Cross-links obligatorii la finalul articolului**:
   - Link spre **[SpokInvoice](https://www.spokinvoice.ro)** — facturare online pentru asociatii (primul an gratuit)
   - Link spre **[SpokApp](https://www.spokapp.ro)** — ecosistemul din care face parte VoSmart
6. **Nu repeta subiecte** — verifica fisierele existente din `content/blog/` inainte de a scrie

### Subiecte recomandate (rotatie):
- Obligatiile cenzorului conform Legii 196/2018
- Rapoarte financiare pentru asociatii
- Digitalizarea administrarii blocurilor
- Fondul de rulment si fondul de reparatii
- Portal online pentru proprietari
- Diferenta cenzor individual vs firma cenzorat
- Adunari generale asociatii proprietari

### Dupa scriere:
```
git add content/blog/articol-nou.md
git commit -m "Blog: titlul articolului"
git push
```
