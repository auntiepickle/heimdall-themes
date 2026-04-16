# heimdall-themes: layered on linuxserver/heimdall
# Inherits the working PHP 8.4 vendor tree — no composer install, no risk to upstream deps.
#
# IMPORTANT: linuxserver populates /app/www at RUNTIME, not build time.
# The base image has no /app/www — creating it during build tricks linuxserver
# into skipping the install. So we stage everything under /heimdall-themes/
# and our init script copies it into /app/www after linuxserver is done.
ARG BASE=ghcr.io/linuxserver/heimdall:v2.7.6-ls335
FROM ${BASE}

ARG STAGE=/heimdall-themes

# New files (ours)
COPY app/Http/Controllers/ThemeController.php       ${STAGE}/app/Http/Controllers/ThemeController.php
COPY app/Models/Theme.php                            ${STAGE}/app/Models/Theme.php
COPY resources/views/settings/themes.blade.php       ${STAGE}/resources/views/settings/themes.blade.php
COPY database/migrations/2025_01_01_000000_add_theme_to_settings.php \
     ${STAGE}/database/migrations/2025_01_01_000000_add_theme_to_settings.php

# Theme assets — need to land in both resources/themes (model discovery)
# and public/themes (web-accessible CSS/JS)
COPY resources/themes/                               ${STAGE}/resources/themes/
COPY resources/themes/                               ${STAGE}/public/themes/

# Overlay: container-pinned patched versions of upstream files
COPY docker/overlay/                                 ${STAGE}/

# Init hook — runs after linuxserver populates /app/www
COPY docker/init/01-heimdall-themes                  /custom-cont-init.d/01-heimdall-themes
RUN chmod +x /custom-cont-init.d/01-heimdall-themes
