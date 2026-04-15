# heimdall-themes: layered on linuxserver/heimdall
# Inherits the working PHP 8.4 vendor tree — no composer install, no risk to upstream deps.
ARG BASE=ghcr.io/linuxserver/heimdall:v2.7.6-ls335
FROM ${BASE}

ARG APP=/app/www

# New files (ours — don't exist in base image)
COPY app/Http/Controllers/ThemeController.php       ${APP}/app/Http/Controllers/ThemeController.php
COPY app/Models/Theme.php                            ${APP}/app/Models/Theme.php
COPY resources/views/settings/themes.blade.php       ${APP}/resources/views/settings/themes.blade.php
COPY database/migrations/2025_01_01_000000_add_theme_to_settings.php \
     ${APP}/database/migrations/2025_01_01_000000_add_theme_to_settings.php

# Theme assets — repo keeps css/js/json together under resources/themes/
# Heimdall's Theme model discovers via resources/themes/*/theme.json,
# but css/js must be web-accessible under public/themes/. Copy to both.
COPY resources/themes/                               ${APP}/resources/themes/
COPY resources/themes/                               ${APP}/public/themes/

# Overlay: container-pinned patched versions of upstream files (routes/web.php,
# resources/views/layouts/app.blade.php). These replace the base image's copies.
COPY docker/overlay/                                 ${APP}/

# Init hook — runs once on container start (linuxserver/s6 convention)
COPY docker/init/01-heimdall-themes                  /custom-cont-init.d/01-heimdall-themes

RUN chmod +x /custom-cont-init.d/01-heimdall-themes && \
    chown -R abc:users ${APP}/app/Http/Controllers/ThemeController.php \
                       ${APP}/app/Models/Theme.php \
                       ${APP}/resources/views/settings/themes.blade.php \
                       ${APP}/resources/views/layouts/app.blade.php \
                       ${APP}/resources/themes \
                       ${APP}/public/themes \
                       ${APP}/routes/web.php \
                       ${APP}/database/migrations/2025_01_01_000000_add_theme_to_settings.php
