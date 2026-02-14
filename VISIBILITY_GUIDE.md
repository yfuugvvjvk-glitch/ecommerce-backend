# Ghid Vizibilitate Categorii

## Cum Functioneaza

### Pentru Utilizatori (Public)

- Vad DOAR categoriile cu `isActive = true`
- Categoriile ascunse nu apar in meniuri sau liste
- Produsele din categorii ascunse raman accesibile direct prin URL

### Pentru Administratori

- Vad TOATE categoriile (inclusiv cele ascunse)
- Categoriile ascunse sunt marcate vizual:
  - Opacitate redusa (60%)
  - Badge "Ascuns"
  - Border gri

## API Endpoints

### Public (doar categorii active)

```
GET /api/categories
GET /api/categories?includeSubcategories=true
```

Returneaza doar categorii cu `isActive = true`

### Admin (toate categoriile)

```
GET /api/categories?showAll=true
GET /api/categories?includeSubcategories=true&showAll=true
```

Returneaza toate categoriile, inclusiv cele ascunse

## Exemple Cod

### Frontend - Public

```typescript
// Utilizatori vad doar categorii active
const response = await apiClient.get('/api/categories');
// Returneaza doar categorii cu isActive=true
```

### Frontend - Admin

```typescript
// Admin vede toate categoriile
const response = await apiClient.get('/api/categories?showAll=true');
// Returneaza toate categoriile
```

### Backend - Filtrare

```typescript
const { showAll } = request.query;
const activeFilter = showAll === 'true' ? {} : { isActive: true };

const categories = await prisma.category.findMany({
  where: activeFilter,
  // ...
});
```

## Cazuri de Utilizare

### 1. Ascundere Temporara

Ascunde o categorie in timpul actualizarilor sau reorganizarii:

- Bifează "Categorie vizibila" = OFF
- Categoria dispare pentru utilizatori
- Adminii o vad in continuare si o pot edita

### 2. Categorii Sezoniere

Ascunde categorii care nu sunt relevante in anumite perioade:

- Ex: "Decoratiuni Craciun" ascunsa in afara sezonului
- Produsele raman in baza de date
- Reactivezi categoria cand e nevoie

### 3. Testare Categorii Noi

Creaza si testeaza categorii noi inainte de lansare:

- Creeaza categoria cu isActive=false
- Adauga produse si testeaza
- Activeaza cand e gata de lansare

## Scripturi Utile

### Ascunde o categorie

```javascript
await prisma.category.update({
  where: { slug: 'nume-categorie' },
  data: { isActive: false },
});
```

### Reactivare toate categoriile

```bash
node reactivate-all.js
```

### Test vizibilitate

```bash
node test-admin-visibility.js
```

## Important

- Categoriile ascunse NU sunt sterse din baza de date
- Produsele din categorii ascunse raman accesibile
- Adminii pot edita categorii ascunse oricand
- Subcategoriile mostenesc vizibilitatea parintelui (optional)
