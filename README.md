# Koholma Vägsamfällighet

Webbapp för Koholma Vägsamfällighet – budget, rapporter och medlemshantering för samfällighetens delägare.

Live: [www.koholmavag.com](https://www.koholmavag.com)

## Teknik

- **React 19** + **TanStack Start** (SSR/routing)
- **Tailwind CSS v4**
- **Better Auth** (e-post + lösenord)
- **PostgreSQL** via Neon (produktion) / PGLite (lokal utveckling)
- Driftsatt på **Vercel**

## Komma igång lokalt

```bash
# Installera beroenden
npm install

# Starta utvecklingsservern (http://localhost:8080)
npm run dev
```

Inga miljövariabler krävs för lokal körning — appen använder PGLite som lokal databas automatiskt.

## Bygga för produktion

```bash
npm run build
```

## Miljövariabler (Vercel)

| Variabel | Beskrivning |
|---|---|
| `DATABASE_URL` | PostgreSQL-anslutningssträng (Neon) |
| `BETTER_AUTH_SECRET` | Hemlig nyckel för sessioner |
| `BETTER_AUTH_URL` | Appens publika URL |

## Struktur

```
src/
  routes/       # Sidor (TanStack Router filbaserad routing)
  components/   # UI-komponenter
  lib/          # Hjälpbibliotek (auth, db, access)
migrations/     # SQL-migreringar
public/         # Statiska filer
server/         # Nitro-middleware
```
