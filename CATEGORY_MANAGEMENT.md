# Gestionare Categorii - Ghid Complet

## Functionalitati Noi

### 1. Ierarhie Categorii (Categorii si Subcategorii)

- Fiecare categorie poate avea subcategorii nelimitate
- Selectare categorie parinte din dropdown
- Afisare ierarhica in panoul admin

### 2. Vizibilitate Categorii

- Toggle pentru a ascunde/afisa categorii
- Categoriile ascunse nu apar in site pentru utilizatori
- Produsele din categorii ascunse raman accesibile direct

### 3. Descrieri Detaliate

- Camp text pentru descriere categorii
- Descrieri pentru categorii principale si subcategorii
- Afisare in carduri categorii

## Formular Categorie (Admin)

### Campuri Disponibile:

1. **Nume Categorie** (obligatoriu)
   - Numele afisat al categoriei
   - Genereaza automat slug-ul

2. **Slug (URL)** (obligatoriu)
   - URL-ul categoriei
   - Se genereaza automat din nume
   - Poate fi editat manual

3. **Descriere** (optional)
   - Descriere detaliata a categoriei
   - Afisata in carduri si pagini categorii

4. **Categorie Parinte** (optional)
   - Dropdown cu categorii principale
   - Lasa necompletat pentru categorie principala
   - Selecteaza pentru a crea subcategorie

5. **Icon (Emoji)** (optional)
   - Emoji pentru reprezentare vizuala
   - Maxim 2 caractere

6. **Vizibilitate** (checkbox)
   - Bifat = Categorie vizibila pentru utilizatori
   - Nebifat = Categorie ascunsa

## Exemple Utilizare

### Creare Categorie Principala

```json
{
  "name": "Electronice",
  "slug": "electronice",
  "description": "Cele mai noi tehnologii si gadgeturi",
  "icon": "💻",
  "parentId": null,
  "isActive": true
}
```

### Creare Subcategorie

```json
{
  "name": "Laptopuri",
  "slug": "laptopuri",
  "description": "Laptopuri performante pentru munca si gaming",
  "icon": "💻",
  "parentId": "id-categorie-electronice",
  "isActive": true
}
```

### Ascundere Categorie

```json
{
  "isActive": false
}
```

## API Endpoints

### Public (doar categorii active)

- GET /api/categories?includeSubcategories=true
  - Returneaza doar categorii cu isActive=true

### Admin (toate categoriile)

- GET /api/categories
- POST /api/categories
- PUT /api/categories/:id
- DELETE /api/categories/:id

## Reguli Validare

1. **Stergere Categorie**
   - Nu poti sterge daca are subcategorii
   - Nu poti sterge daca are produse
   - Trebuie sa muti/stergi mai intai subcategoriile si produsele

2. **Categorie Parinte**
   - O categorie nu poate fi propriul parinte
   - Doar categorii principale pot fi parinti

3. **Slug Unic**
   - Fiecare categorie trebuie sa aiba slug unic
   - Se genereaza automat din nume

## Scripturi Utile

```bash
# Adauga subcategorii
node add-subcategories.js

# Adauga descrieri
node add-category-descriptions.js

# Test vizibilitate
node test-category-visibility.js
```

## Afisare in Frontend

### Categorii Ascunse

- Opacitate redusa (60%)
- Badge "Ascuns"
- Border gri

### Subcategorii

- Afisare "Sub: Nume Parinte"
- Indentare vizuala

### Informatii Afisate

- Nume si icon
- Descriere (primele 2 randuri)
- Numar produse
- Status vizibilitate
- Categorie parinte (daca e subcategorie)
