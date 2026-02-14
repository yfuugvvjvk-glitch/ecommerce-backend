# Vizibilitate Categorii - Admin vs Utilizatori

## Rezumat Implementare

Sistemul de vizibilitate categorii functioneaza diferit pentru administratori si utilizatori:

### Utilizatori Normali

- Vad DOAR categoriile cu `isActive = true`
- Categoriile ascunse nu apar in sidebar, meniuri sau filtre
- Produsele din categorii ascunse raman accesibile direct

### Administratori

- Vad TOATE categoriile (inclusiv cele ascunse)
- Categoriile ascunse sunt marcate vizual:
  - Opacitate 60%
  - Badge "Ascuns"
  - Border gri
- Pot edita si reactiva categorii ascunse oricand

## Implementare Tehnica

### Backend (category.routes.ts)

```typescript
// Parametru showAll pentru admin
const { showAll } = request.query;
const activeFilter = showAll === 'true' ? {} : { isActive: true };

const categories = await prisma.category.findMany({
  where: activeFilter,
  // ...
});
```

### Frontend - API Client (api-client.ts)

```typescript
export const categoryAPI = {
  getAll: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';
    const url = isAdmin ? '/api/categories?showAll=true' : '/api/categories';
    return apiClient.get(url);
  },
  // ...
};
```

### Frontend - Dashboard (dashboard/page.tsx)

```typescript
const user = JSON.parse(localStorage.getItem('user') || '{}');
const isAdmin = user.role === 'admin';
const categoriesUrl = isAdmin
  ? '/api/categories?showAll=true'
  : '/api/categories';

const categoriesRes = await apiClient.get(categoriesUrl);
setCategories(categoriesRes.data);
```

### Frontend - Admin Panel (CategoriesManagement.tsx)

```typescript
// Admin vede toate categoriile
const response = await apiClient.get('/api/categories?showAll=true');
setCategories(response.data);
```

## Locuri Unde Se Aplica

1. **Sidebar** (dashboard/page.tsx)
   - Utilizatori: doar categorii active
   - Admin: toate categoriile

2. **Shop Page** (shop/page.tsx)
   - Foloseste categoryAPI.getAll()
   - Detectie automata admin

3. **Product Filters** (ProductFilters.tsx)
   - Primeste categorii ca prop
   - Filtreaza automat prin API

4. **Admin Panel** (CategoriesManagement.tsx)
   - Intotdeauna showAll=true
   - Afisare cu marcaj vizual

## Testare

### Test Manual

1. Logheaza-te ca utilizator normal
   - Verifica sidebar-ul
   - Ar trebui sa vezi doar categorii active

2. Ascunde o categorie din admin
   - Mergi la Admin > Categorii
   - Debifează "Categorie vizibila"
   - Salveaza

3. Verifica ca utilizator normal
   - Categoria nu mai apare in sidebar
   - Produsele raman accesibile

4. Verifica ca admin
   - Categoria apare cu badge "Ascuns"
   - Poti edita si reactiva

### Test Automat

```bash
node test-admin-visibility.js
```

## Depanare

### Problema: Categoriile ascunse nu apar nici pentru admin

Verifica:

1. localStorage contine user cu role='admin'
2. Request-ul include ?showAll=true
3. Backend returneaza toate categoriile

### Problema: Categoriile ascunse apar pentru utilizatori

Verifica:

1. Request-ul NU include ?showAll=true
2. Backend filtreaza dupa isActive=true
3. Frontend nu forteaza showAll=true

## Comenzi Utile

```bash
# Reactivare toate categoriile
node reactivate-all.js

# Test vizibilitate
node test-admin-visibility.js

# Verificare categorii
node check-categories.js
```
