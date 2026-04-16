document.addEventListener('DOMContentLoaded', () => {

    const themeCfg = window.__HEIMDALL_THEME__ || {};

    // ====================== FOREST BACKGROUND SHADER ======================
    const bgCanvas = document.createElement('canvas');
    bgCanvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;';
    document.body.insertBefore(bgCanvas, document.body.firstChild);

    let gl = bgCanvas.getContext('webgl',{alpha:true,premultipliedAlpha:false})
          || bgCanvas.getContext('experimental-webgl',{alpha:true,premultipliedAlpha:false});

    let mouseX=window.innerWidth*0.5,mouseY=window.innerHeight*0.5;
    let currentThemeNum=0;
    const startTime=Date.now();
    document.addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY;});

    if(gl){
        gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        const vs=`attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0,1);}`;
        const fs=`
            precision mediump float;
            uniform vec2 u_resolution,u_mouse;
            uniform float u_time,u_theme;

            float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
            float noise(vec2 p){
                vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
                return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
            }
            float fbm(vec2 p){float v=0.,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.1;a*=0.5;}return v;}

            // Tree silhouette shape
            float treeSil(vec2 p, float seed){
                float trunk=smoothstep(0.015,0.,abs(p.x))*smoothstep(0.,0.15,p.y);
                float canopy=smoothstep(0.12+fbm(p*8.+seed)*0.06,0.,length(p-vec2(0.,0.18)));
                return max(trunk,canopy);
            }

            void main(){
                vec2 uv=gl_FragCoord.xy/u_resolution;uv.y=1.-uv.y;
                float t=u_time;
                vec2 mouse=u_mouse/u_resolution;mouse.y=1.-mouse.y;

                vec3 skyTop,skyBot,fogColor,deepFog;
                float fogDensity,canopyDark;

                if(u_theme<0.5){
                    skyTop=vec3(0.25,0.50,0.22);skyBot=vec3(0.65,0.72,0.48);
                    fogColor=vec3(0.82,0.80,0.65);deepFog=vec3(0.35,0.50,0.28);
                    fogDensity=0.20;canopyDark=0.15;
                }else if(u_theme<1.5){
                    skyTop=vec3(0.45,0.25,0.08);skyBot=vec3(0.70,0.45,0.18);
                    fogColor=vec3(0.65,0.42,0.18);deepFog=vec3(0.35,0.22,0.08);
                    fogDensity=0.30;canopyDark=0.25;
                }else{
                    skyTop=vec3(0.02,0.05,0.04);skyBot=vec3(0.05,0.10,0.07);
                    fogColor=vec3(0.04,0.08,0.05);deepFog=vec3(0.02,0.06,0.03);
                    fogDensity=0.35;canopyDark=0.40;
                }

                // Sky gradient — deeper at bottom (under canopy)
                vec3 sky=mix(skyBot,skyTop,pow(uv.y,0.7));

                // Layered volumetric fog — 3 layers at different depths
                float fog1=fbm(uv*2.5+vec2(t*0.012,t*0.008))*fogDensity;
                float fog2=fbm(uv*4.+vec2(-t*0.018,t*0.006)+3.)*fogDensity*0.6;
                float fog3=fbm(uv*1.5+vec2(t*0.006,-t*0.004)+7.)*fogDensity*0.4;
                vec3 fogAll=fogColor*fog1+deepFog*fog2+fogColor*fog3*0.5;

                // Ground moss/undergrowth — denser green at bottom
                float ground=smoothstep(0.6,1.,uv.y)*0.12;
                vec3 moss=vec3(0.12,0.22,0.08)*ground;
                moss+=vec3(0.08,0.15,0.05)*fbm(uv*6.+1.)*ground;

                // Tree silhouettes — layered at different depths
                float trees=0.;
                for(int i=0;i<6;i++){
                    float fi=float(i);
                    float tx=hash(vec2(fi*5.7,fi*3.2))*1.4-0.2;
                    float depth=0.3+fi*0.1;
                    float sway=sin(t*0.08+fi*1.5)*0.008*depth;
                    vec2 tp=vec2(uv.x-tx+sway,1.-uv.y);
                    float scale=0.6+fi*0.15;
                    float tree=treeSil(tp*vec2(1./scale,1./scale),fi*7.);
                    trees+=tree*depth*canopyDark;
                }
                trees=min(trees,0.5);

                // Canopy shadow — dark patches from above
                float canopy=fbm(vec2(uv.x*3.+t*0.005,uv.y*1.5))*canopyDark;
                canopy*=smoothstep(0.5,0.,uv.y);

                // Light rays — 5 beams filtering through canopy gaps
                float rays=0.;
                for(int i=0;i<5;i++){
                    float fi=float(i);
                    float rx=0.15+fi*0.18+sin(t*0.04+fi*1.1)*0.04;
                    float width=0.04+sin(t*0.06+fi*2.)*0.015;
                    float ray=smoothstep(width,0.,abs(uv.x-rx));
                    ray*=smoothstep(1.,0.15,uv.y);
                    ray*=(1.-canopy*2.);
                    rays+=ray*0.06;
                }
                vec3 rayCol=(u_theme<0.5)?vec3(1.,0.95,0.7):
                            (u_theme<1.5)?vec3(1.,0.7,0.3):vec3(0.3,0.5,0.4);

                // Mouse warmth — like a lantern glow
                float mdist=length(uv-mouse);
                float warmth=1./(1.+pow(mdist*3.5,2.))*0.12;
                vec3 warmCol=(u_theme<1.5)?vec3(1.,0.85,0.5):vec3(0.25,0.5,0.35);

                // Fireflies at night — more of them, in the shader too
                float fireflies=0.;
                if(u_theme>1.5){
                    for(int i=0;i<15;i++){
                        float fi=float(i);
                        vec2 fp=vec2(hash(vec2(fi*3.7,fi*11.3)),hash(vec2(fi*7.1,fi*5.9)));
                        fp+=vec2(sin(t*0.25+fi*1.7),cos(t*0.2+fi*1.3))*0.06;
                        float pulse=sin(t*1.2+fi*2.3)*0.4+0.6;
                        float glow=smoothstep(0.03,0.,length(uv-fp))*pulse;
                        fireflies+=glow*0.2;
                    }
                }

                // Retrowave pink flashes. Rare, brief, organic.
                float pinkFlash=0.;
                float flashPhase=floor(t*0.2);
                if(hash(vec2(flashPhase,3.7))>0.7){
                    float age=fract(t*0.2);
                    float burst=exp(-age*4.)*0.15;
                    vec2 center=vec2(hash(vec2(flashPhase,1.2)),hash(vec2(flashPhase,5.8)));
                    float dist=length(uv-center);
                    pinkFlash=burst*smoothstep(0.4,0.,dist);
                }
                vec3 pinkCol=vec3(0.95,0.2,0.6)*pinkFlash;

                // Compose
                vec3 color=sky+fogAll+moss+rayCol*rays+warmCol*warmth+pinkCol;
                color-=vec3(trees)*0.5;
                color-=vec3(canopy)*0.3;
                if(u_theme>1.5) color+=vec3(0.45,0.75,0.25)*fireflies;
                gl_FragColor=vec4(clamp(color,0.,1.),1.);
            }
        `;

        function mkS(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
            if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(s));return s;}
        const prog=gl.createProgram();
        gl.attachShader(prog,mkS(gl.VERTEX_SHADER,vs));gl.attachShader(prog,mkS(gl.FRAGMENT_SHADER,fs));
        gl.linkProgram(prog);gl.useProgram(prog);
        const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
        const loc=gl.getAttribLocation(prog,'a_position');
        gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
        const uRes=gl.getUniformLocation(prog,'u_resolution');
        const uMouse=gl.getUniformLocation(prog,'u_mouse');
        const uTime=gl.getUniformLocation(prog,'u_time');
        const uTheme=gl.getUniformLocation(prog,'u_theme');

        function resize(){bgCanvas.width=window.innerWidth;bgCanvas.height=window.innerHeight;
            gl.viewport(0,0,bgCanvas.width,bgCanvas.height);}
        window.addEventListener('resize',resize);resize();

        function animateBg(){
            gl.uniform2f(uRes,bgCanvas.width,bgCanvas.height);
            gl.uniform2f(uMouse,mouseX,mouseY);
            gl.uniform1f(uTime,(Date.now()-startTime)/1000);
            gl.uniform1f(uTheme,currentThemeNum);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
            requestAnimationFrame(animateBg);
        }
        animateBg();
    }

    // ====================== PARTICLES ======================
    const canvas=document.createElement('canvas');
    canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
    document.body.appendChild(canvas);
    const ctx=canvas.getContext('2d');
    let particles=[];
    let currentTheme='';

    function spawnPollen(w,h){
        return{type:'pollen',x:Math.random()*w,y:Math.random()*h,
            size:Math.random()*2+1,vx:Math.random()*0.2-0.1,vy:Math.random()*0.15-0.1,
            opacity:Math.random()*0.3+0.1,wobble:Math.random()*Math.PI*2,wobbleSpeed:Math.random()*0.02+0.005};
    }
    function spawnLeaf(w,h){
        const colors=['#4ade80','#22c55e','#86efac','#a3be8c','#b8cc52'];
        return{type:'leaf',x:Math.random()*w,y:-20,
            size:Math.random()*8+5,speedX:Math.random()*0.5-0.25,speedY:Math.random()*0.4+0.2,
            rotation:Math.random()*Math.PI*2,rotSpeed:Math.random()*0.02-0.01,
            color:colors[Math.floor(Math.random()*colors.length)],
            wobble:Math.random()*Math.PI*2};
    }
    function spawnFirefly(w,h){
        return{type:'firefly',x:Math.random()*w,y:Math.random()*h*0.7+h*0.2,
            size:Math.random()*3+2,vx:Math.random()*0.3-0.15,vy:Math.random()*0.3-0.15,
            pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.04+0.02,
            wanderAngle:Math.random()*Math.PI*2,wanderSpeed:Math.random()*0.01+0.003,
            trail:[],trailMax:Math.floor(Math.random()*8+4)};
    }
    function spawnFaerie(w,h){
        const colors=['rgba(255,180,220,','rgba(200,150,255,','rgba(180,255,200,','rgba(255,220,150,'];
        return{type:'faerie',x:Math.random()*w,y:Math.random()*h*0.6+h*0.1,
            size:Math.random()*2+1.5,vx:Math.random()*0.2-0.1,vy:Math.random()*0.15-0.1,
            pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.06+0.03,
            wanderAngle:Math.random()*Math.PI*2,wanderSpeed:Math.random()*0.015+0.005,
            trail:[],trailMax:Math.floor(Math.random()*15+8),
            color:colors[Math.floor(Math.random()*colors.length)],
            sparkle:Math.random()*Math.PI*2};
    }
    function spawnEmber(w,h){
        return{type:'ember',x:Math.random()*w,y:h+10,
            size:Math.random()*3+1.5,speedX:Math.random()*0.4-0.2,speedY:-(Math.random()*0.5+0.2),
            life:1,decay:Math.random()*0.004+0.002,
            color:Math.random()>0.5?'#fbbf24':'#f59e0b'};
    }

    function initParticles(theme,w,h){
        particles=[];
        if(theme==='day'){
            for(let i=0;i<25;i++) particles.push(spawnPollen(w,h));
            for(let i=0;i<15;i++){const p=spawnLeaf(w,h);p.y=Math.random()*h;particles.push(p);}
            for(let i=0;i<8;i++) particles.push(spawnFaerie(w,h));
        }else if(theme==='evening'){
            for(let i=0;i<15;i++) particles.push(spawnPollen(w,h));
            for(let i=0;i<20;i++){const p=spawnEmber(w,h);p.y=Math.random()*h;p.life=Math.random();particles.push(p);}
            for(let i=0;i<12;i++) particles.push(spawnFaerie(w,h));
        }else{
            for(let i=0;i<25;i++) particles.push(spawnFirefly(w,h));
            for(let i=0;i<20;i++) particles.push(spawnFaerie(w,h));
            for(let i=0;i<10;i++) particles.push(spawnPollen(w,h));
        }
    }

    function animate(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const w=canvas.width,h=canvas.height;
        particles.forEach(p=>{
            if(p.type==='pollen'){
                p.wobble+=p.wobbleSpeed;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
                ctx.fillStyle=currentTheme==='night'?'rgba(180,220,160,':'rgba(200,180,120,';
                ctx.globalAlpha=p.opacity*(Math.sin(p.wobble)*0.2+0.8);
                ctx.fill();ctx.globalAlpha=1;
                p.x+=p.vx+Math.sin(p.wobble)*0.2;p.y+=p.vy;
                if(p.x<-10||p.x>w+10||p.y<-10||p.y>h+10) Object.assign(p,spawnPollen(w,h));
            }else if(p.type==='leaf'){
                ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);
                ctx.beginPath();
                ctx.moveTo(0,-p.size);
                ctx.bezierCurveTo(p.size*0.6,-p.size*0.5,p.size*0.6,p.size*0.5,0,p.size*0.3);
                ctx.bezierCurveTo(-p.size*0.6,p.size*0.5,-p.size*0.6,-p.size*0.5,0,-p.size);
                ctx.fillStyle=p.color;ctx.globalAlpha=0.75;ctx.fill();
                ctx.beginPath();ctx.moveTo(0,-p.size*0.7);ctx.lineTo(0,p.size*0.2);
                ctx.strokeStyle='rgba(0,60,0,0.2)';ctx.lineWidth=0.6;ctx.stroke();
                ctx.restore();ctx.globalAlpha=1;
                p.wobble+=0.015;p.x+=p.speedX+Math.sin(p.wobble)*0.3;p.y+=p.speedY;p.rotation+=p.rotSpeed;
                if(p.y>h+30) Object.assign(p,spawnLeaf(w,h));
            }else if(p.type==='firefly'){
                const pulse=Math.sin(p.pulse)*0.5+0.5;
                p.pulse+=p.pulseSpeed;
                p.wanderAngle+=p.wanderSpeed*(Math.random()-0.5)*2;
                p.vx+=Math.cos(p.wanderAngle)*0.005;p.vy+=Math.sin(p.wanderAngle)*0.005;
                const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
                if(spd>0.25){p.vx*=0.25/spd;p.vy*=0.25/spd;}
                p.vx*=0.98;p.vy*=0.98;
                p.trail.push({x:p.x,y:p.y});if(p.trail.length>p.trailMax)p.trail.shift();
                p.x+=p.vx;p.y+=p.vy;
                p.x=Math.max(40,Math.min(w-40,p.x));p.y=Math.max(40,Math.min(h-40,p.y));
                if(p.trail.length>1){
                    ctx.beginPath();ctx.moveTo(p.trail[0].x,p.trail[0].y);
                    for(let i=1;i<p.trail.length;i++)ctx.lineTo(p.trail[i].x,p.trail[i].y);
                    ctx.strokeStyle=`rgba(180,220,80,${0.06*pulse})`;ctx.lineWidth=1;ctx.lineCap='round';ctx.stroke();
                }
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*2.5*pulse,0,Math.PI*2);
                ctx.fillStyle=`rgba(200,240,100,${0.04*pulse})`;ctx.fill();
                ctx.shadowBlur=8*pulse;ctx.shadowColor='#b4dc50';
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*pulse,0,Math.PI*2);
                ctx.fillStyle=`rgba(220,250,120,${0.6*pulse+0.1})`;ctx.fill();
                ctx.shadowBlur=0;
            }else if(p.type==='faerie'){
                p.pulse+=p.pulseSpeed;
                p.sparkle+=0.15;
                const glow=Math.sin(p.pulse)*0.4+0.6;
                const sparkle=Math.sin(p.sparkle)*0.5+0.5;
                p.wanderAngle+=p.wanderSpeed*(Math.random()-0.5)*2;
                p.vx+=Math.cos(p.wanderAngle)*0.004;
                p.vy+=Math.sin(p.wanderAngle)*0.004-0.002;
                const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
                if(spd>0.2){p.vx*=0.2/spd;p.vy*=0.2/spd;}
                p.vx*=0.99;p.vy*=0.99;
                p.trail.push({x:p.x,y:p.y});if(p.trail.length>p.trailMax)p.trail.shift();
                p.x+=p.vx;p.y+=p.vy;
                p.x=Math.max(30,Math.min(w-30,p.x));p.y=Math.max(30,Math.min(h-30,p.y));
                // Trail with sparkle
                if(p.trail.length>1){
                    ctx.beginPath();ctx.moveTo(p.trail[0].x,p.trail[0].y);
                    for(let j=1;j<p.trail.length;j++)ctx.lineTo(p.trail[j].x,p.trail[j].y);
                    ctx.strokeStyle=p.color+(0.1*glow)+')';ctx.lineWidth=1.5;ctx.lineCap='round';ctx.stroke();
                }
                // Outer shimmer
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*4*glow,0,Math.PI*2);
                ctx.fillStyle=p.color+(0.03*glow)+')';ctx.fill();
                // Inner glow
                ctx.shadowBlur=12*glow;ctx.shadowColor=p.color+'0.6)';
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*glow,0,Math.PI*2);
                ctx.fillStyle=p.color+(0.7*glow)+')';ctx.fill();
                // Sparkle cross
                if(sparkle>0.7){
                    const sl=p.size*3*sparkle;
                    ctx.beginPath();ctx.moveTo(p.x-sl,p.y);ctx.lineTo(p.x+sl,p.y);
                    ctx.moveTo(p.x,p.y-sl);ctx.lineTo(p.x,p.y+sl);
                    ctx.strokeStyle=p.color+(0.3*sparkle)+')';ctx.lineWidth=0.5;ctx.stroke();
                }
                ctx.shadowBlur=0;
            }else if(p.type==='ember'){
                const flicker=Math.sin(Date.now()/200+p.opacity*10)*0.2+0.8;
                ctx.globalAlpha=p.life*0.8;ctx.shadowBlur=p.size*3*flicker;ctx.shadowColor=p.color;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*flicker,0,Math.PI*2);
                ctx.fillStyle=p.color;ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;
                p.x+=p.speedX+Math.sin(Date.now()/1000)*0.1;p.y+=p.speedY;p.life-=p.decay;
                if(p.life<=0||p.y<-20) Object.assign(p,spawnEmber(w,h));
            }
        });
        requestAnimationFrame(animate);
    }

    // ====================== CLOCK — wobbly hand-drawn ======================
    const isHomePage=!(/settings|items|users|tags/.test(window.location.pathname));
    const clockContainer=document.createElement('div');
    clockContainer.id='clock-container';
    clockContainer.style.display=isHomePage?'block':'none';
    const clockCanvas=document.createElement('canvas');
    clockCanvas.width=88;clockCanvas.height=88;
    clockContainer.appendChild(clockCanvas);
    document.body.appendChild(clockContainer);
    clockContainer.addEventListener('click',()=>{window.location.href='/';});
    const clockCtx=clockCanvas.getContext('2d');

    const _push=history.pushState.bind(history);
    history.pushState=function(...a){_push(...a);
        clockContainer.style.display=/settings|items|users|tags/.test(a[2]||window.location.pathname)?'none':'block';};
    window.addEventListener('popstate',()=>{
        clockContainer.style.display=/settings|items|users|tags/.test(window.location.pathname)?'none':'block';});

    const wobble=[];
    for(let i=0;i<36;i++) wobble.push({r:36+Math.random()*3-1.5,a:(i/36)*Math.PI*2});

    function drawClock(){
        const W=88,cx=44,cy=44,now=new Date();
        const isNight=currentTheme==='night';
        const isEve=currentTheme==='evening';
        const face=isNight?'#1c261c':isEve?'#f5ead0':'#f5f0e1';
        const ink=isNight?'#8aab86':isEve?'#5c3a1e':'#2d3b2a';
        const accent=isNight?'rgba(180,220,80,0.6)':isEve?'rgba(220,140,40,0.6)':'rgba(74,222,128,0.6)';

        clockCtx.clearRect(0,0,W,W);
        // Wobbly face
        clockCtx.beginPath();
        clockCtx.moveTo(cx+wobble[0].r*Math.cos(wobble[0].a),cy+wobble[0].r*Math.sin(wobble[0].a));
        for(let i=1;i<wobble.length;i++){
            const p=wobble[i];clockCtx.lineTo(cx+p.r*Math.cos(p.a),cy+p.r*Math.sin(p.a));
        }
        clockCtx.closePath();clockCtx.fillStyle=face;clockCtx.fill();
        clockCtx.strokeStyle=ink;clockCtx.lineWidth=1.5;clockCtx.globalAlpha=0.3;
        clockCtx.setLineDash([3,2]);clockCtx.stroke();clockCtx.setLineDash([]);clockCtx.globalAlpha=1;

        // Leaf markers at 12,3,6,9
        [[-Math.PI/2],[0],[Math.PI/2],[Math.PI]].forEach(([angle])=>{
            const lx=cx+Math.cos(angle)*28,ly=cy+Math.sin(angle)*28;
            clockCtx.save();clockCtx.translate(lx,ly);clockCtx.rotate(angle+Math.PI/2);
            clockCtx.beginPath();clockCtx.ellipse(0,0,2,5,0,0,Math.PI*2);
            clockCtx.fillStyle=isNight?'#4ade80':'#22c55e';clockCtx.globalAlpha=0.6;clockCtx.fill();
            clockCtx.restore();
        });
        clockCtx.globalAlpha=1;

        const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
        const hA=(Math.PI/6)*h+(Math.PI/360)*m-Math.PI/2;
        const mA=(Math.PI/30)*m+(Math.PI/1800)*s-Math.PI/2;
        const sA=(Math.PI/30)*s-Math.PI/2;

        clockCtx.lineCap='round';
        clockCtx.beginPath();clockCtx.moveTo(cx+Math.cos(hA)*3,cy+Math.sin(hA)*3);
        clockCtx.lineTo(cx+Math.cos(hA)*18,cy+Math.sin(hA)*18);
        clockCtx.strokeStyle=ink;clockCtx.lineWidth=3;clockCtx.stroke();
        clockCtx.beginPath();clockCtx.moveTo(cx+Math.cos(mA)*3,cy+Math.sin(mA)*3);
        clockCtx.lineTo(cx+Math.cos(mA)*26,cy+Math.sin(mA)*26);
        clockCtx.strokeStyle=ink;clockCtx.lineWidth=2;clockCtx.stroke();
        clockCtx.beginPath();clockCtx.moveTo(cx+Math.cos(sA)*(-5),cy+Math.sin(sA)*(-5));
        clockCtx.lineTo(cx+Math.cos(sA)*28,cy+Math.sin(sA)*28);
        clockCtx.strokeStyle=accent;clockCtx.lineWidth=0.8;clockCtx.stroke();
        clockCtx.beginPath();clockCtx.arc(cx,cy,2.5,0,Math.PI*2);clockCtx.fillStyle=ink;clockCtx.fill();
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
