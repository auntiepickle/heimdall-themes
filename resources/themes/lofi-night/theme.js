document.addEventListener('DOMContentLoaded', () => {

    // ====================== CONFIG ======================
    const themeCfg = window.__HEIMDALL_THEME__ || {};
    const backgrounds = themeCfg.backgrounds || {};
    const imageBaseUrl = themeCfg.imageBaseUrl || '';

    function pickBackground(variant) {
        let list = backgrounds[variant];
        if (!list || !list.length) list = backgrounds['day'] || [];
        if (list.length) return list[Math.floor(Math.random() * list.length)];
        return '';
    }

    // ====================== ACTIVITY DETECTION ======================
    // Dims effects when user is actively interacting, ramps back on idle.
    let lastActivity = 0;
    const IDLE_THRESHOLD = 4000;
    const ACTIVE_INTENSITY = 0.12;  // barely there when clicking around
    const IDLE_INTENSITY = 0.55;    // never goes full blast — subtle CRT warmth
    const RAMP_BACK_SPEED = 0.001;  // very slow ease back
    let activityDim = 0.55;

    function onActivity() { lastActivity = Date.now(); }
    document.addEventListener('mousemove', onActivity);
    document.addEventListener('keydown', onActivity);
    document.addEventListener('click', onActivity);
    document.addEventListener('scroll', onActivity, true);

    function getActivityMultiplier() {
        const idle = Date.now() - lastActivity;
        if (idle < IDLE_THRESHOLD) {
            activityDim = Math.max(activityDim - 0.04, ACTIVE_INTENSITY);
        } else {
            activityDim = Math.min(activityDim + RAMP_BACK_SPEED * (idle - IDLE_THRESHOLD) * 0.001, IDLE_INTENSITY);
        }
        return activityDim;
    }

    // ====================== LOAD RAMP ======================
    const rampStart = Date.now();
    function layerRamp(delayMs, durationMs) {
        const elapsed = Math.max(0, Date.now() - rampStart - delayMs);
        const t = Math.min(elapsed / durationMs, 1.0);
        return 1 - Math.pow(1 - t, 3);
    }
    const getRamp        = () => layerRamp(0,    10000);
    const getAtmoRamp    = () => layerRamp(7000, 12000);
    const getGlitchRamp  = () => layerRamp(4000, 18000);
    const getParticleRamp= () => layerRamp(10000,12000);
    const getFireflyRamp = () => layerRamp(12000,14000);

    // ====================== VIGNETTE + STACKING ======================
    const vignetteStyle = document.createElement('style');
    vignetteStyle.textContent = `
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            z-index: 1;
            pointer-events: none;
            background: radial-gradient(ellipse at center,
                transparent 30%, rgba(0,0,0,0.65) 100%);
            opacity: 0;
            transition: opacity 14s 2s cubic-bezier(0.2, 0, 0.4, 1);
        }
        body.day::before     { opacity: 0.5; }
        body.evening::before { opacity: 0.72; }
        body.night::before   { opacity: 0.88; }
        #app, #app > *, .navbar, header { position: relative; z-index: 10 !important; }
        #clock-container {
            position: fixed !important;
            top: 12px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 20 !important;
            pointer-events: auto !important;
            width: 90px !important;
            height: 90px !important;
            border-radius: 50% !important;
            overflow: hidden !important;
            cursor: pointer !important;
            transition: transform 0.3s ease, box-shadow 0.3s ease !important;
            isolation: auto !important;
        }
        #clock-container:hover { transform: translateX(-50%) scale(1.06) !important; }
        @media (max-width: 768px) {
            #clock-container {
                width: 72px !important;
                height: 72px !important;
                top: 8px !important;
            }
        }
    `;
    document.head.appendChild(vignetteStyle);

    // ====================== PARALLAX ======================
    const PARALLAX_AMOUNT = 60, PARALLAX_EASE = 0.05;
    const parallaxStyle = document.createElement('style');
    parallaxStyle.textContent = `
        @keyframes kenBurns {
            0%   { transform: scale(1.0) translate(0px, 0px); }
            25%  { transform: scale(1.04) translate(-8px, -4px); }
            50%  { transform: scale(1.07) translate(4px, -8px); }
            75%  { transform: scale(1.04) translate(8px, 4px); }
            100% { transform: scale(1.0) translate(0px, 0px); }
        }
        #parallax-bg {
            position: fixed;
            top:-${PARALLAX_AMOUNT}px; left:-${PARALLAX_AMOUNT}px;
            right:-${PARALLAX_AMOUNT}px; bottom:-${PARALLAX_AMOUNT}px;
            background-size:cover; background-position:center;
            background-repeat:no-repeat; z-index:0;
            will-change:transform;
            opacity: 0;
            transition: background-image 4s ease-in-out,
                        opacity 3s ease-out;
        }
    `;
    document.head.appendChild(parallaxStyle);
    const parallaxBg = document.createElement('div');
    parallaxBg.id = 'parallax-bg';
    document.body.insertBefore(parallaxBg, document.body.firstChild);
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundColor = '#0a0a14';
    let targetX=0,targetY=0,currentX=0,currentY=0;
    document.addEventListener('mousemove', e => {
        targetX = -(e.clientX/window.innerWidth -0.5)*2*(PARALLAX_AMOUNT*0.6);
        targetY = -(e.clientY/window.innerHeight-0.5)*2*(PARALLAX_AMOUNT*0.6);
    });
    (function tickParallax(){
        currentX += (targetX-currentX)*PARALLAX_EASE;
        currentY += (targetY-currentY)*PARALLAX_EASE;
        const kbT  = Date.now() / 1000;
        const kbScale = 1.0 + 0.035 * (Math.sin(kbT * 0.018) * 0.5 + 0.5);
        const kbX  = Math.sin(kbT * 0.013) * 10;
        const kbY  = Math.cos(kbT * 0.009) * 7;
        parallaxBg.style.transform =
            `translate(${currentX + kbX}px, ${currentY + kbY}px) scale(${kbScale.toFixed(4)})`;
        requestAnimationFrame(tickParallax);
    })();

    // ====================== SHADER LAYERS ======================
    function makeShaderCanvas(zIndex, blendMode, opacity) {
        const el = document.createElement('canvas');
        el.style.cssText = ['position:fixed','top:0','left:0','width:100%','height:100%',
            'pointer-events:none',`z-index:${zIndex}`,
            `mix-blend-mode:${blendMode}`,`opacity:${opacity}`].join(';');
        document.body.appendChild(el);
        return el;
    }
    const atmoCanvas  = makeShaderCanvas(1, 'overlay',    0.55);
    const glitchCanvas = makeShaderCanvas(2, 'soft-light', 0.60);

    function updateShaderTheme(theme) {
        if (theme === 'night') {
            atmoCanvas.dataset.baseOpacity   = '0.30';
            atmoCanvas.style.mixBlendMode    = 'screen';
            glitchCanvas.dataset.baseOpacity = '0.38';
            glitchCanvas.style.mixBlendMode  = 'overlay';
        } else if (theme === 'evening') {
            atmoCanvas.dataset.baseOpacity   = '0.28';
            atmoCanvas.style.mixBlendMode    = 'overlay';
            glitchCanvas.dataset.baseOpacity = '0.34';
            glitchCanvas.style.mixBlendMode  = 'soft-light';
        } else {
            atmoCanvas.dataset.baseOpacity   = '0.25';
            atmoCanvas.style.mixBlendMode    = 'overlay';
            glitchCanvas.dataset.baseOpacity = '0.30';
            glitchCanvas.style.mixBlendMode  = 'soft-light';
        }
    }

    let mouseX = window.innerWidth*0.5, mouseY = window.innerHeight*0.5;
    let currentThemeNum = 0;
    const startTime = Date.now();
    document.addEventListener('mousemove', e => { mouseX=e.clientX; mouseY=e.clientY; });

    function initGL(canvas, fsSource) {
        const gl = canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false})
                || canvas.getContext('experimental-webgl',{alpha:true,premultipliedAlpha:false});
        if (!gl) return null;
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        const vs = `attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0,1);}`;
        function mkS(type,src){
            const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
            if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(s));
            return s;
        }
        const prog=gl.createProgram();
        gl.attachShader(prog,mkS(gl.VERTEX_SHADER,vs));
        gl.attachShader(prog,mkS(gl.FRAGMENT_SHADER,fsSource));
        gl.linkProgram(prog);gl.useProgram(prog);
        const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
        const loc=gl.getAttribLocation(prog,'a_position');
        gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
        return{gl,uRes:gl.getUniformLocation(prog,'u_resolution'),
            uMouse:gl.getUniformLocation(prog,'u_mouse'),
            uTime:gl.getUniformLocation(prog,'u_time'),
            uTheme:gl.getUniformLocation(prog,'u_theme')};
    }

    const atmoCtx = initGL(atmoCanvas, `
        precision mediump float;
        uniform vec2 u_resolution,u_mouse;
        uniform float u_time,u_theme;

        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float hash1(float n){return fract(sin(n)*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                       mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float v=0.,a=0.5;
            for(int i=0;i<5;i++){v+=a*noise(p);p*=2.1;a*=0.5;}return v;}

        float drift(float seed, float t) {
            float speed = 0.018 + hash1(seed)       * 0.022;
            float phase = hash1(seed + 7.3)          * 6.28;
            float s1    = sin(t * speed       + phase);
            float s2    = sin(t * speed * 1.7 + phase * 0.6);
            float s3    = sin(t * speed * 0.4 + phase * 1.4);
            return s1*0.45 + s2*0.35 + s3*0.2;
        }
        float driftR(float seed, float t, float lo, float hi) {
            return lo + (drift(seed,t)*0.5+0.5)*(hi-lo);
        }

        vec3 nightScene(vec2 uv, vec2 mouse, float t) {
            float nebScale1 = driftR(1., t, 1.8, 2.6);
            float nebScale2 = driftR(2., t, 1.4, 2.2);
            float nebStr    = driftR(3., t, 0.18, 0.38);
            float nebDrift  = driftR(4., t, 0.02, 0.06);
            float aurSpeed  = driftR(5., t, 0.18, 0.42);
            float aurWidth  = driftR(6., t, 0.08, 0.18);
            float aurStr    = driftR(7., t, 0.12, 0.30);
            float aurY      = driftR(8., t, 0.15, 0.45);
            float starBlink = driftR(9.,  t, 0.4, 1.0);
            float bioRadius = driftR(10., t, 7.0, 12.0);
            float bioStr    = driftR(11., t, 0.18, 0.35);
            float inkStr    = driftR(12., t, 0.10, 0.28);
            float breath    = driftR(13., t, 0.6, 1.0);

            vec2 n1uv = uv*nebScale1 + vec2(sin(t*0.07)*0.25, cos(t*0.05)*0.2) + t*nebDrift;
            vec2 n2uv = uv*nebScale2 + vec2(cos(t*0.09)*0.2,  sin(t*0.06)*0.25) - t*nebDrift;
            float neb1 = fbm(n1uv);
            float neb2 = fbm(n2uv);
            float nebula = smoothstep(0.42, 0.68, neb1)*0.55 + smoothstep(0.45, 0.70, neb2)*0.4;

            float aurora = 0.;
            for(int i=0;i<3;i++){
                float fi = float(i);
                float spd = aurSpeed * (1.0 + fi*0.3 + drift(20.+fi, t)*0.2);
                float wave = sin(uv.x*2.2 + t*spd + fi*1.9)
                           * sin(uv.x*1.5 - t*spd*0.6 + fi*2.5) * 0.5 + 0.5;
                float bandY = aurY + fi * 0.07;
                float band = smoothstep(aurWidth, 0., abs(uv.y - bandY - wave*aurWidth*1.5));
                aurora += band * (aurStr - fi*0.04) * (drift(30.+fi, t)*0.3+0.7);
            }
            aurora = min(aurora, aurStr);

            float stars = 0.;
            for(int i=0;i<10;i++){
                float fi=float(i);
                vec2 sp=vec2(hash(vec2(fi*3.1,fi*7.4)),hash(vec2(fi*5.3,fi*2.9)));
                float twinkle = sin(t*(1.2+fi*0.35+drift(40.+fi,t)*0.5)+fi*2.1)*0.5+0.5;
                stars += smoothstep(0.022,0.,length(uv-sp)) * twinkle * starBlink;
            }

            float mdist = length(uv - mouse);
            float bioFalloff = 1.0 / (1.0 + pow(mdist * bioRadius * 0.4, 1.6));
            float bio   = bioFalloff * bioStr * (sin(t*2.1)*0.15+0.85);
            float bloom = 1.0 / (1.0 + pow(mdist * 1.8, 1.2)) * bioStr * 0.12;

            float ink = smoothstep(0.45, 0.72, fbm(uv*2.6 + t*0.04)) * inkStr * breath;

            vec3 nebCol  = (vec3(0.5,0.06,0.9)*neb1 + vec3(0.02,0.28,0.82)*neb2) * nebStr;
            vec3 aurCol  = vec3(0.12, 0.82, 0.92) * aurora;
            vec3 starCol = vec3(0.88, 0.93, 1.0)  * stars * 0.7;
            vec3 bioCol  = vec3(0.05, 0.82, 0.92) * bio + vec3(0.18,0.38,0.78)*bloom*0.3;
            vec3 inkCol  = vec3(0.55, 0.08, 0.92) * ink;

            vec3 color = nebCol + aurCol + starCol + bioCol + inkCol;
            return clamp(color, 0., 1.);
        }

        vec3 dayEveScene(vec2 uv, vec2 mouse, float t) {
            float aurStr  = driftR(50., t, 0.18, 0.42);
            float inkStr  = driftR(51., t, 0.35, 0.65);
            float bioStr  = driftR(52., t, 0.45, 0.80);
            float rayStr  = driftR(53., t, 0.10, 0.22);
            float breath  = driftR(54., t, 0.65, 1.0);

            vec2 auv=uv*vec2(2.5,1.2);
            float aurora=0.;
            for(int i=0;i<3;i++){float fi=float(i);
                float wave=sin(auv.x*2.1+t*0.4+fi*1.3)*sin(auv.x*1.3-t*0.25+fi*2.1)*0.5+0.5;
                aurora+=smoothstep(0.28,0.,abs(uv.y-0.35-wave*0.22-fi*0.11))*(aurStr-fi*0.06);}

            float ink=smoothstep(0.38,0.72,fbm((uv+vec2(sin(t*0.13)*0.15,cos(t*0.09)*0.12))*3.+t*0.07))*inkStr;
            float mdist=length(uv-mouse);
            float bioGlow=exp(-mdist*5.5)*(sin(t*1.8)*0.2+0.8)*bioStr;
            vec2 rayUV=uv-vec2(0.5,0.);float ray=0.;
            for(int i=0;i<4;i++){float fi=float(i);float angle=fi*0.4-0.6;
                float r=max(0.,1.-abs(rayUV.x/rayUV.y-angle)*3.5);ray+=r*r*(1.-uv.y)*rayStr;}
            vec3 col1,col2,col3;
            if(u_theme<0.5){col1=vec3(0.1,0.7,0.45);col2=vec3(0.8,0.75,0.2);col3=vec3(0.2,0.9,0.8);}
            else{col1=vec3(0.85,0.45,0.05);col2=vec3(0.7,0.1,0.25);col3=vec3(1.,0.6,0.1);}
            vec3 color=col1*aurora*breath + col2*ink + col3*bioGlow + vec3(0.9,0.85,0.6)*ray;
            return clamp(color*0.65+0.12, 0., 1.);
        }

        void main(){
            vec2 uv=gl_FragCoord.xy/u_resolution; uv.y=1.-uv.y;
            vec2 mouse=u_mouse/u_resolution; mouse.y=1.-mouse.y;
            vec3 color;
            if(u_theme>1.5){
                color = nightScene(uv, mouse, u_time);
                gl_FragColor=vec4(color, 0.90);
            } else {
                color = dayEveScene(uv, mouse, u_time);
                gl_FragColor=vec4(color, 0.88);
            }
        }
    `);

    const glitchCtx = initGL(glitchCanvas, `
        precision mediump float;
        uniform vec2 u_resolution,u_mouse;
        uniform float u_time,u_theme;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float hash1(float x){return fract(sin(x*391.32)*43758.5453);}
        float filmHash(vec2 p,float t){
            float tf=floor(t*24.);float bl=fract(t*24.);bl=bl*bl*(3.-2.*bl);
            return mix(fract(sin(dot(p+tf,vec2(127.1,311.7)))*43758.5453),
                       fract(sin(dot(p+tf+1.,vec2(127.1,311.7)))*43758.5453),bl);
        }
        void main(){
            vec2 uv=gl_FragCoord.xy/u_resolution; uv.y=1.-uv.y;
            float t=u_time;
            bool isNight = u_theme > 1.5;

            float grainAmt    = isNight ? 1.6 : 1.3;
            float scanAmt     = isNight ? 0.10 : 0.07;
            float aberrBase   = isNight ? 0.008 : 0.005;
            float glitchThresh= isNight ? 0.91 : 0.94;
            float rollSpeed   = isNight ? 0.07 : 0.05;
            float lightThresh = isNight ? 0.88 : 0.92;
            float burnAmt     = isNight ? 0.35 : 0.26;

            float scanRoll=mod(uv.y+t*rollSpeed+sin(t*0.13)*0.008+sin(t*0.031)*0.004,1.);
            float rollBand=smoothstep(0.006,0.,abs(scanRoll-0.5))*(isNight?0.10:0.06);
            float scanline=sin(gl_FragCoord.y*3.14159*(isNight?2.2:1.8))*scanAmt+0.5;
            float breathD=0.85+0.15*sin(t*0.21);
            float breathC=0.70+0.30*sin(t*0.13+1.7);
            float fine=(filmHash(gl_FragCoord.xy,t)-0.5)*2.*mix(0.12,0.04,0.5);
            float coarse=(filmHash(floor(gl_FragCoord.xy/3.)*0.7,t)-0.5)*2.*mix(0.09,0.02,0.5)*breathC;
            float grain=(fine+coarse)*breathD*grainAmt;
            grain*=0.9+uv.y*0.2;
            float aberrAmt=aberrBase+sin(t*0.7)*0.004;
            float rShift=hash(vec2(floor(uv.y*80.),t))>0.96?(hash(vec2(t,uv.y))-0.5)*0.04:aberrAmt*(uv.x-0.5);
            float glitchLine=floor(uv.y*60.),glitchTime=floor(t*8.);
            float isGlitch=step(glitchThresh,hash(vec2(glitchLine,glitchTime)));
            float glitchShift=(hash(vec2(glitchLine+0.5,glitchTime))-0.5)*0.05*isGlitch;

            float tear=0.;
            if(isNight){
                float tearLine=floor(uv.y*30.);float tearTime=floor(t*4.);
                float isTear=step(0.94,hash(vec2(tearLine+0.7,tearTime)));
                tear=(hash(vec2(tearLine,tearTime))-0.5)*0.06*isTear;
            }

            float lightning=0.;float ltPhase=floor(t*0.4);
            if(hash1(ltPhase)>lightThresh){float ltX=hash1(ltPhase+1.);float ltAge=fract(t*0.4);
                lightning=smoothstep(0.012,0.,abs(uv.x-ltX))*(1.-ltAge*3.)*step(ltAge,0.33)*(0.7+hash(uv+ltPhase)*0.4);}

            float rain=0.;int rainCount=isNight?5:3;
            for(int i=0;i<8;i++){
                if(float(i)>=float(rainCount))break;
                float fi=float(i);
                float rx=hash1(fi*7.3+floor(t*0.5))*1.2-0.1;
                float ry=mod(uv.y+t*(0.4+fi*0.07)+fi*0.37,1.2)-0.1;
                float rlen=smoothstep(0.,0.18,ry)*smoothstep(0.22,0.18,ry);
                rain+=smoothstep(0.002,0.,abs(uv.x-rx-ry*0.08))*rlen*(isNight?0.10:0.06);}

            float burn=pow(smoothstep(0.45,1.,length((uv-0.5)*1.4)),2.)*burnAmt;
            float val=clamp(0.5+grain*0.55+scanline*0.05+rollBand*0.10
                        +(rShift+glitchShift+tear)*0.22-burn*0.28,0.,1.);

            float rMult=isNight?0.28:0.20;
            float bMult=isNight?0.20:0.14;
            float r=clamp(val+(rShift+glitchShift)*rMult+lightning*0.7,0.,1.);
            float g=clamp(val+lightning*0.5,0.,1.);
            float b=clamp(val-(rShift+glitchShift)*bMult+lightning*0.95+rain*0.6,0.,1.);
            gl_FragColor=vec4(r,g,b,isNight?0.88:0.88);
        }
    `);

    function resizeAll(){
        for(const[c,info]of[[atmoCanvas,atmoCtx],[glitchCanvas,glitchCtx]]){
            if(!info)continue;
            c.width=window.innerWidth;c.height=window.innerHeight;
            info.gl.viewport(0,0,c.width,c.height);
        }
    }
    window.addEventListener('resize',resizeAll); resizeAll();

    function animateShaders(){
        const t=(Date.now()-startTime)/1000;
        const act=getActivityMultiplier();
        const atmoTarget   = parseFloat(atmoCanvas.dataset.baseOpacity   || 0.52);
        const glitchTarget = parseFloat(glitchCanvas.dataset.baseOpacity  || 0.46);
        atmoCanvas.style.opacity   = (atmoTarget   * getAtmoRamp() * act).toFixed(3);
        glitchCanvas.style.opacity = (glitchTarget * getGlitchRamp() * act).toFixed(3);

        for(const[c,info]of[[atmoCanvas,atmoCtx],[glitchCanvas,glitchCtx]]){
            if(!info)continue;
            const{gl,uRes,uMouse,uTime,uTheme}=info;
            gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(uRes,c.width,c.height);gl.uniform2f(uMouse,mouseX,mouseY);
            gl.uniform1f(uTime,t);gl.uniform1f(uTheme,currentThemeNum);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        }
        requestAnimationFrame(animateShaders);
    }
    animateShaders();

    // ====================== PARTICLE CANVAS ======================
    const canvas = document.createElement('canvas');
    canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:3;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // ====================== CLOCK ======================
    const isHomePage = !(/settings|items|users|tags/.test(window.location.pathname));
    const clockContainer = document.createElement('div');
    clockContainer.id = 'clock-container';
    clockContainer.style.display = isHomePage ? 'block' : 'none';
    const clockCanvas = document.createElement('canvas');
    clockCanvas.width = 90; clockCanvas.height = 90;
    clockContainer.appendChild(clockCanvas);
    document.body.appendChild(clockContainer);
    if (typeof $ !== 'undefined') $('#clock-container').click(()=>{ window.location.href='/'; });
    else clockContainer.addEventListener('click', ()=>{ window.location.href='/'; });
    const clockCtx = clockCanvas.getContext('2d');

    const _push = history.pushState.bind(history);
    history.pushState = function(...a){
        _push(...a);
        clockContainer.style.display=/settings|items|users|tags/.test(a[2]||window.location.pathname)?'none':'block';
    };
    window.addEventListener('popstate',()=>{
        clockContainer.style.display=/settings|items|users|tags/.test(window.location.pathname)?'none':'block';
    });

    // ---- DAY CLOCK: Paper & Ink ----
    function drawClockDay(ctx, now) {
        const W=90, cx=45, cy=45, r=40;
        ctx.clearRect(0,0,W,W);
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        ctx.fillStyle='#fef9ef'; ctx.fill();
        ctx.strokeStyle='#d6c9a8'; ctx.lineWidth=1.5;
        ctx.setLineDash([2,1.5]); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(cx,cy,r-7,0,Math.PI*2);
        ctx.strokeStyle='#e8dfc8'; ctx.lineWidth=0.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx+10,cy+8,7,0,Math.PI*2);
        ctx.strokeStyle='rgba(180,140,90,0.22)'; ctx.lineWidth=1; ctx.stroke();
        [[0,-32],[32,0],[0,32],[-32,0]].forEach(([dx,dy])=>{
            ctx.beginPath(); ctx.arc(cx+dx,cy+dy,1.8,0,Math.PI*2);
            ctx.fillStyle='#a0855b'; ctx.fill();
        });
        [[-6,-41],[0,-42],[6,-41]].forEach(([dx,dy],i)=>{
            ctx.beginPath();
            ctx.moveTo(cx+dx,cy+dy);
            ctx.quadraticCurveTo(cx+dx+(i-1)*3,cy+dy-10,cx+dx+(i-1)*2,cy+dy-18);
            ctx.strokeStyle='rgba(180,140,90,0.3)'; ctx.lineWidth=1; ctx.stroke();
        });
        const h=now.getHours()%12, m=now.getMinutes(), s=now.getSeconds();
        const hAngle=(Math.PI/6)*h+(Math.PI/360)*m+Math.PI/21600*s - Math.PI/2;
        const mAngle=(Math.PI/30)*m+(Math.PI/1800)*s - Math.PI/2;
        const sAngle=(Math.PI/30)*s - Math.PI/2;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(hAngle)*5, cy+Math.sin(hAngle)*5);
        ctx.lineTo(cx+Math.cos(hAngle)*22, cy+Math.sin(hAngle)*26);
        ctx.strokeStyle='#5c4a2a'; ctx.lineWidth=3.5; ctx.lineCap='round'; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(mAngle)*5, cy+Math.sin(mAngle)*5);
        ctx.lineTo(cx+Math.cos(mAngle)*30, cy+Math.sin(mAngle)*36);
        ctx.strokeStyle='#5c4a2a'; ctx.lineWidth=2; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(sAngle)*(-5), cy+Math.sin(sAngle)*(-5));
        ctx.lineTo(cx+Math.cos(sAngle)*32, cy+Math.sin(sAngle)*38);
        ctx.strokeStyle='rgba(180,60,40,0.75)'; ctx.lineWidth=0.8; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2);
        ctx.fillStyle='#5c4a2a'; ctx.fill();
    }

    // ---- EVENING CLOCK: Leaf Wreath ----
    function drawClockEvening(ctx, now) {
        const W=90, cx=45, cy=45, r=40;
        ctx.clearRect(0,0,W,W);
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        ctx.fillStyle='#f0f7f0'; ctx.fill();
        const leafColors=['#4ade80','#22c55e','#86efac','#16a34a'];
        for(let i=0;i<16;i++){
            const angle=(i/16)*Math.PI*2 - Math.PI/2;
            const lx=cx+Math.cos(angle)*38;
            const ly=cy+Math.sin(angle)*38;
            ctx.save(); ctx.translate(lx,ly); ctx.rotate(angle+Math.PI/2);
            ctx.beginPath(); ctx.ellipse(0,0,3,6,0,0,Math.PI*2);
            ctx.fillStyle=leafColors[i%4]; ctx.globalAlpha=0.8; ctx.fill();
            ctx.restore();
        }
        ctx.globalAlpha=1;
        ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2);
        ctx.fillStyle='white'; ctx.fill();
        ctx.strokeStyle='#d1fae5'; ctx.lineWidth=0.5; ctx.stroke();
        [[0,-23],[23,0],[0,23],[-23,0]].forEach(([dx,dy])=>{
            ctx.beginPath();
            ctx.moveTo(cx+dx*0.85,cy+dy*0.85); ctx.lineTo(cx+dx,cy+dy);
            ctx.strokeStyle='#6ee7b7'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.stroke();
        });
        const h=now.getHours()%12, m=now.getMinutes(), s=now.getSeconds();
        const hAngle=(Math.PI/6)*h+(Math.PI/360)*m+Math.PI/21600*s - Math.PI/2;
        const mAngle=(Math.PI/30)*m+(Math.PI/1800)*s - Math.PI/2;
        const sAngle=(Math.PI/30)*s - Math.PI/2;
        ctx.lineCap='round';
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(hAngle)*4,cy+Math.sin(hAngle)*4);
        ctx.lineTo(cx+Math.cos(hAngle)*17,cy+Math.sin(hAngle)*20);
        ctx.strokeStyle='#166534'; ctx.lineWidth=3.5; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(mAngle)*4,cy+Math.sin(mAngle)*4);
        ctx.lineTo(cx+Math.cos(mAngle)*23,cy+Math.sin(mAngle)*28);
        ctx.strokeStyle='#166534'; ctx.lineWidth=2; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(sAngle)*(-6),cy+Math.sin(sAngle)*(-6));
        ctx.lineTo(cx+Math.cos(sAngle)*25,cy+Math.sin(sAngle)*30);
        ctx.strokeStyle='rgba(220,60,60,0.65)'; ctx.lineWidth=0.8; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2);
        ctx.fillStyle='#166534'; ctx.fill();
    }

    // ---- NIGHT CLOCK: Night Window ----
    function drawClockNight(ctx, now) {
        const W=90, cx=45, cy=45, r=40;
        ctx.clearRect(0,0,W,W);
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        ctx.fillStyle='#1e2a45'; ctx.fill();
        ctx.strokeStyle='#334155'; ctx.lineWidth=1; ctx.stroke();
        const stars=[[-15,-22,1.0,0.9],[ 11,-27,0.7,0.7],[21,-13,1.2,0.8],
                     [-25,8,0.8,0.6],[23,10,0.7,0.5],[-6,23,1.0,0.7],[16,25,0.7,0.6]];
        stars.forEach(([dx,dy,sr,op])=>{
            ctx.beginPath(); ctx.arc(cx+dx,cy+dy,sr,0,Math.PI*2);
            ctx.fillStyle=`rgba(226,232,240,${op})`; ctx.fill();
        });
        ctx.beginPath(); ctx.arc(cx+32,cy,1.0,0,Math.PI*2);
        ctx.fillStyle='rgba(254,240,138,0.8)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx,cy-30,6,0,Math.PI*2);
        ctx.fillStyle='#fcd34d'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx+2,cy-32,4.5,0,Math.PI*2);
        ctx.fillStyle='#1e2a45'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx,cy+33,1.2,0,Math.PI*2);
        ctx.fillStyle='rgba(96,165,250,0.7)'; ctx.fill();
        ctx.save(); ctx.globalAlpha=0.18;
        ctx.beginPath(); ctx.moveTo(cx,cy-38); ctx.lineTo(cx,cy+38);
        ctx.strokeStyle='#334155'; ctx.lineWidth=0.8; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-38,cy); ctx.lineTo(cx+38,cy);
        ctx.stroke(); ctx.restore();
        const h=now.getHours()%12, m=now.getMinutes(), s=now.getSeconds();
        const hAngle=(Math.PI/6)*h+(Math.PI/360)*m+Math.PI/21600*s - Math.PI/2;
        const mAngle=(Math.PI/30)*m+(Math.PI/1800)*s - Math.PI/2;
        const sAngle=(Math.PI/30)*s - Math.PI/2;
        ctx.lineCap='round';
        ctx.shadowBlur=8; ctx.shadowColor='rgba(180,200,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(hAngle)*4,cy+Math.sin(hAngle)*4);
        ctx.lineTo(cx+Math.cos(hAngle)*20,cy+Math.sin(hAngle)*24);
        ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=3; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(mAngle)*4,cy+Math.sin(mAngle)*4);
        ctx.lineTo(cx+Math.cos(mAngle)*28,cy+Math.sin(mAngle)*34);
        ctx.strokeStyle='#93c5fd'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.shadowBlur=0;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(sAngle)*(-8),cy+Math.sin(sAngle)*(-8));
        ctx.lineTo(cx+Math.cos(sAngle)*32,cy+Math.sin(sAngle)*38);
        ctx.strokeStyle='rgba(251,191,36,0.85)'; ctx.lineWidth=0.8; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,3.5,0,Math.PI*2);
        ctx.fillStyle='#60a5fa'; ctx.fill();
    }

    let currentClockTheme = 'night';
    function drawClock() {
        const now = new Date();
        if      (currentClockTheme==='day')     drawClockDay(clockCtx, now);
        else if (currentClockTheme==='evening') drawClockEvening(clockCtx, now);
        else                                    drawClockNight(clockCtx, now);
    }
    drawClock();
    setInterval(drawClock, 1000);

    function updateClockStyle(theme) {
        currentClockTheme = theme;
        if (theme==='night') {
            clockContainer.style.boxShadow='0 4px 24px rgba(96,165,250,0.35), 0 0 0 1px rgba(51,65,85,0.5)';
        } else if (theme==='evening') {
            clockContainer.style.boxShadow='0 4px 20px rgba(74,222,128,0.2), 0 0 0 1px rgba(187,247,208,0.4)';
        } else {
            clockContainer.style.boxShadow='0 4px 20px rgba(0,0,0,0.18), 0 0 0 1px rgba(214,201,168,0.5)';
        }
    }

    // ====================== PARTICLES ======================
    let particles = [];
    let currentTheme = '';

    function spawnLeaf(w, h) {
        const colors=['#4ade80','#22c55e','#86efac','#16a34a','#bbf7d0','#166534'];
        return { type:'leaf', x: Math.random()*w, y: -20,
            size: Math.random()*10+8, speedX: Math.random()*0.8-0.4,
            speedY: Math.random()*0.5+0.3, rotation: Math.random()*Math.PI*2,
            rotSpeed: Math.random()*0.03-0.015,
            color: colors[Math.floor(Math.random()*colors.length)],
            wobble: Math.random()*Math.PI*2, wobbleSpeed: Math.random()*0.04+0.01 };
    }

    function spawnEmber(w, h) {
        const colors=['#f97316','#fb923c','#f59e0b','#fbbf24','#fcd34d','#ef4444'];
        return { type:'ember', x: Math.random()*w, y: h+10,
            size: Math.random()*4+2, speedX: Math.random()*0.6-0.3,
            speedY: -(Math.random()*0.8+0.4), life: 1.0,
            decay: Math.random()*0.004+0.002,
            color: colors[Math.floor(Math.random()*colors.length)],
            flicker: Math.random()*Math.PI*2 };
    }

    function spawnFirefly(w, h) {
        return { type:'firefly', x: Math.random()*w, y: Math.random()*h*0.8+h*0.1,
            size: Math.random()*3+2, vx: Math.random()*0.4-0.2,
            vy: Math.random()*0.4-0.2, life: Math.random(),
            pulseSpeed: Math.random()*0.04+0.02, trail: [],
            trailMax: Math.floor(Math.random()*12+6),
            wanderAngle: Math.random()*Math.PI*2,
            wanderSpeed: Math.random()*0.012+0.003 };
    }

    function spawnRaindrop(w, h) {
        return { type:'rain', x: Math.random()*w, y: -10,
            len: Math.random()*18+8, speed: Math.random()*4+6,
            drift: Math.random()*0.8-0.4,
            opacity: Math.random()*0.15+0.05 };
    }

    // Rain triggers randomly. ~30% chance per theme switch. Lasts until next switch.
    let isRaining = false;

    function initParticles(theme, w, h) {
        particles = [];
        isRaining = Math.random() < 0.3;
        if (theme==='day') {
            for(let i=0;i<28;i++){ const p=spawnLeaf(w,h); p.y=Math.random()*h; particles.push(p); }
            if (isRaining) for(let i=0;i<60;i++){ const p=spawnRaindrop(w,h); p.y=Math.random()*h; particles.push(p); }
        } else if (theme==='evening') {
            for(let i=0;i<45;i++){ const p=spawnEmber(w,h); p.y=Math.random()*h+h*0.3; p.life=Math.random(); particles.push(p); }
            if (isRaining) for(let i=0;i<80;i++){ const p=spawnRaindrop(w,h); p.y=Math.random()*h; particles.push(p); }
        } else {
            for(let i=0;i<35;i++) particles.push(spawnFirefly(w,h));
            if (isRaining) for(let i=0;i<50;i++){ const p=spawnRaindrop(w,h); p.y=Math.random()*h; particles.push(p); }
        }
    }

    function drawLeaf(ctx, p, ramp) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.bezierCurveTo(p.size*0.6, -p.size*0.5, p.size*0.6, p.size*0.5, 0, p.size*0.3);
        ctx.bezierCurveTo(-p.size*0.6, p.size*0.5, -p.size*0.6, -p.size*0.5, 0, -p.size);
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.85 * ramp; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -p.size*0.8); ctx.lineTo(0, p.size*0.2);
        ctx.strokeStyle='rgba(0,80,0,0.25)'; ctx.lineWidth=0.7; ctx.stroke();
        ctx.restore();
    }

    function drawEmber(ctx, p, ramp) {
        ctx.save(); ctx.globalAlpha = p.life * 0.9 * ramp;
        const flicker = Math.sin(p.flicker)*0.3+0.7;
        ctx.shadowBlur = p.size*4*flicker; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size*flicker, 0, Math.PI*2);
        ctx.fillStyle = p.color; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size*0.4, 0, Math.PI*2);
        ctx.fillStyle='rgba(255,240,200,0.9)'; ctx.fill();
        ctx.shadowBlur=0; ctx.restore();
    }

    function drawFirefly(ctx, p, ramp) {
        const pulse = Math.sin(p.life)*0.5+0.5;
        ctx.save();
        if(p.trail.length>1){
            ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for(let i=1;i<p.trail.length;i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
            ctx.strokeStyle=`rgba(253,212,90,${0.08*pulse*ramp})`;
            ctx.lineWidth=1.2; ctx.lineCap='round'; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size*4*pulse, 0, Math.PI*2);
        ctx.fillStyle=`rgba(253,212,90,${0.035*pulse*ramp})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size*2*pulse, 0, Math.PI*2);
        ctx.fillStyle=`rgba(254,240,138,${0.09*pulse*ramp})`; ctx.fill();
        ctx.shadowBlur=8*pulse*ramp; ctx.shadowColor='#fcd34d';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size*pulse, 0, Math.PI*2);
        ctx.fillStyle=`rgba(254,240,138,${(0.65*pulse+0.08)*ramp})`; ctx.fill();
        ctx.shadowBlur=0; ctx.restore();
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const w=canvas.width, h=canvas.height;
        const now=Date.now()/1000;
        const act=getActivityMultiplier();
        const particleRamp  = getParticleRamp() * act;
        const fireflyRamp   = getFireflyRamp() * act;

        particles.forEach((p,i)=>{
            if(p.type==='leaf'){
                drawLeaf(ctx, p, particleRamp);
                p.wobble+=p.wobbleSpeed;
                p.x+=p.speedX+Math.sin(p.wobble)*0.3; p.y+=p.speedY;
                p.rotation+=p.rotSpeed;
                if(p.y>h+30) Object.assign(p, spawnLeaf(w,h));
            } else if(p.type==='ember'){
                drawEmber(ctx, p, particleRamp);
                p.flicker+=0.12;
                p.x+=p.speedX+Math.sin(now*2+i)*0.15; p.y+=p.speedY;
                p.life-=p.decay;
                if(p.life<=0||p.y<-20) Object.assign(p, spawnEmber(w,h));
            } else if(p.type==='firefly'){
                p.wanderAngle += p.wanderSpeed * (Math.random()-0.5) * 2;
                p.vx += Math.cos(p.wanderAngle) * 0.006;
                p.vy += Math.sin(p.wanderAngle) * 0.006;
                const margin = 80;
                if(p.x < margin)       p.vx += (margin - p.x)       / margin * 0.06;
                if(p.x > w - margin)   p.vx -= (p.x - (w - margin)) / margin * 0.06;
                if(p.y < margin)       p.vy += (margin - p.y)        / margin * 0.06;
                if(p.y > h - margin)   p.vy -= (p.y - (h - margin))  / margin * 0.06;
                const cx = w*0.5, cy = h*0.5;
                const dx = cx - p.x, dy = cy - p.y;
                const distC = Math.sqrt(dx*dx+dy*dy);
                if(distC > w*0.35) { p.vx += (dx/distC)*0.008; p.vy += (dy/distC)*0.008; }
                const spd = Math.sqrt(p.vx*p.vx+p.vy*p.vy);
                if(spd > 0.32) { p.vx *= 0.32/spd; p.vy *= 0.32/spd; }
                p.vx *= 0.98; p.vy *= 0.98;
                p.trail.push({x:p.x, y:p.y});
                if(p.trail.length > p.trailMax) p.trail.shift();
                p.x += p.vx; p.y += p.vy; p.life += p.pulseSpeed;
                p.x = Math.max(margin*0.5, Math.min(w - margin*0.5, p.x));
                p.y = Math.max(margin*0.5, Math.min(h - margin*0.5, p.y));
                drawFirefly(ctx, p, fireflyRamp);
            } else if(p.type==='rain'){
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x+p.drift*2, p.y+p.len);
                ctx.strokeStyle=`rgba(180,200,220,${p.opacity*particleRamp})`;
                ctx.lineWidth=0.8;
                ctx.lineCap='round';
                ctx.stroke();
                p.x+=p.drift; p.y+=p.speed;
                if(p.y>h+20) Object.assign(p, spawnRaindrop(w,h));
            }
        });
        requestAnimationFrame(animate);
    }

    // ====================== THEME SWITCHING ======================
    function updateTheme(){
        const hour=new Date().getHours();
        let newTheme;
        if(hour>=6&&hour<17) newTheme='day';
        else if(hour>=17&&hour<20) newTheme='evening';
        else newTheme='night';
        if(newTheme===currentTheme) return;

        let bgUrl = pickBackground(newTheme);

        if (bgUrl) {
            parallaxBg.style.backgroundImage=`url('${bgUrl}')`;
            requestAnimationFrame(()=>{ parallaxBg.style.opacity='1'; });
        }
        document.body.classList.remove('day','evening','night');
        document.body.classList.add(newTheme);
        currentTheme=newTheme;
        currentThemeNum=newTheme==='day'?0:(newTheme==='evening'?1:2);
        updateShaderTheme(newTheme);
        updateClockStyle(newTheme);
        initParticles(newTheme, canvas.width, canvas.height);
    }

    canvas.width=window.innerWidth; canvas.height=window.innerHeight;
    window.addEventListener('resize',()=>{
        canvas.width=window.innerWidth; canvas.height=window.innerHeight;
    });
    updateTheme();
    animate();
    setInterval(updateTheme,60000);
});
