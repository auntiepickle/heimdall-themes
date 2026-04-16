document.addEventListener('DOMContentLoaded', () => {

    const themeCfg = window.__HEIMDALL_THEME__ || {};

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
            float noise(vec2 p){
                vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
                return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
            }
            float fbm(vec2 p){float v=0.,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.1;a*=0.5;}return v;}

            void main(){
                vec2 uv=gl_FragCoord.xy/u_resolution; uv.y=1.-uv.y;
                float t=u_time;

                // Stars
                float stars=0.;
                for(int i=0;i<20;i++){
                    float fi=float(i);
                    vec2 sp=vec2(hash(vec2(fi*3.1,fi*7.4)),hash(vec2(fi*5.3,fi*2.9)));
                    float twinkle=sin(t*(0.8+fi*0.2)+fi*2.1)*0.5+0.5;
                    stars+=smoothstep(0.015,0.,length(uv-sp))*twinkle*0.8;
                }

                // Aurora ribbons
                float aurora=0.;
                vec3 auroraCol=vec3(0);
                for(int i=0;i<4;i++){
                    float fi=float(i);
                    float speed=0.15+fi*0.05;
                    float wave=sin(uv.x*3.+t*speed+fi*1.5)*sin(uv.x*1.8-t*speed*0.7+fi*2.3)*0.5+0.5;
                    float y=0.2+fi*0.08;
                    float width=0.06+sin(t*0.1+fi)*0.02;
                    float band=smoothstep(width,0.,abs(uv.y-y-wave*width*2.));
                    float strength=0.25-fi*0.04;

                    vec3 col;
                    if(u_theme<0.5){
                        col=mix(vec3(0.34,0.76,0.91),vec3(0.17,0.5,0.69),fi/3.);
                    } else if(u_theme<1.5){
                        col=mix(vec3(0.08,0.65,0.42),vec3(0.27,0.64,0.62),fi/3.);
                    } else {
                        col=mix(vec3(0.,1.,0.53),vec3(0.48,0.18,0.56),fi/3.);
                    }
                    auroraCol+=col*band*strength;
                    aurora+=band*strength;
                }

                // Mouse glow
                vec2 mouse=u_mouse/u_resolution; mouse.y=1.-mouse.y;
                float mdist=length(uv-mouse);
                float glow=1./(1.+pow(mdist*6.,2.))*0.15;
                vec3 glowCol=vec3(0.18,0.9,0.85)*glow;

                // Nebula clouds
                float neb=fbm(uv*2.5+t*0.02)*0.12;
                vec3 nebCol=vec3(0.1,0.2,0.5)*neb;

                vec3 starCol=vec3(0.9,0.95,1.)*stars;
                vec3 color=starCol+auroraCol+glowCol+nebCol;
                float alpha=clamp(stars*0.6+aurora+glow*2.+neb,0.,0.95);
                gl_FragColor=vec4(color,alpha);
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

        function animate(){
            gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(uRes,auroraCanvas.width,auroraCanvas.height);
            gl.uniform2f(uMouse,mouseX,mouseY);
            gl.uniform1f(uTime,(Date.now()-startTime)/1000);
            gl.uniform1f(uTheme,currentThemeNum);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
            requestAnimationFrame(animate);
        }
        animate();
    }

    // ====================== PARTICLE CANVAS ======================
    const canvas = document.createElement('canvas');
    canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let particles = [];
    let currentTheme = '';

    function spawnSnowflake(w,h){
        return {x:Math.random()*w,y:-10,size:Math.random()*3+1,
            speedX:Math.random()*0.4-0.2,speedY:Math.random()*0.5+0.2,
            opacity:Math.random()*0.4+0.2,wobble:Math.random()*Math.PI*2};
    }
    function spawnWisp(w,h){
        return {x:Math.random()*w,y:h+10,size:Math.random()*4+2,
            speedX:Math.random()*0.3-0.15,speedY:-(Math.random()*0.3+0.15),
            opacity:Math.random()*0.3+0.1,life:1,decay:Math.random()*0.003+0.001,
            color:Math.random()>0.5?'#14a76c':'#2de2e6'};
    }
    function spawnStar(w,h){
        return {x:Math.random()*w,y:Math.random()*h,size:Math.random()*2+1,
            pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.03+0.01,
            opacity:Math.random()*0.6+0.2};
    }

    function initParticles(theme,w,h){
        particles=[];
        if(theme==='day'){
            for(let i=0;i<40;i++){const p=spawnSnowflake(w,h);p.y=Math.random()*h;particles.push(p);}
        }else if(theme==='evening'){
            for(let i=0;i<25;i++){const p=spawnWisp(w,h);p.y=Math.random()*h;particles.push(p);}
        }else{
            for(let i=0;i<50;i++) particles.push(spawnStar(w,h));
            for(let i=0;i<15;i++){const p=spawnWisp(w,h);p.y=Math.random()*h;particles.push(p);}
        }
    }

    function animate(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const w=canvas.width,h=canvas.height;
        particles.forEach(p=>{
            if(p.decay!==undefined){
                // Wisp
                ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
                ctx.fillStyle=p.color||'#2de2e6';
                ctx.globalAlpha=p.opacity*p.life;
                ctx.shadowBlur=12;ctx.shadowColor=p.color||'#2de2e6';
                ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;
                p.x+=p.speedX+Math.sin(Date.now()/2000)*0.1;p.y+=p.speedY;p.life-=p.decay;
                if(p.life<=0||p.y<-20) Object.assign(p,spawnWisp(w,h));
            }else if(p.pulse!==undefined){
                // Star
                p.pulse+=p.pulseSpeed;
                const bright=Math.sin(p.pulse)*0.3+0.7;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*bright,0,Math.PI*2);
                ctx.fillStyle='#e8f4f8';ctx.globalAlpha=p.opacity*bright;
                ctx.fill();ctx.globalAlpha=1;
            }else{
                // Snowflake
                p.wobble+=0.02;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
                ctx.fillStyle='#e8f4f8';ctx.globalAlpha=p.opacity;
                ctx.fill();ctx.globalAlpha=1;
                p.x+=p.speedX+Math.sin(p.wobble)*0.3;p.y+=p.speedY;
                if(p.y>h+20) Object.assign(p,spawnSnowflake(w,h));
            }
        });
        requestAnimationFrame(animate);
    }

    // ====================== CLOCK ======================
    const isHomePage=!(/settings|items|users|tags/.test(window.location.pathname));
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
        clockContainer.style.display=/settings|items|users|tags/.test(a[2]||window.location.pathname)?'none':'block';};
    window.addEventListener('popstate',()=>{
        clockContainer.style.display=/settings|items|users|tags/.test(window.location.pathname)?'none':'block';});

    function drawClock(){
        const W=90,cx=45,cy=45,r=40;
        const now=new Date();
        clockCtx.clearRect(0,0,W,W);

        // Dark icy background
        clockCtx.beginPath();clockCtx.arc(cx,cy,r,0,Math.PI*2);
        clockCtx.fillStyle='rgba(2,2,18,0.8)';clockCtx.fill();
        clockCtx.strokeStyle='rgba(45,226,230,0.3)';clockCtx.lineWidth=1;clockCtx.stroke();

        // Aurora shimmer ring
        const shimmer=Date.now()/2000;
        for(let i=0;i<12;i++){
            const angle=(i/12)*Math.PI*2-Math.PI/2;
            const bright=Math.sin(shimmer+i*0.5)*0.3+0.7;
            clockCtx.beginPath();
            clockCtx.arc(cx+Math.cos(angle)*34,cy+Math.sin(angle)*34,1.5,0,Math.PI*2);
            const hue=currentTheme==='day'?'168,193,232':currentTheme==='evening'?'20,167,108':'0,255,135';
            clockCtx.fillStyle=`rgba(${hue},${bright})`;
            clockCtx.fill();
        }

        const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
        const hAngle=(Math.PI/6)*h+(Math.PI/360)*m-Math.PI/2;
        const mAngle=(Math.PI/30)*m+(Math.PI/1800)*s-Math.PI/2;
        const sAngle=(Math.PI/30)*s-Math.PI/2;

        // Hour
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(hAngle)*4,cy+Math.sin(hAngle)*4);
        clockCtx.lineTo(cx+Math.cos(hAngle)*20,cy+Math.sin(hAngle)*20);
        clockCtx.strokeStyle='#e8f4f8';clockCtx.lineWidth=3;clockCtx.lineCap='round';
        clockCtx.shadowBlur=6;clockCtx.shadowColor='rgba(45,226,230,0.5)';
        clockCtx.stroke();
        // Minute
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(mAngle)*4,cy+Math.sin(mAngle)*4);
        clockCtx.lineTo(cx+Math.cos(mAngle)*30,cy+Math.sin(mAngle)*30);
        clockCtx.strokeStyle='#a8d8ea';clockCtx.lineWidth=2;clockCtx.stroke();
        clockCtx.shadowBlur=0;
        // Second
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(sAngle)*(-6),cy+Math.sin(sAngle)*(-6));
        clockCtx.lineTo(cx+Math.cos(sAngle)*34,cy+Math.sin(sAngle)*34);
        clockCtx.strokeStyle='rgba(0,255,135,0.7)';clockCtx.lineWidth=0.8;clockCtx.stroke();
        // Center
        clockCtx.beginPath();clockCtx.arc(cx,cy,3,0,Math.PI*2);
        clockCtx.fillStyle='#2de2e6';clockCtx.fill();
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

    // Z-index stacking
    const stackStyle=document.createElement('style');
    stackStyle.textContent='#app,#app>*,.navbar,header{position:relative;z-index:10!important;}';
    document.head.appendChild(stackStyle);
});
