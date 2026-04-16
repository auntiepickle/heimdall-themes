document.addEventListener('DOMContentLoaded', () => {

    const themeCfg = window.__HEIMDALL_THEME__ || {};
    const isMobile = window.__HEIMDALL_MOBILE__ || false;

    // ====================== MATRIX RAIN CANVAS ======================
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';
    const fontSize = 14;
    let columns, drops;

    function initRain() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        columns = Math.floor(canvas.width / fontSize);
        drops = Array.from({length: columns}, () => ({y: Math.random() * -100, speed: 0.5 + Math.random() * 0.8}));
    }
    initRain();
    window.addEventListener('resize', initRain);

    let currentTheme = '';
    let currentThemeNum = 0;
    let rainColor = '#00FF41';
    let rainColorDim = 'rgba(0,255,65,0.08)';
    let rainDensity = 1.0;

    function updateRainColors(theme) {
        if (theme === 'evening') {
            rainColor = '#FFB000';
            rainColorDim = 'rgba(255,176,0,0.06)';
            rainDensity = 0.6;
        } else if (theme === 'night') {
            rainColor = '#00BFFF';
            rainColorDim = 'rgba(0,191,255,0.07)';
            rainDensity = 0.8;
        } else {
            rainColor = '#00FF41';
            rainColorDim = 'rgba(0,255,65,0.08)';
            rainDensity = 1.0;
        }
    }

    function animateRain() {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = fontSize + 'px JetBrains Mono, monospace';

        for (let i = 0; i < columns; i++) {
            if (Math.random() > rainDensity) continue;
            const d = drops[i];
            const char = chars[Math.floor(Math.random() * chars.length)];
            const x = i * fontSize;
            const y = d.y * fontSize;

            ctx.fillStyle = rainColor;
            ctx.globalAlpha = 0.9;
            ctx.shadowBlur = 8;
            ctx.shadowColor = rainColor;
            ctx.fillText(char, x, y);

            if (d.y > 1) {
                const trailChar = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillStyle = rainColorDim;
                ctx.globalAlpha = 0.5;
                ctx.shadowBlur = 0;
                ctx.fillText(trailChar, x, (d.y - 1) * fontSize);
            }

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            if (y > canvas.height && Math.random() > 0.975) {
                d.y = 0;
                d.speed = 0.5 + Math.random() * 0.8;
            }
            d.y += d.speed;
        }

        // CRT phosphor grain
        for(let j=0;j<50;j++){
            ctx.fillStyle='rgba('+Math.floor(Math.random()*30)+','+Math.floor(Math.random()*20)+',0,'+(0.02+Math.random()*0.02)+')';
            ctx.fillRect(Math.random()*canvas.width,Math.random()*canvas.height,2,1);
        }
        requestAnimationFrame(animateRain);
    }
    animateRain();

    // ====================== GLITCH EFFECT ======================
    let glitchTimer = 0;
    function maybeGlitch() {
        glitchTimer++;
        if (glitchTimer % 180 === 0 && Math.random() > 0.6) {
            const glitchOverlay = document.createElement('div');
            glitchOverlay.style.cssText = `
                position:fixed;z-index:5;pointer-events:none;
                top:${Math.random()*80}%;left:0;right:0;
                height:${2+Math.random()*6}px;
                background:${rainColor};
                opacity:${0.1+Math.random()*0.15};
                mix-blend-mode:screen;
            `;
            document.body.appendChild(glitchOverlay);
            setTimeout(() => glitchOverlay.remove(), 50 + Math.random() * 100);
        }
    }
    setInterval(maybeGlitch, 16);

    // ====================== DIGITAL CLOCK ======================
    const isHomePage = !(/settings|items|users|tags/.test(window.location.pathname));
    const clockContainer = document.createElement('div');
    clockContainer.id = 'clock-container';
    clockContainer.style.display = isHomePage ? 'block' : 'none';

    const clockEl = document.createElement('div');
    clockEl.style.cssText = 'font-family:JetBrains Mono,monospace;font-size:18px;font-weight:700;letter-spacing:2px;white-space:nowrap;';
    clockContainer.appendChild(clockEl);
    document.body.appendChild(clockContainer);
    clockContainer.addEventListener('click', () => { window.location.href = '/'; });

    const _push = history.pushState.bind(history);
    history.pushState = function(...a) {
        _push(...a);
        clockContainer.style.display = /settings|items|users|tags/.test(a[2] || window.location.pathname) ? 'none' : 'block';
    };
    window.addEventListener('popstate', () => {
        clockContainer.style.display = /settings|items|users|tags/.test(window.location.pathname) ? 'none' : 'block';
    });

    let colonVisible = true;
    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const colon = colonVisible ? ':' : ' ';
        colonVisible = !colonVisible;
        clockEl.textContent = `${h}${colon}${m}${colon}${s}`;
        clockEl.style.color = rainColor;
        clockEl.style.textShadow = `0 0 8px ${rainColor}, 0 0 16px ${rainColor}40`;
    }
    updateClock();
    setInterval(updateClock, 500);

    // ====================== CRT FLICKER ======================
    const flickerStyle = document.createElement('style');
    flickerStyle.textContent = `
        @keyframes crtFlicker {
            0% { opacity: 0.97; }
            30% { opacity: 1; }
            70% { opacity: 0.985; }
            100% { opacity: 0.97; }
        }
        body { animation: crtFlicker 4s infinite; }
        #app, #app > *, .navbar, header { position: relative; z-index: 10 !important; }
    `;
    document.head.appendChild(flickerStyle);

    // ====================== THEME SWITCHING ======================
    function updateTheme() {
        const hour = new Date().getHours();
        let newTheme;
        if (hour >= 6 && hour < 17) newTheme = 'day';
        else if (hour >= 17 && hour < 20) newTheme = 'evening';
        else newTheme = 'night';
        if (newTheme === currentTheme) return;

        document.body.classList.remove('day', 'evening', 'night');
        document.body.classList.add(newTheme);
        currentTheme = newTheme;
        currentThemeNum = newTheme === 'day' ? 0 : (newTheme === 'evening' ? 1 : 2);
        updateRainColors(newTheme);
    }

    updateTheme();
    setInterval(updateTheme, 60000);
});
