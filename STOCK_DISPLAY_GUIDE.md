# Ghid Afișare Stoc Produse

## Prezentare Generală

Sistemul permite controlul modului în care informațiile despre stoc sunt afișate utilizatorilor, cu 3 opțiuni:

1. **Vizibil** (`visible`) - Arată cantitatea exactă de stoc
2. **Doar Stare** (`status_only`) - Arată doar disponibil/indisponibil
3. **Ascuns** (`hidden`) - Ascunde complet informațiile despre stoc

## Moduri de Afișare

### 1. Vizibil (visible)

**Pentru utilizatori:**

- Stoc total: 50 bucăți
- Disponibil: 45 bucăți
- Status: În stoc

**Când să folosești:**

- Produse cu stoc mare
- Când vrei transparență completă
- Produse cu variante multiple

### 2. Doar Stare (status_only)

**Pentru utilizatori:**

- Status: Disponibil / Indisponibil
- ❌ Cantitate stoc: ASCUNS

**Când să folosești:**

- Produse cu stoc limitat (nu vrei să creezi urgență artificială)
- Produse premium
- Când vrei să eviți comparații de stoc

### 3. Ascuns (hidden)

**Pentru utilizatori:**

- ❌ Informații stoc: COMPLET ASCUNSE
- Produsul apare ca disponibil pentru comandă

**Când să folosești:**

- Produse la comandă
- Produse cu aprovizionare continuă
- Servicii (nu au stoc fizic)

## Implementare Tehnică

### Schema Prisma

```prisma
model DataItem {
  // ...
  stock            Int      @default(0)
  availableStock   Int      @default(0)
  reservedStock    Int      @default(0)
  isInStock        Boolean  @default(true)
  stockDisplayMode String   @default("visible") // visible, status_only, hidden
  // ...
}
```

### Backend (data.service.ts)

```typescript
// Filter stock information based on stockDisplayMode
if (userRole === 'admin') {
  // Admin sees everything
  stockInfo = {
    stock: item.stock,
    availableStock: item.availableStock,
    reservedStock: item.reservedStock,
    isInStock: item.isInStock,
    stockDisplayMode: item.stockDisplayMode,
  };
} else {
  // Regular users see filtered stock info
  const displayMode = item.stockDisplayMode || 'visible';

  if (displayMode === 'visible') {
    stockInfo = {
      stock: item.stock,
      availableStock: item.availableStock,
      isInStock: item.isInStock,
    };
  } else if (displayMode === 'status_only') {
    stockInfo = {
      isInStock: item.isInStock,
      stockStatus: item.isInStock ? 'available' : 'unavailable',
    };
  } else if (displayMode === 'hidden') {
    stockInfo = {
      stockStatus: 'unknown',
    };
  }
}
```

## Exemple Utilizare

### Setare Mod Afișare

```typescript
// Vizibil - arată tot
await prisma.dataItem.update({
  where: { id: productId },
  data: { stockDisplayMode: 'visible' },
});

// Doar stare - disponibil/indisponibil
await prisma.dataItem.update({
  where: { id: productId },
  data: { stockDisplayMode: 'status_only' },
});

// Ascuns - nu arată nimic
await prisma.dataItem.update({
  where: { id: productId },
  data: { stockDisplayMode: 'hidden' },
});
```

## Afișare Frontend

### Vizibil

```jsx
{
  product.stock && (
    <div className="stock-info">
      <span>În stoc: {product.stock} bucăți</span>
      <span>Disponibil: {product.availableStock} bucăți</span>
    </div>
  );
}
```

### Doar Stare

```jsx
{
  product.stockStatus && (
    <div className="stock-status">
      <span className={product.isInStock ? 'available' : 'unavailable'}>
        {product.isInStock ? '✅ Disponibil' : '❌ Indisponibil'}
      </span>
    </div>
  );
}
```

### Ascuns

```jsx
{
  product.stockStatus === 'unknown' && (
    <div className="stock-hidden">
      <span>Disponibil la comandă</span>
    </div>
  );
}
```

## Comportament Admin

Administratorii văd ÎNTOTDEAUNA toate informațiile despre stoc, indiferent de `stockDisplayMode`:

```json
{
  "stock": 50,
  "availableStock": 45,
  "reservedStock": 5,
  "isInStock": true,
  "stockDisplayMode": "hidden"
}
```

## Cazuri de Utilizare

### E-commerce Tradițional

- Produse fizice: `visible`
- Arată transparența stocului
- Creează urgență naturală

### Boutique/Premium

- Produse exclusive: `status_only`
- Nu arată stoc limitat
- Menține exclusivitatea

### Servicii/Digital

- Produse digitale: `hidden`
- Nu au stoc fizic
- Întotdeauna disponibile

### Produse la Comandă

- Fabricate la cerere: `hidden`
- Stocul nu este relevant
- Timp de livrare mai important

## Testare

### Test Automat

```bash
node test-stock-display.js
```

### Test Manual

1. **Creare produs cu stoc vizibil:**
   - Setează `stockDisplayMode = 'visible'`
   - Verifică că utilizatorii văd cantitatea

2. **Creare produs doar cu stare:**
   - Setează `stockDisplayMode = 'status_only'`
   - Verifică că utilizatorii văd doar disponibil/indisponibil

3. **Creare produs stoc ascuns:**
   - Setează `stockDisplayMode = 'hidden'`
   - Verifică că utilizatorii nu văd informații stoc

4. **Verificare admin:**
   - Logheaza-te ca admin
   - Verifică că vezi toate informațiile pentru toate produsele

## Best Practices

1. **Produse Noi**: Începe cu `visible` pentru transparență
2. **Stoc Limitat**: Folosește `status_only` pentru a evita panica
3. **Produse Premium**: Folosește `status_only` sau `hidden`
4. **Servicii**: Folosește `hidden`
5. **Transparență**: Preferă `visible` când este posibil

## Migrare Produse Existente

Toate produsele existente au implicit `stockDisplayMode = 'visible'`:

```sql
-- Verifică produse fără mod setat
SELECT id, title, stockDisplayMode
FROM "DataItem"
WHERE stockDisplayMode IS NULL;

-- Setează mod implicit
UPDATE "DataItem"
SET stockDisplayMode = 'visible'
WHERE stockDisplayMode IS NULL;
```

## Comenzi Utile

```bash
# Test moduri afișare
node test-stock-display.js

# Setează toate produsele la vizibil
node set-all-stock-visible.js

# Statistici moduri afișare
node stock-display-stats.js
```
