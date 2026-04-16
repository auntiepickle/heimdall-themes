document.addEventListener('DOMContentLoaded', () => {

    const themeCfg = window.__HEIMDALL_THEME__ || {};

    // ====================== METABALL SHADER ======================
    const blobCanvas = document.createElement('canvas');
    blobCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    document.body.insertBefore(blobCanvas, document.body.firstChild);

    let gl = blobCanvas.getContext('webgl',{alpha:true,premultipliedAlpha:false})
          || blobCanvas.getContext('experimental-webgl',{alpha:true,premultipliedAlpha:false});

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
                return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                           mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
            }
            float fbm(vec2 p){float v=0.,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.1;a*=0.48;}return v;}

            // Smooth minimum for organic blob merging
            float smin(float a,float b,float k){
                float h=clamp(0.5+0.5*(b-a)/k,0.,1.);
                return mix(b,a,h)-k*h*(1.-h);
            }
            float sdCircle(vec2 p,float r){return length(p)-r;}

            void main(){
                vec2 uv=(gl_FragCoord.xy-u_resolution*0.5)/min(u_resolution.x,u_resolution.y);
                vec2 rawUV=gl_FragCoord.xy/u_resolution;
                float t=u_time;
                vec2 mouse=(u_mouse-u_resolution*0.5)/min(u_resolution.x,u_resolution.y);
                float aspect=u_resolution.x/u_resolution.y;

                // Accent colors
                vec3 accent;
                vec3 accent2;
                if(u_theme<0.5){accent=vec3(0.545,0.361,0.965);accent2=vec3(0.361,0.965,0.69);}
                else if(u_theme<1.5){accent=vec3(1.0,0.176,0.333);accent2=vec3(0.176,0.8,0.6);}
                else{accent=vec3(0.231,0.510,0.965);accent2=vec3(0.361,0.965,0.545);}

                // ---- BACKGROUND TEXTURE (always renders) ----
                // Layered cloud noise — slow drifting fog gives depth
                float cloud1=fbm(rawUV*3.+vec2(t*0.008,t*0.005))*0.04;
                float cloud2=fbm(rawUV*5.+vec2(-t*0.012,t*0.007)+3.)*0.03;
                float cloud3=fbm(rawUV*8.+vec2(t*0.006,-t*0.009)+7.)*0.02;
                float clouds=cloud1+cloud2+cloud3;
                // Fine grain texture
                float grain=noise(rawUV*30.)*0.01;
                vec3 bg=vec3(0.018+clouds+grain);
                // Volumetric gradient — lighter upper area, darker bottom
                bg+=vec3(0.02)*smoothstep(0.,0.7,rawUV.y);
                // Accent-tinted fog in two corners
                bg+=accent*0.012*smoothstep(0.7,0.,length(rawUV-vec2(0.85,0.2)));
                bg+=accent2*0.006*smoothstep(0.8,0.,length(rawUV-vec2(0.1,0.8)));

                // ---- BLOB (offset to upper-right, smaller) ----
                vec2 blobOffset=vec2(0.28,-0.22); // upper-right
                vec2 buv=uv-blobOffset;

                vec2 warp=vec2(fbm(buv*2.5+t*0.06),fbm(buv*2.5+t*0.06+5.))*0.06;
                vec2 wuv=buv+warp;

                float n1=fbm(wuv*3.+t*0.08)*0.08;
                float n2=fbm(wuv*2.5-t*0.07+3.)*0.06;
                float n3=fbm(wuv*3.5+t*0.05+7.)*0.05;

                vec2 toMouse=mouse-uv;
                float mDist=length(toMouse);
                vec2 pull=blobOffset+toMouse*0.04/(0.5+mDist);

                // Smaller metaballs, tighter orbit
                vec2 c1=pull;
                vec2 c2=blobOffset+vec2(sin(t*(0.19+sin(t*0.007)*0.03))*0.14,cos(t*0.23)*0.10);
                vec2 c3=blobOffset+vec2(cos(t*(0.17+sin(t*0.005)*0.02))*0.12,sin(t*0.29)*0.09);

                float d1=sdCircle(wuv-(c1-blobOffset),0.12+n1);
                float d2=sdCircle(wuv-(c2-blobOffset),0.08+n2);
                float d3=sdCircle(wuv-(c3-blobOffset),0.06+n3);
                float d=smin(smin(d1,d2,0.12),d3,0.12);

                float blob=smoothstep(0.02,-0.03,d);
                float inner=smoothstep(0.06,-0.10,d);
                float core=smoothstep(-0.02,-0.12,d);
                float rim=smoothstep(-0.01,0.012,d)*smoothstep(0.03,-0.01,d);

                float nnx=noise(wuv*8.+t*0.1+0.5)-noise(wuv*8.+t*0.1-0.5);
                float nny=noise(wuv*8.+t*0.1+0.7)-noise(wuv*8.+t*0.1-0.3);
                vec2 nrm=vec2(nnx,nny)*4.;
                float refl=dot(normalize(vec3(nrm,1.)),normalize(vec3(mouse*2.,1.)));
                refl=pow(max(refl,0.),3.)*0.2;

                // Blob color — subtler than before
                vec3 blobColor=vec3(0.015)*blob;
                blobColor+=accent*0.10*inner;
                blobColor+=vec3(refl)*inner*0.3;
                blobColor+=accent*0.5*core*0.1;
                blobColor+=mix(accent*0.9,accent2*0.4,0.3)*rim*0.25;

                // ---- DOT GRID (full screen, warps near blob) ----
                vec2 gridUV=uv;
                vec2 blobCenter=c1*0.5+c2*0.3+c3*0.2;
                vec2 gDelta=gridUV-blobCenter;
                float gDist=length(gDelta);
                gridUV+=normalize(gDelta+0.001)*0.015/(gDist*gDist+0.1);
                float gridSpacing=0.05;
                vec2 gridPos=mod(gridUV+gridSpacing*0.5,gridSpacing)-gridSpacing*0.5;
                float gridDot=smoothstep(0.002,0.0008,length(gridPos));
                float gridFade=smoothstep(0.9,0.2,length(uv));
                vec3 gridColor=accent*gridDot*0.06*gridFade*(1.-blob*0.8);

                // ---- HORIZONTAL SCAN LINES (texture) ----
                float scanY=mod(t*0.025+sin(t*0.003)*0.008,2.)-1.;
                float scanLine=smoothstep(0.003,0.,abs(uv.y-scanY))*0.04*(1.-blob);
                float scanY2=mod(t*0.018+0.7,2.)-1.;
                float scanLine2=smoothstep(0.002,0.,abs(uv.y-scanY2))*0.02*(1.-blob);
                vec3 scanColor=accent*(scanLine+scanLine2);

                // ---- AMBIENT ----
                float ambGlow=1./(1.+pow(length(buv)*5.,2.))*0.015;
                vec3 ambient=accent*ambGlow;

                float ripple=sin(mDist*25.-t*3.)*exp(-mDist*6.)*0.01*blob;

                float caStr=rim*0.006;
                float rOff=smoothstep(0.02,-0.04,d+caStr);
                float bOff=smoothstep(0.02,-0.04,d-caStr);
                vec3 ca=vec3(rOff-blob,0.,bOff-blob)*accent*0.15;

                // ---- COMPOSE ----
                vec3 color=bg+blobColor+ambient+ca+gridColor+scanColor+vec3(ripple);
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

        function resize(){blobCanvas.width=window.innerWidth;blobCanvas.height=window.innerHeight;
            gl.viewport(0,0,blobCanvas.width,blobCanvas.height);}
        window.addEventListener('resize',resize);resize();

        function animateBlob(){
            gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(uRes,blobCanvas.width,blobCanvas.height);
            gl.uniform2f(uMouse,mouseX,mouseY);
            gl.uniform1f(uTime,(Date.now()-startTime)/1000);
            gl.uniform1f(uTheme,currentThemeNum);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
            requestAnimationFrame(animateBlob);
        }
        animateBlob();
    }

    // ====================== GRAIN + SCANLINE ======================
    const grainCanvas=document.createElement('canvas');
    grainCanvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;mix-blend-mode:overlay;opacity:0.45;';
    document.body.appendChild(grainCanvas);
    const gCtx=grainCanvas.getContext('2d');
    let grainW=0,grainH=0;

    let grainFrame=0;
    function animateGrain(){
        if(grainCanvas.width!==window.innerWidth||grainCanvas.height!==window.innerHeight){
            grainCanvas.width=window.innerWidth;grainCanvas.height=window.innerHeight;
            grainW=grainCanvas.width;grainH=grainCanvas.height;
        }
        grainFrame++;
        if(grainFrame%2!==0){requestAnimationFrame(animateGrain);return;}
        const imgData=gCtx.createImageData(grainW,grainH);
        const d=imgData.data;
        for(let i=0;i<d.length;i+=4){
            const fine=(Math.random()-0.5)*2;
            const g=fine*42;
            d[i]=128+g*1.10;d[i+1]=128+g*1.03;d[i+2]=128+g*0.88;
            d[i+3]=12+Math.floor(Math.random()*14);
        }
        gCtx.putImageData(imgData,0,0);
        requestAnimationFrame(animateGrain);
    }
    animateGrain();

    // Shared state — must be declared before particles and clock both use them
    const accentColors={day:'#8b5cf6',evening:'#ff2d55',night:'#3b82f6'};
    let currentTheme='';

    // ====================== PARTICLES + WAVEFORM ======================
    const pCanvas=document.createElement('canvas');
    pCanvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    document.body.appendChild(pCanvas);
    const pCtx=pCanvas.getContext('2d');

    const particles=[];
    for(let i=0;i<40;i++){
        particles.push({
            x:Math.random()*window.innerWidth,
            y:Math.random()*window.innerHeight,
            vx:(Math.random()-0.5)*0.3,
            vy:(Math.random()-0.5)*0.3,
            size:Math.random()*1.5+0.5,
            opacity:Math.random()*0.3+0.05,
            pulse:Math.random()*Math.PI*2,
            pulseSpeed:Math.random()*0.015+0.005
        });
    }

    function animateParticles(){
        pCanvas.width=window.innerWidth;pCanvas.height=window.innerHeight;
        const w=pCanvas.width,h=pCanvas.height;
        const cx=w*0.5,cy=h*0.5;
        const t=Date.now()/1000;
        const accent=accentColors[currentTheme]||'#8b5cf6';

        // Particles — drift + attract toward center
        particles.forEach(p=>{
            p.pulse+=p.pulseSpeed;
            const bright=Math.sin(p.pulse)*0.3+0.7;

            // Gentle attraction toward center (where blob is)
            const dx=cx-p.x,dy=cy-p.y;
            const dist=Math.sqrt(dx*dx+dy*dy);
            if(dist>50){
                p.vx+=dx/dist*0.003;
                p.vy+=dy/dist*0.003;
            }else{
                // Repel when too close
                p.vx-=dx/dist*0.01;
                p.vy-=dy/dist*0.01;
            }

            // Mouse repulsion
            const mdx=mouseX-p.x,mdy=mouseY-p.y;
            const mDist=Math.sqrt(mdx*mdx+mdy*mdy);
            if(mDist<120){
                p.vx-=mdx/mDist*0.08;
                p.vy-=mdy/mDist*0.08;
            }

            // Damping + speed cap
            p.vx*=0.995;p.vy*=0.995;
            const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
            if(spd>0.8){p.vx*=0.8/spd;p.vy*=0.8/spd;}

            p.x+=p.vx;p.y+=p.vy;
            // Wrap
            if(p.x<-20)p.x=w+20;if(p.x>w+20)p.x=-20;
            if(p.y<-20)p.y=h+20;if(p.y>h+20)p.y=-20;

            // Draw
            pCtx.beginPath();
            pCtx.arc(p.x,p.y,p.size*bright,0,Math.PI*2);
            pCtx.fillStyle=accent;
            pCtx.globalAlpha=p.opacity*bright;
            pCtx.fill();
        });

        // Connection lines between nearby particles
        pCtx.globalAlpha=1;
        for(let i=0;i<particles.length;i++){
            for(let j=i+1;j<particles.length;j++){
                const dx=particles[i].x-particles[j].x;
                const dy=particles[i].y-particles[j].y;
                const dist=Math.sqrt(dx*dx+dy*dy);
                if(dist<120){
                    pCtx.beginPath();
                    pCtx.moveTo(particles[i].x,particles[i].y);
                    pCtx.lineTo(particles[j].x,particles[j].y);
                    pCtx.strokeStyle=accent;
                    pCtx.globalAlpha=(1-dist/120)*0.04;
                    pCtx.lineWidth=0.5;
                    pCtx.stroke();
                }
            }
        }

        // Waveform at bottom — minimal techno oscilloscope
        pCtx.globalAlpha=1;
        const waveY=h*0.92;
        pCtx.beginPath();
        for(let x=0;x<w;x+=2){
            const nx=x/w;
            const wave=Math.sin(nx*12+t*0.8)*4
                      +Math.sin(nx*24-t*1.2)*2
                      +Math.sin(nx*48+t*2.0)*1
                      +(Math.random()-0.5)*0.5;
            const y=waveY+wave;
            if(x===0)pCtx.moveTo(x,y);
            else pCtx.lineTo(x,y);
        }
        pCtx.strokeStyle=accent;
        pCtx.globalAlpha=0.12;
        pCtx.lineWidth=1;
        pCtx.stroke();

        // Second waveform — slightly offset, thinner
        pCtx.beginPath();
        for(let x=0;x<w;x+=2){
            const nx=x/w;
            const wave=Math.sin(nx*8-t*0.6)*3
                      +Math.sin(nx*32+t*1.5)*1.5
                      +(Math.random()-0.5)*0.3;
            const y=waveY+wave+8;
            if(x===0)pCtx.moveTo(x,y);
            else pCtx.lineTo(x,y);
        }
        pCtx.strokeStyle=accent;
        pCtx.globalAlpha=0.06;
        pCtx.lineWidth=0.5;
        pCtx.stroke();

        pCtx.globalAlpha=1;
        requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // ====================== CLOCK — ultra minimal ======================
    const isHomePage=!(/settings|items|users|tags/.test(window.location.pathname));
    const clockContainer=document.createElement('div');
    clockContainer.id='clock-container';
    clockContainer.style.display=isHomePage?'block':'none';
    const clockCanvas=document.createElement('canvas');
    clockCanvas.width=80;clockCanvas.height=80;
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
        const W=80,cx=40,cy=40,r=36;
        const now=new Date();
        const accent=accentColors[currentTheme]||'#8b5cf6';
        clockCtx.clearRect(0,0,W,W);

        // Subtle accent ring
        clockCtx.beginPath();clockCtx.arc(cx,cy,r-1,0,Math.PI*2);
        clockCtx.strokeStyle=accent;clockCtx.globalAlpha=0.15;clockCtx.lineWidth=0.5;clockCtx.stroke();
        clockCtx.globalAlpha=1;

        // 4 tick marks
        for(let i=0;i<4;i++){
            const angle=(i/4)*Math.PI*2-Math.PI/2;
            clockCtx.beginPath();
            clockCtx.moveTo(cx+Math.cos(angle)*26,cy+Math.sin(angle)*26);
            clockCtx.lineTo(cx+Math.cos(angle)*30,cy+Math.sin(angle)*30);
            clockCtx.strokeStyle='rgba(232,228,222,0.25)';clockCtx.lineWidth=1;
            clockCtx.lineCap='round';clockCtx.stroke();
        }

        const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
        const hA=(Math.PI/6)*h+(Math.PI/360)*m-Math.PI/2;
        const mA=(Math.PI/30)*m+(Math.PI/1800)*s-Math.PI/2;
        const sA=(Math.PI/30)*s-Math.PI/2;

        clockCtx.lineCap='round';
        // Hour
        clockCtx.beginPath();clockCtx.moveTo(cx,cy);
        clockCtx.lineTo(cx+Math.cos(hA)*18,cy+Math.sin(hA)*18);
        clockCtx.strokeStyle='rgba(232,228,222,0.85)';clockCtx.lineWidth=2;clockCtx.stroke();
        // Minute
        clockCtx.beginPath();clockCtx.moveTo(cx,cy);
        clockCtx.lineTo(cx+Math.cos(mA)*26,cy+Math.sin(mA)*26);
        clockCtx.strokeStyle='rgba(232,228,222,0.6)';clockCtx.lineWidth=1.2;clockCtx.stroke();
        // Second — accent with glow
        clockCtx.shadowBlur=6;clockCtx.shadowColor=accent;
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(sA)*(-4),cy+Math.sin(sA)*(-4));
        clockCtx.lineTo(cx+Math.cos(sA)*30,cy+Math.sin(sA)*30);
        clockCtx.strokeStyle=accent;clockCtx.lineWidth=0.7;clockCtx.stroke();
        clockCtx.shadowBlur=0;
        // Center — accent dot with glow
        clockCtx.shadowBlur=4;clockCtx.shadowColor=accent;
        clockCtx.beginPath();clockCtx.arc(cx,cy,2.5,0,Math.PI*2);
        clockCtx.fillStyle=accent;clockCtx.fill();
        clockCtx.shadowBlur=0;
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
    }
    updateTheme();setInterval(updateTheme,60000);

    const stackStyle=document.createElement('style');
    stackStyle.textContent='#app,#app>*,.navbar,header{position:relative;z-index:10!important;}';
    document.head.appendChild(stackStyle);
});
