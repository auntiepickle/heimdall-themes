# Heimdall Themes

Drop-in replacement for [linuxserver/Heimdall](https://github.com/linuxserver/Heimdall) with a built-in theme engine and 5 handcrafted themes.

Same Heimdall you know — same config, same setup — but with WebGL shaders, ambient particles, analog clocks, and time-of-day auto-switching baked in.

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

That's it. Browse to your dashboard, click the palette icon (bottom-right), pick a theme, hit Apply.

## Themes

### Lofi Night
Deep blue nebula with fireflies, CRT film grain, and per-scene analog clocks. Day brings falling leaves and a paper-ink clock, evening has rising embers with a leaf-wreath clock, night glows with fireflies and a starry night-window clock. Background images rotate randomly. Effects dim when you're actively using the dashboard and ramp back up when idle.

### Terminal
Retro CRT hacker aesthetic. Matrix rain with katakana characters, scanlines, phosphor glow, and random glitch lines. Green phosphor by day, amber in the evening, cyan at night. Digital clock with blinking colon. Cards styled as terminal windows in JetBrains Mono.

### Aurora
Northern lights across a star field. WebGL aurora ribbons cycling through green, cyan, blue, purple, and pink. Snowflakes by day, glowing wisps in the evening, dense stars and trailing wisps at night. Frosted glass cards with teal accents. Analog clock with an animated aurora shimmer ring.

### Woodland
Cozy forest cottagecore. WebGL shader renders a layered canopy with tree silhouettes, volumetric fog, light rays filtering through gaps, and ground moss. Falling leaves by day, rising embers at evening, fireflies at night. Hand-drawn wobbly clock with leaf markers.

### Void
Minimalist dark studio inspired by creative WebGL agencies. Three merging metaballs with noise displacement, metallic reflection, and chromatic aberration. Dot grid with gravitational warping, orbiting particles with connection lines, and a dual waveform at the bottom. Layered cloud texture on near-black. Accent shifts: violet (day), rose (evening), ice blue (night).

## How it works

This is a standard Docker image built `FROM linuxserver/heimdall:v2.7.6-ls335`. No upstream code is modified — themes are layered on top via an init script that runs on every container start. Your `/config` volume (dashboard items, settings, icons) carries over unchanged from stock Heimdall.

Each theme is a folder under `resources/themes/` containing:
- `theme.json` — metadata, variants, time-of-day schedule, background manifest
- `theme.css` — card styling, colors, fonts, layout
- `theme.js` — shaders, particles, clocks, animations

Themes auto-switch between day/evening/night variants based on time of day.

## Migrating from stock Heimdall

Point your existing `/config` volume at this image. On first start, the init script clears any legacy Custom JS/CSS from the Heimdall settings database (one-time, non-destructive — a marker file prevents re-running). Then select your theme from the palette icon.

## Adding your own theme

1. Copy `resources/themes/_template/` to `resources/themes/your-slug/`
2. Edit `theme.json` with your theme's name, description, and variant schedule
3. Write your `theme.css` and optionally `theme.js`
4. Rebuild: `docker compose up -d --build`

See existing themes for examples of WebGL shaders, particle systems, and analog clocks.

## Building from source

```bash
git clone https://github.com/auntiepickle/heimdall-themes.git
cd heimdall-themes
docker compose up -d --build
```

## Background images

Themes can bundle background images under `resources/themes/<slug>/backgrounds/<variant>/`. List them in `theme.json`:

```json
{
    "backgrounds": {
        "day": ["image1.jpg", "image2.png"],
        "night": ["image1.jpg"]
    }
}
```

Images are served from the same web server — no external dependencies needed.

## License

[MIT](LICENSE) — same as upstream Heimdall.
