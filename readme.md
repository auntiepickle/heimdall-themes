# heimdall-themes

Fork of [linuxserver/Heimdall](https://github.com/linuxserver/Heimdall) with a first-class theme engine.

Adds: theme picker UI, time-of-day auto-switching, per-theme JS (particles/shaders/clocks/weather).

Ships with **Lofi Night** theme.

## Quick start
```bash
docker compose up -d
docker compose exec heimdall php /app/artisan migrate
```
Visit http://your-ip:8081/settings/themes

## Adding a theme
Drop a folder in `resources/themes/your-slug/` with `theme.json` + `theme.css`.