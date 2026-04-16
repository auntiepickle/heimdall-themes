document.addEventListener('DOMContentLoaded', () => {

    const themeCfg = window.__HEIMDALL_THEME__ || {};
    const isMobile = window.__HEIMDALL_MOBILE__ || false;

    // ====================== RIVENDELL SHADER ======================
    const bgCanvas = document.createElement('canvas');
    bgCanvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;';
    document.body.insertBefore(bgCanvas, document.body.firstChild);

    let gl = bgCanvas.getContext('webgl',{alpha:true,premultipliedAlpha:false})
          || bgCanvas.getContext('experimental-webgl',{alpha:true,premultipliedAlpha:false});

    let mouseX=window.innerWidth*0.5, mouseY=window.innerHeight*0.5;
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

            void main(){
                vec2 uv=gl_FragCoord.xy/u_resolution;uv.y=1.-uv.y;
                float t=u_time;
                vec2 mouse=u_mouse/u_resolution;mouse.y=1.-mouse.y;

                // Palette per variant
                vec3 skyHigh,skyLow,valleyColor,fogWarm,fogCool,lightCol;
                float fogStr,lightStr;
                if(u_theme<0.5){
                    // Day: golden autumn, warm stone, blue sky
                    skyHigh=vec3(0.35,0.50,0.72);
                    skyLow=vec3(0.72,0.58,0.32);
                    valleyColor=vec3(0.18,0.22,0.12);
                    fogWarm=vec3(0.90,0.80,0.55);fogCool=vec3(0.55,0.62,0.50);
                    lightCol=vec3(1.0,0.90,0.60);
                    fogStr=0.20;lightStr=0.14;
                }else if(u_theme<1.5){
                    // Evening: deep amber, copper, long shadows
                    skyHigh=vec3(0.20,0.12,0.08);
                    skyLow=vec3(0.60,0.32,0.10);
                    valleyColor=vec3(0.10,0.08,0.04);
                    fogWarm=vec3(0.65,0.38,0.12);fogCool=vec3(0.30,0.18,0.08);
                    lightCol=vec3(1.0,0.60,0.20);
                    fogStr=0.28;lightStr=0.16;
                }else{
                    // Night: silver moonlight, deep blue-violet, stars
                    skyHigh=vec3(0.03,0.03,0.08);
                    skyLow=vec3(0.08,0.06,0.16);
                    valleyColor=vec3(0.03,0.03,0.06);
                    fogWarm=vec3(0.10,0.10,0.22);fogCool=vec3(0.06,0.08,0.15);
                    lightCol=vec3(0.60,0.65,0.85);
                    fogStr=0.30;lightStr=0.06;
                }

                // Sky gradient with subtle color shift
                vec3 sky=mix(skyLow,skyHigh,pow(uv.y,0.6));
                // Add subtle warmth variation across the sky
                sky+=vec3(0.04,0.02,-0.02)*sin(uv.x*3.+t*0.01)*smoothstep(0.5,0.,uv.y);

                // Stars (night only)
                float stars=0.;
                if(u_theme>1.5){
                    for(int i=0;i<35;i++){
                        float fi=float(i);
                        vec2 sp=vec2(hash(vec2(fi*3.1,fi*7.4)),hash(vec2(fi*5.3,fi*2.9))*0.55);
                        float twinkle=sin(t*(0.4+fi*0.1)+fi*2.1)*0.3+0.7;
                        stars+=smoothstep(0.004,0.,length(uv-sp))*twinkle*0.5;
                    }
                    sky+=vec3(0.85,0.90,1.0)*stars;
                }

                // Soft mountain ridges (no hard edges)
                float ridge1=0.30+fbm(vec2(uv.x*3.5,1.))*0.10+sin(uv.x*2.5)*0.04;
                float ridge2=0.38+fbm(vec2(uv.x*2.8+3.,2.))*0.08+sin(uv.x*1.8+1.)*0.03;
                float ridge3=0.48+fbm(vec2(uv.x*4.+7.,3.))*0.06;
                // Soft blending instead of hard silhouettes
                float mtn=smoothstep(ridge1-0.04,ridge1+0.02,uv.y)*0.20
                         +smoothstep(ridge2-0.03,ridge2+0.03,uv.y)*0.15
                         +smoothstep(ridge3-0.02,ridge3+0.04,uv.y)*0.10;
                vec3 mtnTint=(u_theme>1.5)?vec3(0.05,0.05,0.10):vec3(0.08,0.10,0.06);
                sky=mix(sky,mtnTint,mtn);

                // Valley floor darkening
                float valley=smoothstep(0.45,0.85,uv.y)*0.5;
                sky=mix(sky,valleyColor,valley);

                // Volumetric fog layers (the soul of the scene)
                float fog1=fbm(vec2(uv.x*2.+t*0.005,uv.y*3.+0.5))*fogStr;
                float fog2=fbm(vec2(uv.x*3.-t*0.003,uv.y*2.+3.))*fogStr*0.6;
                float fog3=fbm(vec2(uv.x*1.5+t*0.004,uv.y*4.+7.))*fogStr*0.4;
                // Fog concentrated in the valley (middle-lower area)
                float fogBand1=smoothstep(0.15,0.,abs(uv.y-0.50))*fog1;
                float fogBand2=smoothstep(0.20,0.,abs(uv.y-0.62))*fog2;
                float fogBand3=smoothstep(0.30,0.,abs(uv.y-0.72))*fog3;
                sky+=fogWarm*fogBand1+fogCool*fogBand2+fogWarm*fogBand3*0.5;

                // God rays (soft diagonal shafts of light from upper area)
                float rays=0.;
                for(int i=0;i<5;i++){
                    float fi=float(i);
                    float angle=0.8+fi*0.25+sin(t*0.008+fi*2.)*0.08;
                    float rayX=uv.x-uv.y*cos(angle)*0.5;
                    float rayPos=0.1+fi*0.2+sin(t*0.01+fi*1.3)*0.04;
                    float ray=smoothstep(0.04+sin(t*0.012+fi)*0.01,0.,abs(rayX-rayPos));
                    ray*=smoothstep(0.8,0.2,uv.y); // stronger at top
                    ray*=(1.-valley*0.8); // dimmer in deep valley
                    rays+=ray*0.04;
                }
                sky+=lightCol*rays*lightStr/0.04;

                // Water/river at bottom (soft gradient, not hard line)
                float waterStart=0.78;
                float waterBlend=smoothstep(waterStart-0.04,waterStart+0.04,uv.y);
                vec3 waterBase=sky*0.3; // dim reflection of sky
                float ripple=sin(uv.x*35.+t*1.2)*0.006+sin(uv.x*22.-t*0.7)*0.004;
                float shimmer=noise(vec2(uv.x*25.+t*0.4,uv.y*8.))*0.06;
                vec3 waterHighlight=lightCol*shimmer;
                // Moon/sun reflection streak
                float reflStreak=smoothstep(0.08,0.,abs(uv.x-0.5+sin(t*0.02)*0.05))*0.08*smoothstep(waterStart,1.,uv.y);
                vec3 water=waterBase+waterHighlight+lightCol*reflStreak;
                sky=mix(sky,water,waterBlend);

                // Mouse warmth (lantern in the valley)
                float mdist=length(uv-mouse);
                float warmth=1./(1.+pow(mdist*4.,2.))*0.08;
                sky+=lightCol*warmth;

                // Film grain (warm)
                float tf=floor(t*20.);float bl=fract(t*20.);bl=bl*bl*(3.-2.*bl);
                float gA=fract(sin(dot(gl_FragCoord.xy+tf,vec2(127.1,311.7)))*43758.5453);
                float gB=fract(sin(dot(gl_FragCoord.xy+tf+1.,vec2(127.1,311.7)))*43758.5453);
                float grain=((mix(gA,gB,bl)-0.5)*2.)*0.025;
                sky+=vec3(grain*1.1,grain*1.04,grain*0.9);

                gl_FragColor=vec4(clamp(sky,0.,1.),1.);
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
    const m=isMobile?0.4:1;

    function spawnLeaf(w,h){
        const colors=['#daa520','#cd853f','#b8860b','#c44d18','#d4a030','#8b6914'];
        return{type:'leaf',x:Math.random()*w,y:-20,
            size:Math.random()*6+3,speedX:Math.random()*0.4-0.2,speedY:Math.random()*0.25+0.1,
            rotation:Math.random()*Math.PI*2,rotSpeed:Math.random()*0.01-0.005,
            color:colors[Math.floor(Math.random()*colors.length)],
            wobble:Math.random()*Math.PI*2};
    }
    function spawnDust(w,h){
        return{type:'dust',x:Math.random()*w,y:Math.random()*h*0.6,
            size:Math.random()*1.5+0.5,vx:Math.random()*0.08-0.04,vy:Math.random()*0.06-0.03,
            opacity:Math.random()*0.25+0.08,life:Math.random()*Math.PI*2,lifeSpeed:Math.random()*0.006+0.002};
    }
    function spawnEmber(w,h){
        return{type:'ember',x:Math.random()*w,y:h+10,
            size:Math.random()*2.5+1,speedX:Math.random()*0.2-0.1,speedY:-(Math.random()*0.3+0.1),
            life:1,decay:Math.random()*0.003+0.001,color:Math.random()>0.5?'#cd7f32':'#daa520'};
    }
    function spawnFirefly(w,h){
        return{type:'firefly',x:Math.random()*w,y:h*0.55+Math.random()*h*0.4,
            size:Math.random()*2+1.5,vx:Math.random()*0.15-0.075,vy:Math.random()*0.1-0.05,
            pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.025+0.01,
            wanderAngle:Math.random()*Math.PI*2,wanderSpeed:Math.random()*0.006+0.002,
            trail:[],trailMax:Math.floor(Math.random()*6+3)};
    }
    function spawnStar(w,h){
        return{type:'star',x:Math.random()*w,y:Math.random()*h*0.45,
            size:Math.random()*1.8+0.8,pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.02+0.008,
            opacity:Math.random()*0.4+0.15};
    }

    function initParticles(theme,w,h){
        particles=[];
        if(theme==='day'){
            for(let i=0;i<Math.floor(18*m);i++){const p=spawnLeaf(w,h);p.y=Math.random()*h;particles.push(p);}
            for(let i=0;i<Math.floor(15*m);i++) particles.push(spawnDust(w,h));
        }else if(theme==='evening'){
            for(let i=0;i<Math.floor(10*m);i++){const p=spawnLeaf(w,h);p.y=Math.random()*h;particles.push(p);}
            for(let i=0;i<Math.floor(20*m);i++){const p=spawnEmber(w,h);p.y=Math.random()*h;p.life=Math.random();particles.push(p);}
        }else{
            for(let i=0;i<Math.floor(25*m);i++) particles.push(spawnStar(w,h));
            for(let i=0;i<Math.floor(15*m);i++) particles.push(spawnFirefly(w,h));
        }
    }

    function animate(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const w=canvas.width,h=canvas.height;
        particles.forEach(p=>{
            if(p.type==='leaf'){
                p.wobble+=0.01;
                ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);
                ctx.beginPath();
                ctx.moveTo(0,-p.size);
                ctx.bezierCurveTo(p.size*0.5,-p.size*0.4,p.size*0.5,p.size*0.4,0,p.size*0.3);
                ctx.bezierCurveTo(-p.size*0.5,p.size*0.4,-p.size*0.5,-p.size*0.4,0,-p.size);
                ctx.fillStyle=p.color;ctx.globalAlpha=0.6;ctx.fill();
                ctx.restore();ctx.globalAlpha=1;
                p.x+=p.speedX+Math.sin(p.wobble)*0.2;p.y+=p.speedY;p.rotation+=p.rotSpeed;
                if(p.y>h+30) Object.assign(p,spawnLeaf(w,h));
            }else if(p.type==='dust'){
                p.life+=p.lifeSpeed;
                const bright=Math.sin(p.life)*0.3+0.7;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*bright,0,Math.PI*2);
                ctx.fillStyle='#ffe4b0';ctx.globalAlpha=p.opacity*bright;
                ctx.fill();ctx.globalAlpha=1;
                p.x+=p.vx;p.y+=p.vy;
                if(p.x<-10||p.x>w+10||p.y<-10||p.y>h+10) Object.assign(p,spawnDust(w,h));
            }else if(p.type==='ember'){
                const flicker=Math.sin(Date.now()/200)*0.2+0.8;
                ctx.globalAlpha=p.life*0.6;
                ctx.shadowBlur=p.size*3*flicker;ctx.shadowColor=p.color;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*flicker,0,Math.PI*2);
                ctx.fillStyle=p.color;ctx.fill();
                ctx.shadowBlur=0;ctx.globalAlpha=1;
                p.x+=p.speedX;p.y+=p.speedY;p.life-=p.decay;
                if(p.life<=0||p.y<-20) Object.assign(p,spawnEmber(w,h));
            }else if(p.type==='star'){
                p.pulse+=p.pulseSpeed;
                const bright=Math.sin(p.pulse)*0.3+0.7;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*bright,0,Math.PI*2);
                ctx.fillStyle='#c8cce8';ctx.globalAlpha=p.opacity*bright;
                ctx.fill();ctx.globalAlpha=1;
            }else if(p.type==='firefly'){
                const pulse=Math.sin(p.pulse)*0.4+0.6;p.pulse+=p.pulseSpeed;
                p.wanderAngle+=p.wanderSpeed*(Math.random()-0.5)*2;
                p.vx+=Math.cos(p.wanderAngle)*0.002;p.vy+=Math.sin(p.wanderAngle)*0.002;
                const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
                if(spd>0.15){p.vx*=0.15/spd;p.vy*=0.15/spd;}
                p.vx*=0.99;p.vy*=0.99;
                p.trail.push({x:p.x,y:p.y});if(p.trail.length>p.trailMax)p.trail.shift();
                p.x+=p.vx;p.y+=p.vy;
                p.x=Math.max(30,Math.min(w-30,p.x));p.y=Math.max(h*0.4,Math.min(h-30,p.y));
                if(p.trail.length>1){
                    ctx.beginPath();ctx.moveTo(p.trail[0].x,p.trail[0].y);
                    for(let j=1;j<p.trail.length;j++)ctx.lineTo(p.trail[j].x,p.trail[j].y);
                    ctx.strokeStyle=`rgba(160,200,160,${0.05*pulse})`;ctx.lineWidth=0.8;ctx.lineCap='round';ctx.stroke();
                }
                ctx.shadowBlur=5*pulse;ctx.shadowColor='#90c090';
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*pulse,0,Math.PI*2);
                ctx.fillStyle=`rgba(160,200,160,${0.45*pulse})`;ctx.fill();
                ctx.shadowBlur=0;
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
        const isNight=currentTheme==='night';
        const isEve=currentTheme==='evening';
        const face=isNight?'rgba(10,10,24,0.9)':isEve?'rgba(40,25,10,0.9)':'rgba(60,50,30,0.85)';
        const gold=isNight?'#b8c0d8':isEve?'#cd7f32':'#daa520';
        const goldDim=isNight?'rgba(180,195,230,0.3)':'rgba(218,165,32,0.25)';

        clockCtx.clearRect(0,0,W,W);
        clockCtx.beginPath();clockCtx.arc(cx,cy,r,0,Math.PI*2);
        clockCtx.fillStyle=face;clockCtx.fill();
        clockCtx.strokeStyle=goldDim;clockCtx.lineWidth=1.5;clockCtx.stroke();

        // Ornate hour marks
        for(let i=0;i<12;i++){
            const a=(i/12)*Math.PI*2-Math.PI/2;
            const len=i%3===0?6:3;
            clockCtx.beginPath();
            clockCtx.moveTo(cx+Math.cos(a)*(r-len-2),cy+Math.sin(a)*(r-len-2));
            clockCtx.lineTo(cx+Math.cos(a)*(r-2),cy+Math.sin(a)*(r-2));
            clockCtx.strokeStyle=gold;clockCtx.lineWidth=i%3===0?1.5:0.8;
            clockCtx.lineCap='round';clockCtx.stroke();
        }

        const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
        const hA=(Math.PI/6)*h+(Math.PI/360)*m-Math.PI/2;
        const mA=(Math.PI/30)*m+(Math.PI/1800)*s-Math.PI/2;
        const sA=(Math.PI/30)*s-Math.PI/2;

        clockCtx.lineCap='round';
        clockCtx.shadowBlur=4;clockCtx.shadowColor=goldDim;
        clockCtx.beginPath();clockCtx.moveTo(cx+Math.cos(hA)*4,cy+Math.sin(hA)*4);
        clockCtx.lineTo(cx+Math.cos(hA)*22,cy+Math.sin(hA)*22);
        clockCtx.strokeStyle=gold;clockCtx.lineWidth=2.5;clockCtx.stroke();
        clockCtx.beginPath();clockCtx.moveTo(cx+Math.cos(mA)*4,cy+Math.sin(mA)*4);
        clockCtx.lineTo(cx+Math.cos(mA)*30,cy+Math.sin(mA)*30);
        clockCtx.strokeStyle=gold;clockCtx.lineWidth=1.5;clockCtx.stroke();
        clockCtx.shadowBlur=0;
        clockCtx.beginPath();clockCtx.moveTo(cx+Math.cos(sA)*(-5),cy+Math.sin(sA)*(-5));
        clockCtx.lineTo(cx+Math.cos(sA)*32,cy+Math.sin(sA)*32);
        clockCtx.strokeStyle=isNight?'rgba(180,195,230,0.4)':'rgba(180,100,40,0.5)';
        clockCtx.lineWidth=0.6;clockCtx.stroke();
        clockCtx.beginPath();clockCtx.arc(cx,cy,3,0,Math.PI*2);clockCtx.fillStyle=gold;clockCtx.fill();
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
