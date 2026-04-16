document.addEventListener('DOMContentLoaded', () => {

    const themeCfg = window.__HEIMDALL_THEME__ || {};

    // ====================== MORPHING BLOB SHADER ======================
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
            float fbm(vec2 p){float v=0.,a=0.5;for(int i=0;i<6;i++){v+=a*noise(p);p*=2.1;a*=0.48;}return v;}

            // SDF circle
            float sdCircle(vec2 p,float r){return length(p)-r;}

            void main(){
                vec2 uv=(gl_FragCoord.xy-u_resolution*0.5)/min(u_resolution.x,u_resolution.y);
                float t=u_time;
                vec2 mouse=(u_mouse-u_resolution*0.5)/min(u_resolution.x,u_resolution.y);

                // Accent colors by variant
                vec3 accent;
                if(u_theme<0.5) accent=vec3(0.545,0.361,0.965);      // violet
                else if(u_theme<1.5) accent=vec3(1.0,0.176,0.333);   // pink
                else accent=vec3(0.231,0.510,0.965);                   // blue

                // Noise displacement on blob boundary
                float noiseVal=fbm(uv*3.+t*0.08);
                float noiseVal2=fbm(uv*2.-t*0.06+vec2(5.));

                // Mouse attraction — blob subtly reaches toward cursor
                vec2 toMouse=mouse-uv;
                float mouseDist=length(toMouse);
                vec2 pull=toMouse*0.08/(0.5+mouseDist);

                // Main blob — SDF with noise displacement
                float blobR=0.28+sin(t*0.2)*0.03;
                float displacement=(noiseVal-0.5)*0.18+(noiseVal2-0.5)*0.12;
                float d=sdCircle(uv+pull,blobR+displacement);

                // Smooth edge
                float blob=smoothstep(0.02,-0.04,d);

                // Inner glow — brighter toward center
                float inner=smoothstep(0.15,-0.1,d);
                float core=smoothstep(0.0,-0.15,d);

                // Fresnel rim
                float rim=smoothstep(-0.02,0.01,d)*smoothstep(0.05,-0.01,d);

                // Color composition
                vec3 blobColor=accent*0.3*blob;
                blobColor+=accent*0.6*inner*0.5;
                blobColor+=accent*1.2*core*0.3;
                blobColor+=vec3(1.)*rim*0.15;

                // Subtle ambient glow around blob
                float ambientGlow=1./(1.+pow(length(uv)*3.,2.))*0.04;
                vec3 ambient=accent*ambientGlow;

                // Mouse spotlight — very subtle warmth
                float spotDist=length(uv-mouse);
                float spot=1./(1.+pow(spotDist*5.,2.))*0.03;

                // Film grain
                float grain=(hash(uv*800.+fract(t*11.))-0.5)*0.06;

                vec3 color=blobColor+ambient+vec3(1.)*spot+grain;
                float alpha=clamp(blob*0.9+rim*0.3+ambientGlow*8.+spot*4.,0.,0.95);

                gl_FragColor=vec4(clamp(color,0.,1.),alpha);
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

    // ====================== GRAIN OVERLAY ======================
    const grainCanvas=document.createElement('canvas');
    grainCanvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;mix-blend-mode:overlay;opacity:0.4;';
    document.body.appendChild(grainCanvas);
    const gCtx=grainCanvas.getContext('2d');

    function animateGrain(){
        grainCanvas.width=window.innerWidth;grainCanvas.height=window.innerHeight;
        const w=grainCanvas.width,h=grainCanvas.height;
        const imgData=gCtx.createImageData(w,h);
        const d=imgData.data;
        for(let i=0;i<d.length;i+=4){
            const v=Math.random()*255;
            d[i]=d[i+1]=d[i+2]=v;d[i+3]=20;
        }
        gCtx.putImageData(imgData,0,0);
        requestAnimationFrame(animateGrain);
    }
    animateGrain();

    // ====================== CLOCK — minimal ======================
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

    const accentColors={day:'#8b5cf6',evening:'#ff2d55',night:'#3b82f6'};
    let currentTheme='';

    function drawClock(){
        const W=80,cx=40,cy=40,r=36;
        const now=new Date();
        const accent=accentColors[currentTheme]||'#8b5cf6';
        clockCtx.clearRect(0,0,W,W);

        // Face — barely there
        clockCtx.beginPath();clockCtx.arc(cx,cy,r,0,Math.PI*2);
        clockCtx.fillStyle='rgba(20,20,20,0.9)';clockCtx.fill();

        // Minimal tick marks — only 4
        for(let i=0;i<4;i++){
            const angle=(i/4)*Math.PI*2-Math.PI/2;
            clockCtx.beginPath();
            clockCtx.moveTo(cx+Math.cos(angle)*30,cy+Math.sin(angle)*30);
            clockCtx.lineTo(cx+Math.cos(angle)*34,cy+Math.sin(angle)*34);
            clockCtx.strokeStyle='rgba(255,255,255,0.15)';clockCtx.lineWidth=1;
            clockCtx.lineCap='round';clockCtx.stroke();
        }

        const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
        const hA=(Math.PI/6)*h+(Math.PI/360)*m-Math.PI/2;
        const mA=(Math.PI/30)*m+(Math.PI/1800)*s-Math.PI/2;
        const sA=(Math.PI/30)*s-Math.PI/2;

        clockCtx.lineCap='round';
        // Hour — white, thin
        clockCtx.beginPath();
        clockCtx.moveTo(cx,cy);
        clockCtx.lineTo(cx+Math.cos(hA)*18,cy+Math.sin(hA)*18);
        clockCtx.strokeStyle='rgba(255,255,255,0.7)';clockCtx.lineWidth=2;clockCtx.stroke();
        // Minute — white, thinner
        clockCtx.beginPath();
        clockCtx.moveTo(cx,cy);
        clockCtx.lineTo(cx+Math.cos(mA)*28,cy+Math.sin(mA)*28);
        clockCtx.strokeStyle='rgba(255,255,255,0.5)';clockCtx.lineWidth=1.2;clockCtx.stroke();
        // Second — accent color
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(sA)*(-4),cy+Math.sin(sA)*(-4));
        clockCtx.lineTo(cx+Math.cos(sA)*32,cy+Math.sin(sA)*32);
        clockCtx.strokeStyle=accent;clockCtx.lineWidth=0.6;clockCtx.stroke();
        // Center — accent dot
        clockCtx.beginPath();clockCtx.arc(cx,cy,2.5,0,Math.PI*2);
        clockCtx.fillStyle=accent;clockCtx.fill();
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
