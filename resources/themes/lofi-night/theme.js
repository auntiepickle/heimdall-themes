document.addEventListener('DOMContentLoaded', () => {

    // ====================== VIGNETTE (CSS pseudo-element, always behind UI) ======================
    const vignetteStyle = document.createElement('style');
    vignetteStyle.textContent = `
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            z-index: 1;
            pointer-events: none;
            background: radial-gradient(ellipse at center,
                transparent 35%,
                rgba(0,0,0,0.55) 100%);
            transition: opacity 2s ease;
        }
        body.day::before     { opacity: 0.5; }
        body.evening::before { opacity: 0.7; }
        body.night::before   { opacity: 0.85; }
    `;
    document.head.appendChild(vignetteStyle);

    // ====================== PARALLAX SETUP ======================
    // Strategy: make the background image larger than the viewport,
    // then translate it with a smoothed mouse offset — no calc() tricks,
    // no background-position jumps, no edge bleed.
    const PARALLAX_SCALE  = 1.18;   // image is 18% larger than viewport on each axis
    const PARALLAX_AMOUNT = 40;     // max px offset in each direction
    const PARALLAX_EASE   = 0.06;   // lerp factor — lower = dreamier/slower

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let rafParallax = null;

    // Apply the fixed background sizing once
    Object.assign(document.body.style, {
        backgroundRepeat:     'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundSize:       `${PARALLAX_SCALE * 100}%`,
    });

    document.addEventListener('mousemove', e => {
        // Normalise mouse to -1..1 from centre
        const nx = (e.clientX / window.innerWidth  - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        targetX = -nx * PARALLAX_AMOUNT;
        targetY = -ny * PARALLAX_AMOUNT;
    });

    function tickParallax() {
        // Smooth lerp — feels dreamy, never jumpy
        currentX += (targetX - currentX) * PARALLAX_EASE;
        currentY += (targetY - currentY) * PARALLAX_EASE;

        // Use transform on a wrapper element if possible, otherwise
        // set background-position as offset from dead-centre of the oversized image.
        const cx = 50 + (currentX / window.innerWidth)  * 100;
        const cy = 50 + (currentY / window.innerHeight) * 100;
        document.body.style.backgroundPosition = `${cx}% ${cy}%`;

        rafParallax = requestAnimationFrame(tickParallax);
    }
    tickParallax();

    // ====================== PARTICLE CANVAS ======================
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:3;opacity:0.7;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // ====================== SHADER CANVAS ======================
    // soft-light blend: works on dark AND light backgrounds.
    // Opacity bumped up so it's actually visible.
    const effectsCanvas = document.createElement('canvas');
    effectsCanvas.style.cssText = [
        'position:fixed','top:0','left:0',
        'width:100%','height:100%',
        'pointer-events:none',
        'z-index:2',
        'mix-blend-mode:soft-light',
        'opacity:0.7'
    ].join(';');
    document.body.appendChild(effectsCanvas);

    let gl = effectsCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
           || effectsCanvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });

    let currentThemeNum = 0;
    let mouseX = window.innerWidth  * 0.5;
    let mouseY = window.innerHeight * 0.5;
    let startTime = Date.now();

    if (!gl) {
        console.warn('WebGL not supported – skipping shader effects');
    } else {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const vsSource = `
            attribute vec2 a_position;
            void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
        `;

        const fsSource = `
            precision mediump float;
            uniform vec2  u_resolution;
            uniform vec2  u_mouse;
            uniform float u_time;
            uniform float u_theme;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution;
                uv.y = 1.0 - uv.y;

                // Film grain — more visible now
                float grain = (hash(uv + fract(u_time * 0.41)) - 0.5) * 0.18;

                // Time-of-day tint, shifted toward mid-grey so soft-light reads well
                vec3 tint;
                if (u_theme < 0.5) {
                    tint = vec3(0.60, 0.80, 0.62);   // day: green
                } else if (u_theme < 1.5) {
                    tint = vec3(0.82, 0.55, 0.30);   // evening: amber
                } else {
                    tint = vec3(0.30, 0.36, 0.78);   // night: blue-purple
                }

                // Mouse spotlight — larger, warmer
                vec2 mouseNorm = u_mouse / u_resolution;
                mouseNorm.y = 1.0 - mouseNorm.y;
                float spotDist = length(uv - mouseNorm);
                float spotlight = smoothstep(0.55, 0.0, spotDist) * 0.35;
                vec3 spotColor  = vec3(0.4, 0.32, 0.18) * spotlight;

                // Subtle breathing pulse
                float pulse = sin(u_time * 0.4) * 0.03;

                vec3 color = tint + spotColor + grain + pulse;
                color = clamp(color, 0.0, 1.0);

                gl_FragColor = vec4(color, 0.85);
            }
        `;

        function createShader(type, src) {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                console.error('Shader error:', gl.getShaderInfoLog(s));
            return s;
        }

        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl.VERTEX_SHADER,   vsSource));
        gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
        gl.linkProgram(program);
        gl.useProgram(program);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const uRes   = gl.getUniformLocation(program, 'u_resolution');
        const uMouse = gl.getUniformLocation(program, 'u_mouse');
        const uTime  = gl.getUniformLocation(program, 'u_time');
        const uTheme = gl.getUniformLocation(program, 'u_theme');

        function resizeEffects() {
            effectsCanvas.width  = window.innerWidth;
            effectsCanvas.height = window.innerHeight;
            gl.viewport(0, 0, effectsCanvas.width, effectsCanvas.height);
        }
        window.addEventListener('resize', resizeEffects);
        resizeEffects();

        document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

        function animateEffects() {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(uRes,   effectsCanvas.width, effectsCanvas.height);
            gl.uniform2f(uMouse, mouseX, mouseY);
            gl.uniform1f(uTime,  (Date.now() - startTime) / 1000);
            gl.uniform1f(uTheme, currentThemeNum);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            requestAnimationFrame(animateEffects);
        }
        animateEffects();
    }

    // ====================== PARTICLES + THEME ======================
    let particles = [];
    let currentTheme = '';
    const baseURL = 'http://192.168.1.41:8081/heimdallimages/';
    const fallbackBackgrounds = {
        day:     'http://192.168.1.41:8081/day.jpg',
        evening: 'http://192.168.1.41:8081/evening.jpg',
        night:   'http://192.168.1.41:8081/night.jpg'
    };

    async function updateTheme() {
        const hour = new Date().getHours();
        let newTheme;
        if      (hour >= 6  && hour < 17) newTheme = 'day';
        else if (hour >= 17 && hour < 20) newTheme = 'evening';
        else                               newTheme = 'night';

        if (newTheme === currentTheme) return;

        const themeDir = `${baseURL}${newTheme}/`;
        let bgUrl = fallbackBackgrounds[newTheme];

        try {
            const response = await fetch(themeDir);
            if (response.ok) {
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const imageLinks = Array.from(doc.querySelectorAll('a'))
                    .map(a => a.getAttribute('href'))
                    .filter(href => href && /\.(jpg|jpeg|png)$/i.test(href) && !href.includes('..') && href !== '/')
                    .map(href => new URL(href, themeDir).href);
                if (imageLinks.length > 0)
                    bgUrl = imageLinks[Math.floor(Math.random() * imageLinks.length)];
            }
        } catch (err) {
            console.error(`Failed to load images from ${themeDir}`, err);
        }

        document.body.style.backgroundImage = `url('${bgUrl}')`;
        document.body.classList.remove('day', 'evening', 'night');
        document.body.classList.add(newTheme);
        currentTheme = newTheme;
        currentThemeNum = newTheme === 'day' ? 0 : (newTheme === 'evening' ? 1 : 2);

        const colors = newTheme === 'night'
            ? ['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b']
            : ['#86efac', '#a7f3d0', '#6ee7b7', '#bbf7d0'];

        particles = Array.from({ length: newTheme === 'night' ? 40 : 30 }, () => ({
            x:        Math.random() * canvas.width,
            y:        Math.random() * canvas.height - canvas.height,
            size:     newTheme === 'night' ? Math.random() * 4 + 2 : Math.random() * 10 + 6,
            speedX:   Math.random() * 0.6 - 0.3,
            speedY:   newTheme === 'night' ? Math.random() * 0.3 + 0.1 : Math.random() * 0.4 + 0.3,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: Math.random() * 0.04 - 0.02,
            color:    colors[Math.floor(Math.random() * colors.length)]
        }));
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            if (currentTheme === 'night') {
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 25;
                ctx.shadowColor = p.color;
                ctx.fill();
            } else {
                ctx.font = `${p.size}px serif`;
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 12;
                ctx.shadowColor = p.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🍃', 0, 0);
            }
            ctx.restore();
            p.x += p.speedX;
            p.y += p.speedY;
            p.rotation += p.rotSpeed;
            if (p.y > canvas.height + 30) { p.y = -30; p.x = Math.random() * canvas.width; }
        });
        requestAnimationFrame(animate);
    }

    // ====================== SETUP ======================
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    updateTheme();
    animate();

    window.addEventListener('resize', () => {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        // Re-apply sizing on resize
        document.body.style.backgroundSize = `${PARALLAX_SCALE * 100}%`;
    });
    setInterval(updateTheme, 60000);

    // ====================== ANALOG CLOCK ======================
    const clockContainer = document.createElement('div');
    clockContainer.id = 'clock-container';
    clockContainer.style.width  = '100px';
    clockContainer.style.height = '100px';
    const clockCanvas = document.createElement('canvas');
    clockCanvas.width  = 100;
    clockCanvas.height = 100;
    clockContainer.appendChild(clockCanvas);
    document.body.appendChild(clockContainer);
    $('#clock-container').click(() => { window.location.href = '/'; });
    const clockCtx = clockCanvas.getContext('2d');

    function drawClock() {
        clockCtx.clearRect(0, 0, 100, 100);
        clockCtx.save();
        clockCtx.translate(50, 50);
        clockCtx.rotate(-Math.PI / 2);

        clockCtx.strokeStyle = '#1e293b';
        clockCtx.fillStyle   = '#ffffff';
        clockCtx.lineWidth   = 4;
        clockCtx.beginPath();
        clockCtx.arc(0, 0, 46, 0, Math.PI * 2);
        clockCtx.fill();
        clockCtx.stroke();

        clockCtx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
            clockCtx.beginPath();
            clockCtx.moveTo(38, 0);
            clockCtx.lineTo(42, 0);
            clockCtx.stroke();
            clockCtx.rotate(Math.PI / 6);
        }

        const now    = new Date();
        const hour   = now.getHours() % 12;
        const minute = now.getMinutes();
        const second = now.getSeconds();

        clockCtx.rotate((Math.PI / 6) * hour + (Math.PI / 360) * minute + Math.PI / 21600 * second);
        clockCtx.lineWidth = 5; clockCtx.strokeStyle = '#1e293b';
        clockCtx.beginPath(); clockCtx.moveTo(0, 0); clockCtx.lineTo(20, 0); clockCtx.stroke();
        clockCtx.rotate(-((Math.PI / 6) * hour + (Math.PI / 360) * minute + Math.PI / 21600 * second));

        clockCtx.rotate((Math.PI / 30) * minute + (Math.PI / 1800) * second);
        clockCtx.lineWidth = 3;
        clockCtx.beginPath(); clockCtx.moveTo(0, 0); clockCtx.lineTo(35, 0); clockCtx.stroke();
        clockCtx.rotate(-((Math.PI / 30) * minute + (Math.PI / 1800) * second));

        clockCtx.rotate((Math.PI / 30) * second);
        clockCtx.lineWidth = 1; clockCtx.strokeStyle = '#ef4444';
        clockCtx.beginPath(); clockCtx.moveTo(0, 0); clockCtx.lineTo(40, 0); clockCtx.stroke();

        clockCtx.restore();
    }
    drawClock();
    setInterval(drawClock, 1000);
});
