# Sistem de Categorii Ierarhice

## Prezentare Generala

Sistemul de categorii suporta acum o structura ierarhica cu categorii principale si subcategorii.

## API Endpoints

### 1. Obtine toate categoriile cu ierarhie

GET /api/categories?includeSubcategories=true

### 2. Obtine toate categoriile (flat)

GET /api/categories

### 3. Obtine o categorie specifica

GET /api/categories/:slug

### 4. Creare categorie (Admin)

POST /api/categories

### 5. Actualizare categorie (Admin)

PUT /api/categories/:id

### 6. Stergere categorie (Admin)

DELETE /api/categories/:id

## Structura Actuala

Casa & Gradina

- Mobilier
- Decoratiuni
- Gradinarit
- Unelte

Electronice

- Laptopuri
- Telefoane
- Tablete
- Accesorii

Fashion

- Barbati
- Femei
- Copii
- Incaltaminte

Sport

- Fitness
- Fotbal
- Baschet
- Ciclism
