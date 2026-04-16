# Heimdall Themes

Drop-in replacement for [linuxserver/Heimdall](https://github.com/linuxserver/Heimdall) with a theme engine and 7 handcrafted themes.

Same Heimdall. Same config. Same setup. WebGL shaders, ambient particles, film grain, analog clocks, and time-of-day switching built in.

## Install

```yaml
services:
  heimdall:
    image: ghcr.io/auntiepickle/heimdall-themes:latest
    container_name: heimdall
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
    volumes:
      - ./config:/config
    ports:
      - 80:80
      - 443:443
    restart: unless-stopped
```

```bash
docker compose up -d
```

Click the theme icon (bottom-right), pick a theme, hit Apply.

## Themes

### Lofi Night
Dual WebGL shaders over parallax backgrounds. Film grain overlay rendered at 24fps with warm amber bias. Three particle systems: falling leaves (day), rising embers (evening), fireflies with trails (night). Per-variant analog clocks: paper-and-ink, leaf wreath, starry night window. 30% chance of rain on each theme switch. Effects dim to 12% on mouse/keyboard activity and ramp back when idle.

### Terminal
Matrix rain with katakana and latin characters. Per-column speed variance so no two columns fall at the same rate. CRT phosphor grain, 4-second flicker cycle. Three phosphor palettes: green (day), amber (evening), cyan (night). Cards styled as terminal windows with a title bar and dollar-sign prompt. Digital clock with blinking colon. JetBrains Mono throughout.

### Aurora
WebGL northern lights with 6 aurora ribbon layers cycling green through pink. Organic drift functions prevent visible looping. Frost grain with cold blue-silver bias at 18fps. Shooting stars on irregular intervals. Snowflakes (day), rising wisps (evening), dense star field with trailing wisps (night). Frosted glass cards. Clock with animated aurora shimmer ring.

### Woodland
WebGL forest canopy with 6 tree silhouettes, 3 layers of volumetric fog, 5 god rays filtering through gaps, ground moss. Mouse parallax shifts fog layers. Organic 8mm grain with 4px clumps and amber warmth. Faerie particles with sparkle cross effect and trailing shimmer. Retrowave pink flashes (rare, brief). Falling leaves and pollen (day), embers (evening), fireflies (night). Hand-drawn wobbly clock with leaf markers.

### Void
Near-black minimalism. Three merging metaballs via smooth-min SDF with noise displacement, metallic reflection, chromatic aberration. Dot grid with gravitational warping. 40 orbiting particles with connection lines. Dual waveform oscilloscope. Layered cloud noise background. Per-pixel warm grain at variable density. Cards at 0.8% opacity. Icons desaturated to near-invisible. Accent: violet (day), rose (evening), ice blue (night).

### Rivendell
Procedural elvish valley. WebGL renders mountain ridges, three arched towers with connecting bridge, god rays through windows, water reflections with shimmer, layered mist. Golden autumn leaves and dust motes (day), rising embers and mist wisps (evening), starlight and water fireflies (night). Stone sundial clock (day), gold filigree clock (evening), silver moon dial (night). Cormorant Garamond serif. Faint gold filigree grid overlay. Cards styled as carved stone tablets with gold leaf border.

### Random
Picks a different theme on every page load. Select it from the theme picker.

## Features

**Time-of-day switching.** Each theme has three variants: day (6am-5pm), evening (5pm-8pm), night (8pm-6am). Colors, particles, and clock designs shift automatically.

**Activity-aware effects.** Shader and particle intensity drops when you move the mouse or type. Effects ramp back up after a few seconds idle.

**Idle UI fade.** After 30 seconds of no interaction, dashboard tiles fade to 15% opacity. The theme takes over as a living wallpaper. Any input brings the UI back instantly.

**Film grain everywhere.** Every theme has its own grain treatment. Lofi Night uses 16mm-style grain with exposure-dependent density. Terminal uses CRT phosphor texture. Aurora has frost grain. Woodland has organic 8mm clumps. Void has per-pixel warm grain. All render at film cadence (18-24fps) to prevent digital strobing.

**Self-hosted backgrounds.** Themes can bundle images listed in theme.json. Served by the same web server. No external containers or services needed.

## How it works

Docker image built `FROM linuxserver/heimdall:v2.7.6-ls335`. No upstream code is modified. Themes are layered on top via an init script that runs on every container start. Your `/config` volume carries over unchanged from stock Heimdall.

Each theme is a folder under `resources/themes/` containing:
- `theme.json` for metadata, variants, schedule, and background manifest
- `theme.css` for card styling, colors, fonts
- `theme.js` for shaders, particles, clocks, and animations

## Migrating from stock Heimdall

Point your existing `/config` volume at this image. On first start, the init script clears any legacy Custom JS/CSS from the Heimdall settings database. This runs once. A marker file prevents it from running again. Select your theme from the picker after migration.

## Adding your own theme

1. Copy `resources/themes/_template/` to `resources/themes/your-slug/`
2. Edit `theme.json` with your theme name, description, and variant schedule
3. Write `theme.css` and optionally `theme.js`
4. Rebuild: `docker compose up -d --build`

Existing themes demonstrate WebGL shaders, particle systems, film grain overlays, and canvas-based clocks.

## Building from source

```bash
git clone https://github.com/auntiepickle/heimdall-themes.git
cd heimdall-themes
docker compose up -d --build
```

## Background images

Themes can bundle images under `resources/themes/<slug>/backgrounds/<variant>/`. List filenames in `theme.json`:

```json
{
    "backgrounds": {
        "day": ["image1.jpg", "image2.png"],
        "night": ["image1.jpg"]
    }
}
```

Served from the same web server. No external dependencies.

## License

[MIT](LICENSE)
