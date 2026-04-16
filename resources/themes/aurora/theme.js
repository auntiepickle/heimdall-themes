document.addEventListener('DOMContentLoaded', () => {

    const themeCfg = window.__HEIMDALL_THEME__ || {};
    const isMobile = window.__HEIMDALL_MOBILE__ || false;

    // ====================== AURORA SHADER ======================
    const auroraCanvas = document.createElement('canvas');
    auroraCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    document.body.insertBefore(auroraCanvas, document.body.firstChild);

    let gl = auroraCanvas.getContext('webgl', {alpha:true, premultipliedAlpha:false})
          || auroraCanvas.getContext('experimental-webgl', {alpha:true, premultipliedAlpha:false});

    let mouseX = window.innerWidth*0.5, mouseY = window.innerHeight*0.5;
    let currentThemeNum = 2;
    const startTime = Date.now();
    document.addEventListener('mousemove', e => { mouseX=e.clientX; mouseY=e.clientY; });

    if (gl) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const vs = `attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0,1);}`;
        const fs = `
            precision mediump float;
            uniform vec2 u_resolution, u_mouse;
            uniform float u_time, u_theme;

            float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
            float hash1(float n){return fract(sin(n)*43758.5453);}
            float noise(vec2 p){
                vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
                return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
            }
            float fbm(vec2 p){float v=0.,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.1;a*=0.5;}return v;}

            // Slow organic drift
            float drift(float seed, float t){
                float speed=0.02+hash1(seed)*0.025;
                float phase=hash1(seed+7.3)*6.28;
                return sin(t*speed+phase)*0.45+sin(t*speed*1.7+phase*0.6)*0.35+sin(t*speed*0.4+phase*1.4)*0.2;
            }
            float driftR(float seed, float t, float lo, float hi){
                return lo+(drift(seed,t)*0.5+0.5)*(hi-lo);
            }

            void main(){
                vec2 uv=gl_FragCoord.xy/u_resolution; uv.y=1.-uv.y;
                float t=u_time;
                vec2 mouse=u_mouse/u_resolution; mouse.y=1.-mouse.y;

                // Deep space background
                float space=fbm(uv*3.+t*0.01)*0.08;
                vec3 bgCol=vec3(0.01,0.01,0.07)+vec3(0.02,0.04,0.08)*space;

                // Stars — dense field
                float stars=0.;
                for(int i=0;i<30;i++){
                    float fi=float(i);
                    vec2 sp=vec2(hash(vec2(fi*3.1,fi*7.4)),hash(vec2(fi*5.3,fi*2.9)));
                    float twinkle=sin(t*(0.6+fi*0.15)+fi*2.1)*0.4+0.6;
                    float sz=hash(vec2(fi*1.7,fi*4.2))*0.005+0.003;
                    stars+=smoothstep(sz,0.,length(uv-sp))*twinkle;
                }
                vec3 starCol=vec3(0.85,0.92,1.)*stars*0.45;

                // Aurora ribbons — 6 layers with vivid color spectrum
                vec3 auroraCol=vec3(0);
                float auroraTotal=0.;
                for(int i=0;i<6;i++){
                    float fi=float(i);
                    float speed=driftR(fi+10.,t,0.12,0.35);
                    float wave=sin(uv.x*3.5+t*speed+fi*1.2)
                              *sin(uv.x*2.1-t*speed*0.6+fi*2.8)*0.5+0.5;
                    float y=driftR(fi+20.,t,0.12,0.45)+fi*0.06;
                    float width=driftR(fi+30.,t,0.04,0.12);
                    float band=smoothstep(width,0.,abs(uv.y-y-wave*width*2.));
                    float strength=(0.35-fi*0.03)*(drift(fi+40.,t)*0.2+0.8);

                    // Color spectrum: green → cyan → blue → purple → pink
                    vec3 col;
                    float hueShift=fi/5.+t*0.02;
                    float h=fract(hueShift);
                    if(h<0.2) col=mix(vec3(0.,1.,0.5),vec3(0.,1.,0.9),h/0.2);
                    else if(h<0.4) col=mix(vec3(0.,1.,0.9),vec3(0.2,0.6,1.),( h-0.2)/0.2);
                    else if(h<0.6) col=mix(vec3(0.2,0.6,1.),vec3(0.5,0.2,0.9),(h-0.4)/0.2);
                    else if(h<0.8) col=mix(vec3(0.5,0.2,0.9),vec3(0.9,0.2,0.6),(h-0.6)/0.2);
                    else col=mix(vec3(0.9,0.2,0.6),vec3(0.,1.,0.5),(h-0.8)/0.2);

                    // Day: desaturate slightly
                    if(u_theme<0.5) col=mix(col,vec3(0.6,0.85,0.95),0.4);

                    auroraCol+=col*band*strength;
                    auroraTotal+=band*strength;
                }
                auroraCol=min(auroraCol,vec3(1.));

                // Nebula glow — colored clouds behind aurora
                float neb1=fbm(uv*2.+vec2(t*0.03,t*0.02))*0.15;
                float neb2=fbm(uv*1.5+vec2(-t*0.02,t*0.04))*0.12;
                vec3 nebCol=vec3(0.15,0.05,0.35)*neb1+vec3(0.02,0.2,0.3)*neb2;

                // Mouse bio-glow
                float mdist=length(uv-mouse);
                float bioFalloff=1./(1.+pow(mdist*5.,1.8));
                vec3 bioCol=vec3(0.1,0.9,0.8)*bioFalloff*0.08;

                // Shooting star (occasional)
                float shootStar=0.;
                float shootPhase=floor(t*0.15+hash1(floor(t*0.03))*0.4);
                if(hash1(shootPhase)>0.65){
                    float age=fract(t*0.15);
                    vec2 sStart=vec2(hash1(shootPhase+1.),hash1(shootPhase+2.)*0.4);
                    vec2 sEnd=sStart+vec2(0.3,-0.15);
                    vec2 sPos=mix(sStart,sEnd,age);
                    float trail=smoothstep(0.015,0.,length(uv-sPos))*(1.-age);
                    shootStar=trail*0.8;
                }
                vec3 shootCol=vec3(0.9,0.95,1.)*shootStar;

                vec3 color=bgCol+starCol+auroraCol+nebCol+bioCol+shootCol;
                // Frost grain -- cold blue-silver bias
                float tf=floor(u_time*18.);float bl=fract(u_time*18.);bl=bl*bl*(3.-2.*bl);
                float gA=fract(sin(dot(gl_FragCoord.xy+tf,vec2(127.1,311.7)))*43758.5453);
                float gB=fract(sin(dot(gl_FragCoord.xy+tf+1.,vec2(127.1,311.7)))*43758.5453);
                float grainRaw=(mix(gA,gB,bl)-0.5)*2.;
                float luma=dot(color,vec3(0.299,0.587,0.114));
                float fGrain=grainRaw*mix(0.07,0.025,luma)*(0.9+0.1*sin(u_time*0.17));
                color+=vec3(fGrain*0.94,fGrain*1.0,fGrain*1.12);
                float alpha=clamp(0.15+stars*0.4+auroraTotal*0.8+neb1+neb2+bioFalloff*0.3+shootStar,0.,0.98);
                gl_FragColor=vec4(clamp(color,0.,1.),alpha);
            }
        `;

        function mkShader(type,src){
            const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
            if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(s));
            return s;
        }
        const prog=gl.createProgram();
        gl.attachShader(prog,mkShader(gl.VERTEX_SHADER,vs));
        gl.attachShader(prog,mkShader(gl.FRAGMENT_SHADER,fs));
        gl.linkProgram(prog);gl.useProgram(prog);
        const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
        const loc=gl.getAttribLocation(prog,'a_position');
        gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
        const uRes=gl.getUniformLocation(prog,'u_resolution');
        const uMouse=gl.getUniformLocation(prog,'u_mouse');
        const uTime=gl.getUniformLocation(prog,'u_time');
        const uTheme=gl.getUniformLocation(prog,'u_theme');

        function resize(){
            auroraCanvas.width=window.innerWidth;auroraCanvas.height=window.innerHeight;
            gl.viewport(0,0,auroraCanvas.width,auroraCanvas.height);
        }
        window.addEventListener('resize',resize);resize();

        function animateShader(){
            gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(uRes,auroraCanvas.width,auroraCanvas.height);
            gl.uniform2f(uMouse,mouseX,mouseY);
            gl.uniform1f(uTime,(Date.now()-startTime)/1000);
            gl.uniform1f(uTheme,currentThemeNum);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
            requestAnimationFrame(animateShader);
        }
        animateShader();
    }

    // ====================== PARTICLE CANVAS ======================
    const canvas = document.createElement('canvas');
    canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let particles = [];
    let currentTheme = '';

    function spawnSnowflake(w,h){
        return {type:'snow',x:Math.random()*w,y:-10,size:Math.random()*3+1,
            speedX:Math.random()*0.5-0.25,speedY:Math.random()*0.6+0.2,
            opacity:Math.random()*0.5+0.2,wobble:Math.random()*Math.PI*2};
    }
    function spawnWisp(w,h){
        const colors=['#00ff87','#2de2e6','#7b2d8e','#ff69b4','#14a76c'];
        return {type:'wisp',x:Math.random()*w,y:h*0.7+Math.random()*h*0.3,
            size:Math.random()*5+3,
            vx:Math.random()*0.4-0.2,vy:-(Math.random()*0.4+0.2),
            opacity:Math.random()*0.4+0.15,life:1,decay:Math.random()*0.003+0.001,
            color:colors[Math.floor(Math.random()*colors.length)],
            trail:[],trailMax:Math.floor(Math.random()*8+4)};
    }
    function spawnStar(w,h){
        return {type:'star',x:Math.random()*w,y:Math.random()*h,size:Math.random()*2.5+0.8,
            pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.04+0.01,
            opacity:Math.random()*0.7+0.2,
            color:Math.random()>0.8?'#ffe4f0':'#e8f4f8'};
    }

    function initParticles(theme,w,h){
        particles=[];
        if(theme==='day'){
            for(let i=0;i<50;i++){const p=spawnSnowflake(w,h);p.y=Math.random()*h;particles.push(p);}
            for(let i=0;i<10;i++){const p=spawnWisp(w,h);p.y=Math.random()*h;particles.push(p);}
        }else if(theme==='evening'){
            for(let i=0;i<30;i++){const p=spawnWisp(w,h);p.y=Math.random()*h;particles.push(p);}
            for(let i=0;i<30;i++) particles.push(spawnStar(w,h));
        }else{
            for(let i=0;i<60;i++) particles.push(spawnStar(w,h));
            for(let i=0;i<25;i++){const p=spawnWisp(w,h);p.y=Math.random()*h;particles.push(p);}
        }
    }

    function animate(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const w=canvas.width,h=canvas.height;
        particles.forEach(p=>{
            if(p.type==='wisp'){
                p.trail.push({x:p.x,y:p.y});
                if(p.trail.length>p.trailMax) p.trail.shift();
                // Trail
                if(p.trail.length>1){
                    ctx.beginPath();ctx.moveTo(p.trail[0].x,p.trail[0].y);
                    for(let i=1;i<p.trail.length;i++) ctx.lineTo(p.trail[i].x,p.trail[i].y);
                    ctx.strokeStyle=p.color;ctx.globalAlpha=p.opacity*p.life*0.3;
                    ctx.lineWidth=p.size*0.5;ctx.lineCap='round';ctx.stroke();
                }
                // Core
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);
                ctx.fillStyle=p.color;ctx.globalAlpha=p.opacity*p.life;
                ctx.shadowBlur=16;ctx.shadowColor=p.color;ctx.fill();
                ctx.shadowBlur=0;ctx.globalAlpha=1;
                p.x+=p.vx+Math.sin(Date.now()/1500+p.opacity*10)*0.15;
                p.y+=p.vy;p.life-=p.decay;
                if(p.life<=0||p.y<-30) Object.assign(p,spawnWisp(w,h));
            }else if(p.type==='star'){
                p.pulse+=p.pulseSpeed;
                const bright=Math.sin(p.pulse)*0.35+0.65;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*bright,0,Math.PI*2);
                ctx.fillStyle=p.color;ctx.globalAlpha=p.opacity*bright;
                if(bright>0.85){ctx.shadowBlur=6;ctx.shadowColor=p.color;}
                ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;
            }else{
                // Snowflake
                p.wobble+=0.02;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
                ctx.fillStyle='#e8f4f8';ctx.globalAlpha=p.opacity;
                ctx.fill();ctx.globalAlpha=1;
                p.x+=p.speedX+Math.sin(p.wobble)*0.4;p.y+=p.speedY;
                if(p.y>h+20) Object.assign(p,spawnSnowflake(w,h));
            }
        });
        requestAnimationFrame(animate);
    }

    // ====================== CLOCK ======================
    const isHomePage=true;
    const clockContainer=document.createElement('div');
    clockContainer.id='clock-container';
    clockContainer.style.display=isHomePage?'block':'none';
    const clockCanvas=document.createElement('canvas');
    clockCanvas.width=90;clockCanvas.height=90;
    clockContainer.appendChild(clockCanvas);
    document.body.appendChild(clockContainer);
    clockContainer.addEventListener('click',()=>{window.location.href='/';});
    const clockCtx=clockCanvas.getContext('2d');

    const _push=history.pushState.bind(history);
    history.pushState=function(...a){_push(...a);
        clockContainer.style.display='block';};
    window.addEventListener('popstate',()=>{
        clockContainer.style.display='block';});

    function drawClock(){
        const W=90,cx=45,cy=45,r=40;
        const now=new Date();
        clockCtx.clearRect(0,0,W,W);

        // Dark background with aurora shimmer
        clockCtx.beginPath();clockCtx.arc(cx,cy,r,0,Math.PI*2);
        clockCtx.fillStyle='rgba(2,2,18,0.85)';clockCtx.fill();

        // Animated aurora ring
        const t=Date.now()/1000;
        for(let i=0;i<24;i++){
            const angle=(i/24)*Math.PI*2-Math.PI/2;
            const bright=Math.sin(t*0.8+i*0.4)*0.3+0.7;
            const hue=((i/24)+t*0.03)%1;
            let r2,g,b;
            if(hue<0.33){r2=0;g=1-hue*3;b=hue*3;}
            else if(hue<0.66){r2=(hue-0.33)*3;g=0;b=1-(hue-0.33)*3;}
            else{r2=1-(hue-0.66)*3;g=(hue-0.66)*3;b=0;}
            clockCtx.beginPath();
            clockCtx.arc(cx+Math.cos(angle)*35,cy+Math.sin(angle)*35,2,0,Math.PI*2);
            clockCtx.fillStyle=`rgba(${Math.floor((r2*0.3+0.1)*255)},${Math.floor((g*0.8+0.2)*255)},${Math.floor((b*0.7+0.3)*255)},${bright})`;
            clockCtx.shadowBlur=4;clockCtx.shadowColor=clockCtx.fillStyle;
            clockCtx.fill();
        }
        clockCtx.shadowBlur=0;

        // Border
        clockCtx.beginPath();clockCtx.arc(cx,cy,r,0,Math.PI*2);
        clockCtx.strokeStyle='rgba(45,226,230,0.2)';clockCtx.lineWidth=1;clockCtx.stroke();

        const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
        const hAngle=(Math.PI/6)*h+(Math.PI/360)*m-Math.PI/2;
        const mAngle=(Math.PI/30)*m+(Math.PI/1800)*s-Math.PI/2;
        const sAngle=(Math.PI/30)*s-Math.PI/2;

        clockCtx.lineCap='round';
        clockCtx.shadowBlur=8;clockCtx.shadowColor='rgba(45,226,230,0.5)';
        // Hour
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(hAngle)*4,cy+Math.sin(hAngle)*4);
        clockCtx.lineTo(cx+Math.cos(hAngle)*20,cy+Math.sin(hAngle)*20);
        clockCtx.strokeStyle='#e8f4f8';clockCtx.lineWidth=3;clockCtx.stroke();
        // Minute
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(mAngle)*4,cy+Math.sin(mAngle)*4);
        clockCtx.lineTo(cx+Math.cos(mAngle)*30,cy+Math.sin(mAngle)*30);
        clockCtx.strokeStyle='#a8d8ea';clockCtx.lineWidth=2;clockCtx.stroke();
        clockCtx.shadowBlur=0;
        // Second — aurora colored
        const sHue=((s/60)+t*0.05)%1;
        const sColor=sHue<0.5?`rgba(0,${Math.floor(255-sHue*510)},${Math.floor(sHue*510)},0.8)`
                              :`rgba(${Math.floor((sHue-0.5)*510)},0,${Math.floor(255-(sHue-0.5)*510)},0.8)`;
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(sAngle)*(-6),cy+Math.sin(sAngle)*(-6));
        clockCtx.lineTo(cx+Math.cos(sAngle)*34,cy+Math.sin(sAngle)*34);
        clockCtx.strokeStyle=sColor;clockCtx.lineWidth=0.8;clockCtx.stroke();
        // Center
        clockCtx.beginPath();clockCtx.arc(cx,cy,3.5,0,Math.PI*2);
        clockCtx.fillStyle='#2de2e6';clockCtx.shadowBlur=6;clockCtx.shadowColor='#2de2e6';
        clockCtx.fill();clockCtx.shadowBlur=0;
    }
    drawClock();setInterval(drawClock,1000);

    // ====================== THEME ======================
    function updateTheme(){
        const hour=new Date().getHours();
        let newTheme;
        if(hour>=6&&hour<17) newTheme='day';
        else if(hour>=17&&hour<20) newTheme='evening';
        else newTheme='night';
        if(newTheme===currentTheme) return;
        document.body.classList.remove('day','evening','night');
        document.body.classList.add(newTheme);
        currentTheme=newTheme;
        currentThemeNum=newTheme==='day'?0:(newTheme==='evening'?1:2);
        initParticles(newTheme,canvas.width,canvas.height);
    }

    canvas.width=window.innerWidth;canvas.height=window.innerHeight;
    window.addEventListener('resize',()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;});
    updateTheme();animate();setInterval(updateTheme,60000);

    const stackStyle=document.createElement('style');
    stackStyle.textContent='#app,#app>*,.navbar,header{position:relative;z-index:10!important;}';
    document.head.appendChild(stackStyle);
});
