# Ghid Complet: Vizibilitate și Afișare Stoc Produse

## 📋 Prezentare Generală

Sistemul oferă control complet asupra vizibilității produselor și modului în care stocul este afișat utilizatorilor. Administratorii pot controla aceste setări atât la nivel individual (per produs), cât și la nivel global (pentru toate produsele).

---

## 🎯 Funcționalități Principale

### 1. Status Produs (Vizibilitate)

Controlează dacă produsul este vizibil pentru utilizatori sau doar pentru administratori.

#### Opțiuni:

- **✅ Publicat (published)**: Produsul este vizibil pentru toți utilizatorii
- **📝 Draft**: Produsul este vizibil doar pentru administratori

#### Comportament:

- **Administratori**: Văd TOATE produsele, indiferent de status
- **Utilizatori**: Văd doar produsele cu status "published"

#### Cazuri de utilizare:

- Produse în curs de configurare → Draft
- Produse temporar indisponibile → Draft
- Produse gata de vânzare → Publicat

---

### 2. Mod Afișare Stoc

Controlează ce informații despre stoc văd utilizatorii.

#### Opțiuni:

**👁️ Vizibil (visible)**

- Utilizatorii văd cantitatea exactă în stoc
- Exemplu: "În stoc: 50 bucăți"
- Folosit pentru: Produse standard unde transparența stocului este importantă

**ℹ️ Doar Stare (status_only)**

- Utilizatorii văd doar dacă produsul este disponibil sau nu
- Exemplu: "✅ Disponibil" sau "❌ Indisponibil"
- Folosit pentru: Produse unde nu vrei să dezvălui cantitatea exactă

**🚫 Ascuns (hidden)**

- Utilizatorii nu văd nicio informație despre stoc
- Exemplu: "Disponibil la comandă"
- Folosit pentru: Produse la comandă sau cu stoc nelimitat

#### Comportament:

- **Administratori**: Văd ÎNTOTDEAUNA cantitatea exactă de stoc
- **Utilizatori**: Văd informațiile în funcție de modul setat

---

## 🖥️ Interfața Admin

### Control Individual (Per Produs)

În formularul de editare produs, secțiunea **"👁️ Vizibilitate și Afișare Stoc"** conține:

1. **Status Produs**
   - Dropdown cu opțiuni: Publicat / Draft
   - Preview live: arată cum va vedea utilizatorul produsul

2. **Mod Afișare Stoc**
   - Dropdown cu opțiuni: Vizibil / Doar Stare / Ascuns
   - Preview live: arată cum va fi afișat stocul

3. **Preview în Timp Real**
   - Afișează exact cum va vedea utilizatorul produsul
   - Se actualizează instant la schimbarea setărilor

### Control Global (Toate Produsele)

În panoul principal de produse, secțiunea **"🌐 Setări Globale"** permite:

#### Status Global Produse

```
1. Selectează acțiunea dorită:
   - ✅ Publică toate produsele
   - 📝 Pune toate în draft

2. Click pe "Aplică Status Global"

3. Confirmă acțiunea

4. Toate produsele vor fi actualizate instant
```

#### Mod Afișare Stoc Global

```
1. Selectează modul dorit:
   - 👁️ Vizibil (cantitate exactă)
   - ℹ️ Doar Stare
   - 🚫 Ascuns

2. Click pe "Aplică Mod Stoc Global"

3. Confirmă acțiunea

4. Toate produsele vor fi actualizate instant
```

### Indicatori Vizuali în Lista de Produse

Fiecare produs afișează badge-uri colorate pentru identificare rapidă:

**Status:**

- 🟢 **✅ Publicat** (verde) - Vizibil pentru utilizatori
- 🟡 **📝 Draft** (galben) - Vizibil doar pentru admin

**Mod Stoc:**

- 🟣 **👁️ Stoc Vizibil** (mov) - Cantitate exactă vizibilă
- 🔵 **ℹ️ Doar Stare** (albastru) - Doar disponibil/indisponibil
- ⚫ **🚫 Stoc Ascuns** (gri) - Fără informații stoc

---

## 🔧 Implementare Tehnică

### Backend (API)

#### Endpoint: `GET /api/data`

```javascript
// Detectează automat rolul utilizatorului din JWT token
// Admin: returnează toate produsele cu tot stocul
// User: returnează doar produsele published cu stoc filtrat
```

#### Endpoint: `GET /api/data/:id`

```javascript
// Detectează automat rolul utilizatorului
// Admin: returnează produsul cu tot stocul
// User: returnează produsul doar dacă e published, cu stoc filtrat
```

#### Endpoint: `PUT /api/data/:id`

```javascript
// Actualizează produsul (doar admin)
// Acceptă câmpurile: status, stockDisplayMode
```

### Frontend (React)

#### Componenta: `ProductsManagement.tsx`

**State Management:**

```typescript
interface Product {
  status?: string; // 'published' | 'draft'
  stockDisplayMode?: string; // 'visible' | 'status_only' | 'hidden'
  // ... alte câmpuri
}
```

**Funcții Globale:**

```typescript
// Aplică status la toate produsele
await Promise.all(
  products.map((p) => apiClient.put(`/api/data/${p.id}`, { ...p, status }))
);

// Aplică mod stoc la toate produsele
await Promise.all(
  products.map((p) =>
    apiClient.put(`/api/data/${p.id}`, { ...p, stockDisplayMode })
  )
);
```

---

## 📊 Exemple de Utilizare

### Exemplu 1: Lansare Produs Nou

```
1. Creează produsul cu status "Draft"
2. Configurează toate detaliile (preț, stoc, descriere)
3. Testează produsul ca admin
4. Când e gata, schimbă status la "Publicat"
5. Produsul devine vizibil pentru toți utilizatorii
```

### Exemplu 2: Produse Sezoniere

```
1. La sfârșitul sezonului:
   - Selectează toate produsele sezoniere
   - Setează status la "Draft"

2. La începutul sezonului:
   - Selectează produsele sezoniere
   - Setează status la "Publicat"
```

### Exemplu 3: Produse Premium (Stoc Ascuns)

```
1. Pentru produse premium unde nu vrei să arăți stocul:
   - Status: Publicat
   - Mod Stoc: Ascuns

2. Utilizatorii văd: "Disponibil la comandă"
3. Admin vede: Cantitatea exactă în stoc
```

### Exemplu 4: Produse cu Stoc Limitat

```
1. Pentru produse unde vrei să creezi urgență:
   - Status: Publicat
   - Mod Stoc: Vizibil

2. Utilizatorii văd: "În stoc: 5 bucăți"
3. Creează sentiment de urgență pentru cumpărare
```

### Exemplu 5: Actualizare Globală Rapidă

```
Scenariul: Magazin închis temporar pentru inventar

1. Click pe "Setări Globale"
2. Selectează "Pune toate în draft"
3. Click "Aplică Status Global"
4. Toate produsele devin invizibile pentru utilizatori
5. După inventar, selectează "Publică toate produsele"
6. Toate produsele revin vizibile
```

---

## 🧪 Testare

### Script de Test Automat

Rulează scriptul de test pentru a verifica funcționalitatea:

```bash
cd backend
node test-product-visibility-ui.js
```

Scriptul testează:

- ✅ Schimbarea statusului produselor
- ✅ Schimbarea modului de afișare stoc
- ✅ Vizibilitatea pentru admin vs utilizatori
- ✅ Filtrarea stocului în funcție de mod
- ✅ Actualizarea globală

### Test Manual în Browser

1. **Test Status:**

   ```
   - Login ca admin
   - Creează produs cu status "Draft"
   - Verifică că produsul apare în panoul admin
   - Deschide site în incognito (ca utilizator)
   - Verifică că produsul NU apare
   - Schimbă status la "Publicat"
   - Refresh în incognito
   - Verifică că produsul APARE
   ```

2. **Test Mod Stoc:**

   ```
   - Creează produs cu stoc 50, mod "Vizibil"
   - Ca utilizator: vezi "În stoc: 50 bucăți"
   - Schimbă la "Doar Stare"
   - Ca utilizator: vezi "Disponibil"
   - Schimbă la "Ascuns"
   - Ca utilizator: nu vezi informații stoc
   - Ca admin: vezi ÎNTOTDEAUNA stocul exact
   ```

3. **Test Global:**
   ```
   - Creează 3 produse publicate
   - Folosește "Setări Globale" → "Pune toate în draft"
   - Verifică că toate produsele au badge "Draft"
   - Ca utilizator: nu vezi niciun produs
   - Folosește "Setări Globale" → "Publică toate"
   - Verifică că toate produsele au badge "Publicat"
   - Ca utilizator: vezi toate produsele
   ```

---

## 🔒 Securitate

### Verificări Backend

1. **Autentificare JWT**: Toate endpoint-urile verifică token-ul JWT
2. **Rol Admin**: Doar administratorii pot modifica produsele
3. **Filtrare Automată**: Backend filtrează automat produsele în funcție de rol
4. **Validare Date**: Toate câmpurile sunt validate înainte de salvare

### Best Practices

- ✅ Nu trimite niciodată informații sensibile către utilizatori
- ✅ Verifică întotdeauna rolul utilizatorului pe backend
- ✅ Folosește HTTPS în producție
- ✅ Validează toate input-urile utilizatorului

---

## 📝 Note Importante

1. **Administratorii văd ÎNTOTDEAUNA toate produsele și tot stocul**
   - Acest lucru este intenționat pentru management complet

2. **Setările globale afectează TOATE produsele**
   - Folosește cu atenție
   - Confirmarea este obligatorie

3. **Preview-ul în timp real**
   - Arată exact cum va vedea utilizatorul produsul
   - Actualizare instant la schimbarea setărilor

4. **Badge-urile colorate**
   - Identificare rapidă a statusului produselor
   - Vizibilitate clară în lista de produse

5. **Compatibilitate**
   - Funcționează cu toate tipurile de produse
   - Nu afectează alte funcționalități (carousel, perisabilitate, etc.)

---

## 🆘 Troubleshooting

### Problema: Utilizatorii văd produse draft

**Soluție:**

- Verifică că backend-ul detectează corect rolul din JWT
- Verifică că token-ul JWT conține câmpul `role`
- Verifică logs în backend: `console.log('User role:', userRole)`

### Problema: Admin nu vede toate produsele

**Soluție:**

- Verifică că te-ai autentificat ca admin
- Verifică că token-ul JWT este valid
- Verifică că `localStorage.getItem('token')` returnează token-ul corect

### Problema: Stocul nu se filtrează corect

**Soluție:**

- Verifică că `stockDisplayMode` este setat corect în baza de date
- Verifică că backend-ul aplică filtrarea în `data.service.ts`
- Verifică că produsul are status "published"

### Problema: Setările globale nu funcționează

**Soluție:**

- Verifică că ești autentificat ca admin
- Verifică consola browser pentru erori
- Verifică că toate produsele au ID-uri valide
- Verifică că backend-ul acceptă actualizările

---

## 📚 Resurse Suplimentare

- **Cod Backend**: `backend/src/services/data.service.ts`
- **Cod Frontend**: `frontend/components/admin/ProductsManagement.tsx`
- **Test Script**: `backend/test-product-visibility-ui.js`
- **Documentație Stoc**: `backend/STOCK_DISPLAY_GUIDE.md`

---

**Versiune**: 1.0  
**Data**: 12 Februarie 2026  
**Autor**: Sistem de Management Produse
