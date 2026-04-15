// Optional JS. window.__HEIMDALL_THEME__ = { slug, mode, variant, multiVariant }
document.addEventListener('DOMContentLoaded', () => {
    const t = window.__HEIMDALL_THEME__ || {};
    console.log('[my-theme] variant:', t.variant);
});