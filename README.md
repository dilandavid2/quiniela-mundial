# Quiniela Mundial (con login)

Aplicación web simple para jugar una quiniela de partidos del mundial.

## Funcionalidades

- Registro y login de usuarios.
- Carga/edición de pronósticos hasta el inicio de cada partido.
- Cálculo automático de puntos cuando se cargan resultados reales.
- Tabla de posiciones global.

## Sistema de puntos

- `7 puntos`: marcador exacto.
- `+3 puntos`: acierta ganador/empate.
- `+2 puntos`: acierta diferencia de goles.
- `+1 punto`: acierta los goles de al menos un equipo.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir en `http://localhost:3000`.

## Cargar resultados (modo admin demo)

Por defecto, `ADMIN_SECRET=admin-demo`.

```bash
curl -X POST http://localhost:3000/api/admin/matches/m1/result \
  -H 'Content-Type: application/json' \
  -H 'x-admin-secret: admin-demo' \
  -d '{"homeGoals":2,"awayGoals":1}'
```

## Variables opcionales

- `PORT` (default: `3000`)
- `SESSION_SECRET` (default: `quiniela-secret-dev`)
- `ADMIN_SECRET` (default: `admin-demo`)
