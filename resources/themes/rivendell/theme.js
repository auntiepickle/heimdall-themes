document.addEventListener('DOMContentLoaded', () => {

    const themeCfg = window.__HEIMDALL_THEME__ || {};

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

            // Mountain ridge silhouette
            float mountain(float x, float scale, float height, float seed){
                return height+fbm(vec2(x*scale+seed,seed))*0.12+sin(x*3.+seed)*0.03;
            }

            // Pointed arch shape
            float arch(vec2 p, vec2 center, float w, float h){
                vec2 d=p-center;
                float base=step(-w,d.x)*step(d.x,w)*step(0.,d.y)*step(d.y,h*0.6);
                float top=smoothstep(0.01,0.,length(vec2(d.x,max(d.y-h*0.6,0.)*1.8))-w);
                return max(base,top);
            }

            void main(){
                vec2 uv=gl_FragCoord.xy/u_resolution;uv.y=1.-uv.y;
                float t=u_time;
                vec2 mouse=u_mouse/u_resolution;mouse.y=1.-mouse.y;

                // Sky colors per variant
                vec3 skyTop,skyMid,skyBot,fogCol,rayCol,archCol;
                float mistAmt,rayStr;
                if(u_theme<0.5){
                    skyTop=vec3(0.29,0.44,0.65);skyMid=vec3(0.76,0.58,0.23);skyBot=vec3(0.55,0.40,0.13);
                    fogCol=vec3(0.85,0.75,0.55);archCol=vec3(0.15,0.12,0.08);
                    rayCol=vec3(1.,0.88,0.55);mistAmt=0.12;rayStr=0.10;
                }else if(u_theme<1.5){
                    skyTop=vec3(0.16,0.10,0.04);skyMid=vec3(0.55,0.27,0.08);skyBot=vec3(0.35,0.18,0.06);
                    fogCol=vec3(0.50,0.30,0.12);archCol=vec3(0.10,0.06,0.03);
                    rayCol=vec3(1.,0.65,0.25);mistAmt=0.18;rayStr=0.12;
                }else{
                    skyTop=vec3(0.04,0.04,0.10);skyMid=vec3(0.10,0.06,0.20);skyBot=vec3(0.06,0.04,0.14);
                    fogCol=vec3(0.08,0.08,0.18);archCol=vec3(0.04,0.04,0.08);
                    rayCol=vec3(0.55,0.60,0.80);mistAmt=0.22;rayStr=0.06;
                }

                // Sky gradient
                vec3 sky;
                if(uv.y<0.4) sky=mix(skyMid,skyTop,uv.y/0.4);
                else sky=mix(skyBot,skyMid,(uv.y-0.4)/0.6);

                // Stars at night
                float stars=0.;
                if(u_theme>1.5){
                    for(int i=0;i<25;i++){
                        float fi=float(i);
                        vec2 sp=vec2(hash(vec2(fi*3.1,fi*7.4)),hash(vec2(fi*5.3,fi*2.9))*0.5);
                        float twinkle=sin(t*(0.5+fi*0.12)+fi*2.1)*0.35+0.65;
                        stars+=smoothstep(0.004,0.,length(uv-sp))*twinkle*0.6;
                    }
                }

                // Mountain ridges (2 layers)
                float m1=mountain(uv.x,4.,0.22,0.);
                float m2=mountain(uv.x,3.,0.28,5.);
                float mtns=smoothstep(m1-0.01,m1,uv.y)*0.4+smoothstep(m2-0.01,m2,uv.y)*0.25;
                vec3 mtnCol=(u_theme>1.5)?vec3(0.06,0.06,0.12):vec3(0.12,0.10,0.06);

                // Architecture silhouettes (3 arched towers)
                float arches=0.;
                arches+=arch(uv,vec2(0.3,0.35),0.03,0.25);
                arches+=arch(uv,vec2(0.5,0.32),0.04,0.30);
                arches+=arch(uv,vec2(0.7,0.36),0.03,0.22);
                // Connecting bridge
                float bridge=step(0.28,uv.x)*step(uv.x,0.72)*step(0.34,uv.y)*step(uv.y,0.36);
                arches+=bridge*0.8;
                arches=min(arches,1.);

                // God rays from arch windows
                float rays=0.;
                for(int i=0;i<4;i++){
                    float fi=float(i);
                    float rx=0.25+fi*0.18;
                    float ry=0.35;
                    vec2 rdir=uv-vec2(rx,ry);
                    float angle=atan(rdir.x,rdir.y);
                    float dist=length(rdir);
                    float ray=smoothstep(0.06,0.,abs(sin(angle*2.+fi*1.5+t*0.02)))*exp(-dist*3.);
                    rays+=ray*rayStr*(1.-arches);
                }

                // Water reflection (bottom 30%)
                float waterLine=0.72;
                float water=0.;
                vec3 waterCol=vec3(0);
                if(uv.y>waterLine){
                    float reflY=waterLine-(uv.y-waterLine);
                    float ripple=sin(uv.x*40.+t*1.5)*0.008+sin(uv.x*25.-t*0.8)*0.005;
                    vec3 reflSky;
                    if(reflY<0.4) reflSky=mix(skyMid,skyTop,reflY/0.4);
                    else reflSky=mix(skyBot,skyMid,(reflY-0.4)/0.6);
                    waterCol=reflSky*0.35;
                    waterCol+=rayCol*0.03*sin(uv.x*20.+t*2.)*smoothstep(0.8,0.72,uv.y);
                    water=1.;
                    // Shimmer
                    float shimmer=noise(vec2(uv.x*30.+t*0.5,uv.y*10.))*0.08;
                    waterCol+=vec3(shimmer)*(u_theme>1.5?vec3(0.6,0.65,0.8):vec3(0.8,0.7,0.5));
                }

                // Mist layers
                float mist1=fbm(vec2(uv.x*3.+t*0.008,uv.y*2.+0.5))*mistAmt;
                float mist2=fbm(vec2(uv.x*2.-t*0.005,uv.y*1.5+3.))*mistAmt*0.6;
                float mistBand=smoothstep(0.2,0.,abs(uv.y-0.55))*mist1+smoothstep(0.25,0.,abs(uv.y-0.68))*mist2;

                // Mouse warmth (lantern glow)
                float mdist=length(uv-mouse);
                float warmth=1./(1.+pow(mdist*4.,2.))*0.08;

                // Film grain
                float tf=floor(t*20.);float bl=fract(t*20.);bl=bl*bl*(3.-2.*bl);
                float gA=fract(sin(dot(gl_FragCoord.xy+tf,vec2(127.1,311.7)))*43758.5453);
                float gB=fract(sin(dot(gl_FragCoord.xy+tf+1.,vec2(127.1,311.7)))*43758.5453);
                float grain=((mix(gA,gB,bl)-0.5)*2.)*0.03;

                // Compose
                vec3 color=sky+vec3(stars);
                color=mix(color,mtnCol,mtns);
                color=mix(color,archCol,arches*0.8);
                color+=rayCol*rays;
                if(water>0.) color=mix(color,waterCol,smoothstep(waterLine,waterLine+0.02,uv.y));
                color+=fogCol*mistBand;
                color+=rayCol*warmth;
                color+=vec3(grain*1.1,grain*1.04,grain*0.9);
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

    function spawnGoldLeaf(w,h){
        const colors=['#daa520','#cd853f','#b8860b','#c44d18','#d4a030'];
        return{type:'leaf',x:Math.random()*w,y:-20,
            size:Math.random()*7+4,speedX:Math.random()*0.5-0.25,speedY:Math.random()*0.3+0.15,
            rotation:Math.random()*Math.PI*2,rotSpeed:Math.random()*0.015-0.0075,
            color:colors[Math.floor(Math.random()*colors.length)],
            wobble:Math.random()*Math.PI*2};
    }
    function spawnDustMote(w,h){
        return{type:'dust',x:Math.random()*w,y:Math.random()*h*0.6,
            size:Math.random()*1.5+0.5,vx:Math.random()*0.1-0.05,vy:Math.random()*0.08-0.04,
            opacity:Math.random()*0.3+0.1,life:Math.random()*Math.PI*2,lifeSpeed:Math.random()*0.008+0.003};
    }
    function spawnEmber(w,h){
        return{type:'ember',x:Math.random()*w,y:h+10,
            size:Math.random()*3+1.5,speedX:Math.random()*0.3-0.15,speedY:-(Math.random()*0.4+0.15),
            life:1,decay:Math.random()*0.003+0.001,color:Math.random()>0.5?'#cd7f32':'#ff6a00'};
    }
    function spawnMistWisp(w,h){
        return{type:'wisp',x:Math.random()*w,y:h*0.5+Math.random()*h*0.3,
            size:Math.random()*6+3,vx:Math.random()*0.15-0.075,vy:Math.random()*0.1-0.05,
            opacity:Math.random()*0.08+0.03,life:1,decay:Math.random()*0.002+0.0005,
            color:'rgba(180,140,80,'};
    }
    function spawnStarlight(w,h){
        return{type:'star',x:Math.random()*w,y:Math.random()*h*0.5,
            size:Math.random()*2+1,pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.03+0.01,
            opacity:Math.random()*0.5+0.2};
    }
    function spawnWaterFirefly(w,h){
        return{type:'firefly',x:Math.random()*w,y:h*0.65+Math.random()*h*0.3,
            size:Math.random()*2.5+1.5,vx:Math.random()*0.2-0.1,vy:Math.random()*0.15-0.075,
            pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.03+0.015,
            wanderAngle:Math.random()*Math.PI*2,wanderSpeed:Math.random()*0.008+0.003,
            trail:[],trailMax:Math.floor(Math.random()*8+4)};
    }

    function initParticles(theme,w,h){
        particles=[];
        if(theme==='day'){
            for(let i=0;i<20;i++){const p=spawnGoldLeaf(w,h);p.y=Math.random()*h;particles.push(p);}
            for(let i=0;i<20;i++) particles.push(spawnDustMote(w,h));
        }else if(theme==='evening'){
            for(let i=0;i<10;i++){const p=spawnGoldLeaf(w,h);p.y=Math.random()*h;particles.push(p);}
            for(let i=0;i<25;i++){const p=spawnEmber(w,h);p.y=Math.random()*h;p.life=Math.random();particles.push(p);}
            for(let i=0;i<10;i++) particles.push(spawnMistWisp(w,h));
        }else{
            for(let i=0;i<30;i++) particles.push(spawnStarlight(w,h));
            for(let i=0;i<20;i++) particles.push(spawnWaterFirefly(w,h));
            for(let i=0;i<10;i++) particles.push(spawnDustMote(w,h));
        }
    }

    function animate(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const w=canvas.width,h=canvas.height;
        particles.forEach(p=>{
            if(p.type==='leaf'){
                p.wobble+=0.012;
                ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);
                ctx.beginPath();
                ctx.moveTo(0,-p.size);
                ctx.bezierCurveTo(p.size*0.5,-p.size*0.4,p.size*0.5,p.size*0.4,0,p.size*0.3);
                ctx.bezierCurveTo(-p.size*0.5,p.size*0.4,-p.size*0.5,-p.size*0.4,0,-p.size);
                ctx.fillStyle=p.color;ctx.globalAlpha=0.7;ctx.fill();
                ctx.restore();ctx.globalAlpha=1;
                p.x+=p.speedX+Math.sin(p.wobble)*0.3;p.y+=p.speedY;p.rotation+=p.rotSpeed;
                if(p.y>h+30) Object.assign(p,spawnGoldLeaf(w,h));
            }else if(p.type==='dust'){
                p.life+=p.lifeSpeed;
                const bright=Math.sin(p.life)*0.3+0.7;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*bright,0,Math.PI*2);
                ctx.fillStyle='#ffe4b0';ctx.globalAlpha=p.opacity*bright;
                ctx.fill();ctx.globalAlpha=1;
                p.x+=p.vx;p.y+=p.vy;
                if(p.x<-10||p.x>w+10||p.y<-10||p.y>h+10) Object.assign(p,spawnDustMote(w,h));
            }else if(p.type==='ember'){
                const flicker=Math.sin(Date.now()/200)*0.2+0.8;
                ctx.globalAlpha=p.life*0.7;
                ctx.shadowBlur=p.size*3*flicker;ctx.shadowColor=p.color;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*flicker,0,Math.PI*2);
                ctx.fillStyle=p.color;ctx.fill();
                ctx.shadowBlur=0;ctx.globalAlpha=1;
                p.x+=p.speedX;p.y+=p.speedY;p.life-=p.decay;
                if(p.life<=0||p.y<-20) Object.assign(p,spawnEmber(w,h));
            }else if(p.type==='wisp'){
                ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
                ctx.fillStyle=p.color+(p.opacity*p.life)+')';
                ctx.fill();
                p.x+=p.vx+Math.sin(Date.now()/3000)*0.05;p.y+=p.vy;p.life-=p.decay;
                if(p.life<=0) Object.assign(p,spawnMistWisp(w,h));
            }else if(p.type==='star'){
                p.pulse+=p.pulseSpeed;
                const bright=Math.sin(p.pulse)*0.35+0.65;
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*bright,0,Math.PI*2);
                ctx.fillStyle='#c8cce8';ctx.globalAlpha=p.opacity*bright;
                ctx.fill();ctx.globalAlpha=1;
            }else if(p.type==='firefly'){
                const pulse=Math.sin(p.pulse)*0.4+0.6;p.pulse+=p.pulseSpeed;
                p.wanderAngle+=p.wanderSpeed*(Math.random()-0.5)*2;
                p.vx+=Math.cos(p.wanderAngle)*0.003;p.vy+=Math.sin(p.wanderAngle)*0.003;
                const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
                if(spd>0.2){p.vx*=0.2/spd;p.vy*=0.2/spd;}
                p.vx*=0.99;p.vy*=0.99;
                p.trail.push({x:p.x,y:p.y});if(p.trail.length>p.trailMax)p.trail.shift();
                p.x+=p.vx;p.y+=p.vy;
                p.x=Math.max(30,Math.min(w-30,p.x));p.y=Math.max(h*0.5,Math.min(h-30,p.y));
                if(p.trail.length>1){
                    ctx.beginPath();ctx.moveTo(p.trail[0].x,p.trail[0].y);
                    for(let j=1;j<p.trail.length;j++)ctx.lineTo(p.trail[j].x,p.trail[j].y);
                    ctx.strokeStyle=`rgba(160,200,160,${0.06*pulse})`;ctx.lineWidth=1;ctx.lineCap='round';ctx.stroke();
                }
                ctx.shadowBlur=6*pulse;ctx.shadowColor='#90c090';
                ctx.beginPath();ctx.arc(p.x,p.y,p.size*pulse,0,Math.PI*2);
                ctx.fillStyle=`rgba(160,200,160,${0.5*pulse})`;ctx.fill();
                ctx.shadowBlur=0;
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

    function drawClockDay(ctx,now){
        const W=90,cx=45,cy=45,r=40;
        ctx.clearRect(0,0,W,W);
        // Stone sundial
        ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
        ctx.fillStyle='#8b7d6b';ctx.fill();
        ctx.strokeStyle='#6b5d4b';ctx.lineWidth=2;ctx.stroke();
        // Carved hour marks
        for(let i=0;i<12;i++){
            const a=(i/12)*Math.PI*2-Math.PI/2;
            ctx.beginPath();
            ctx.moveTo(cx+Math.cos(a)*32,cy+Math.sin(a)*32);
            ctx.lineTo(cx+Math.cos(a)*36,cy+Math.sin(a)*36);
            ctx.strokeStyle='#5a4d3d';ctx.lineWidth=2;ctx.lineCap='round';ctx.stroke();
        }
        const h=now.getHours()%12,m=now.getMinutes();
        // Gnomon shadow
        const hA=(Math.PI/6)*h+(Math.PI/360)*m-Math.PI/2;
        ctx.beginPath();ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.cos(hA)*28,cy+Math.sin(hA)*28);
        ctx.strokeStyle='#3a2d1d';ctx.lineWidth=4;ctx.lineCap='round';ctx.stroke();
        ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);
        ctx.fillStyle='#5a4d3d';ctx.fill();
    }

    function drawClockEvening(ctx,now){
        const W=90,cx=45,cy=45,r=40;
        ctx.clearRect(0,0,W,W);
        ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
        ctx.fillStyle='rgba(40,25,10,0.95)';ctx.fill();
        // Gold filigree ring
        for(let i=0;i<12;i++){
            const a=(i/12)*Math.PI*2-Math.PI/2;
            ctx.beginPath();ctx.arc(cx+Math.cos(a)*33,cy+Math.sin(a)*33,2,0,Math.PI*2);
            ctx.fillStyle='#daa520';ctx.fill();
            if(i<12){
                const a2=((i+1)/12)*Math.PI*2-Math.PI/2;
                ctx.beginPath();
                ctx.arc(cx,cy,33,a,a2);
                ctx.strokeStyle='rgba(218,165,32,0.2)';ctx.lineWidth=0.5;ctx.stroke();
            }
        }
        const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
        const hA=(Math.PI/6)*h+(Math.PI/360)*m-Math.PI/2;
        const mA=(Math.PI/30)*m+(Math.PI/1800)*s-Math.PI/2;
        const sA=(Math.PI/30)*s-Math.PI/2;
        ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(cx+Math.cos(hA)*4,cy+Math.sin(hA)*4);
        ctx.lineTo(cx+Math.cos(hA)*20,cy+Math.sin(hA)*20);
        ctx.strokeStyle='#daa520';ctx.lineWidth=3;ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx+Math.cos(mA)*4,cy+Math.sin(mA)*4);
        ctx.lineTo(cx+Math.cos(mA)*28,cy+Math.sin(mA)*28);
        ctx.strokeStyle='#daa520';ctx.lineWidth=1.5;ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx+Math.cos(sA)*(-5),cy+Math.sin(sA)*(-5));
        ctx.lineTo(cx+Math.cos(sA)*30,cy+Math.sin(sA)*30);
        ctx.strokeStyle='#cd7f32';ctx.lineWidth=0.6;ctx.stroke();
        ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fillStyle='#daa520';ctx.fill();
    }

    function drawClockNight(ctx,now){
        const W=90,cx=45,cy=45,r=40;
        ctx.clearRect(0,0,W,W);
        ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
        ctx.fillStyle='rgba(10,10,24,0.95)';ctx.fill();
        ctx.strokeStyle='rgba(140,150,200,0.3)';ctx.lineWidth=1;ctx.stroke();
        // Moon crescent at 12
        ctx.beginPath();ctx.arc(cx,cy-28,5,0,Math.PI*2);
        ctx.fillStyle='#c8cce8';ctx.fill();
        ctx.beginPath();ctx.arc(cx+2,cy-29,4,0,Math.PI*2);
        ctx.fillStyle='rgba(10,10,24,0.95)';ctx.fill();
        // Silver tick marks at 3,6,9
        [[33,0],[0,33],[-33,0]].forEach(([dx,dy])=>{
            ctx.beginPath();ctx.arc(cx+dx,cy+dy,1.2,0,Math.PI*2);
            ctx.fillStyle='rgba(180,195,230,0.5)';ctx.fill();
        });
        // Stars
        [[15,-20,0.8],[22,10,0.6],[-18,15,0.7],[-10,-25,0.5],[25,-15,0.6]].forEach(([dx,dy,op])=>{
            ctx.beginPath();ctx.arc(cx+dx,cy+dy,0.8,0,Math.PI*2);
            ctx.fillStyle=`rgba(200,210,240,${op})`;ctx.fill();
        });
        const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
        const hA=(Math.PI/6)*h+(Math.PI/360)*m-Math.PI/2;
        const mA=(Math.PI/30)*m+(Math.PI/1800)*s-Math.PI/2;
        const sA=(Math.PI/30)*s-Math.PI/2;
        ctx.lineCap='round';
        ctx.shadowBlur=6;ctx.shadowColor='rgba(180,195,230,0.4)';
        ctx.beginPath();ctx.moveTo(cx+Math.cos(hA)*4,cy+Math.sin(hA)*4);
        ctx.lineTo(cx+Math.cos(hA)*20,cy+Math.sin(hA)*20);
        ctx.strokeStyle='#b8c0d8';ctx.lineWidth=2.5;ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx+Math.cos(mA)*4,cy+Math.sin(mA)*4);
        ctx.lineTo(cx+Math.cos(mA)*28,cy+Math.sin(mA)*28);
        ctx.strokeStyle='#8890b8';ctx.lineWidth=1.5;ctx.stroke();
        ctx.shadowBlur=0;
        ctx.beginPath();ctx.moveTo(cx+Math.cos(sA)*(-5),cy+Math.sin(sA)*(-5));
        ctx.lineTo(cx+Math.cos(sA)*32,cy+Math.sin(sA)*32);
        ctx.strokeStyle='rgba(180,195,230,0.5)';ctx.lineWidth=0.6;ctx.stroke();
        ctx.beginPath();ctx.arc(cx,cy,2.5,0,Math.PI*2);ctx.fillStyle='#b8c0d8';ctx.fill();
    }

    let currentClockTheme='day';
    function drawClock(){
        const now=new Date();
        if(currentClockTheme==='day') drawClockDay(clockCtx,now);
        else if(currentClockTheme==='evening') drawClockEvening(clockCtx,now);
        else drawClockNight(clockCtx,now);
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
        currentClockTheme=newTheme;
        initParticles(newTheme,canvas.width,canvas.height);
    }

    canvas.width=window.innerWidth;canvas.height=window.innerHeight;
    window.addEventListener('resize',()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;});
    updateTheme();animate();setInterval(updateTheme,60000);

    const stackStyle=document.createElement('style');
    stackStyle.textContent='#app,#app>*,.navbar,header{position:relative;z-index:10!important;}';
    document.head.appendChild(stackStyle);
});
