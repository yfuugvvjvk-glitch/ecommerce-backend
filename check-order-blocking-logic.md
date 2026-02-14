# Logica de Blocare Comenzi

## Reguli de Blocare

### 1. Reguli de Blocare Manuale (Block Rules)

- Verifică dacă există reguli active cu `blockNewOrders: true`
- Verifică dacă există reguli cu `blockUntil` (blocare temporară)
- Verifică metode de plată/livrare blocate
- Verifică valori minime/maxime

### 2. Program de Livrare (Delivery Schedule)

- `blockOrdersAfter`: Ora după care se blochează comenzile pentru ziua următoare
- `advanceOrderDays`: Câte zile în avans se pot face comenzi
- `deliveryDays`: Zilele în care se fac livrări

## Exemplu:

- Program: Livrări Vineri, blochează după 20:00, 1 zi în avans
- Joi 19:00: Poți comanda pentru Vineri ✓
- Joi 21:00: NU poți comanda pentru Vineri (trecut de 20:00) ✗
- Joi 21:00: Poți comanda pentru Vineri următoare (peste 1 săptămână) ✓

## Implementare:

1. Verifică ora curentă vs `blockOrdersAfter`
2. Calculează următoarea zi de livrare disponibilă
3. Afișează mesaj clar: "Comenzile pentru [ZI] se pot plasa până la [ORA]"
4. Blochează butonul dacă suntem în interval de blocare
