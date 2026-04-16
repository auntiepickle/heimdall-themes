document.addEventListener('DOMContentLoaded', () => {

    const themeCfg = window.__HEIMDALL_THEME__ || {};

    // ====================== BACKGROUND ======================
    const bgCanvas = document.createElement('canvas');
    bgCanvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;';
    document.body.insertBefore(bgCanvas, document.body.firstChild);
    const bgCtx = bgCanvas.getContext('2d');

    function drawPaperBg(theme) {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
        const w=bgCanvas.width, h=bgCanvas.height;

        // Base color
        const colors = {
            day:     {bg:'#fdf6e3', grain:'rgba(139,115,85,0.04)'},
            evening: {bg:'#f0e4cc', grain:'rgba(139,94,60,0.05)'},
            night:   {bg:'#2c1e12', grain:'rgba(210,196,171,0.03)'}
        };
        const c = colors[theme] || colors.day;
        bgCtx.fillStyle = c.bg;
        bgCtx.fillRect(0,0,w,h);

        // Paper grain texture
        for(let i=0;i<w*h*0.002;i++){
            bgCtx.fillStyle=c.grain;
            bgCtx.fillRect(Math.random()*w, Math.random()*h, Math.random()*2+1, Math.random()*2+1);
        }

        // Coffee stain (day/evening only)
        if(theme!=='night'){
            const sx=w*0.7+Math.random()*100, sy=h*0.3+Math.random()*80;
            bgCtx.beginPath();bgCtx.arc(sx,sy,40+Math.random()*20,0,Math.PI*2);
            bgCtx.strokeStyle=theme==='evening'?'rgba(139,94,60,0.06)':'rgba(180,140,90,0.05)';
            bgCtx.lineWidth=2;bgCtx.stroke();
            bgCtx.beginPath();bgCtx.arc(sx+2,sy+3,35+Math.random()*15,0,Math.PI*2);
            bgCtx.stroke();
        }

        // Subtle fold lines
        bgCtx.strokeStyle = theme==='night'?'rgba(210,196,171,0.04)':'rgba(139,115,85,0.06)';
        bgCtx.lineWidth=1;
        bgCtx.setLineDash([8,6]);
        bgCtx.beginPath();bgCtx.moveTo(w*0.5,0);bgCtx.lineTo(w*0.5,h);bgCtx.stroke();
        bgCtx.beginPath();bgCtx.moveTo(0,h*0.5);bgCtx.lineTo(w,h*0.5);bgCtx.stroke();
        bgCtx.setLineDash([]);
    }

    // ====================== PARTICLES ======================
    const canvas = document.createElement('canvas');
    canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let particles = [];
    let currentTheme = '';

    function spawnDust(w,h){
        const isNight = currentTheme === 'night';
        return {x:Math.random()*w, y:Math.random()*h,
            size:Math.random()*2+0.5,
            vx:Math.random()*0.2-0.1, vy:Math.random()*0.15-0.075,
            opacity:Math.random()*0.25+0.08,
            color:isNight?'rgba(210,196,171,':'rgba(180,140,90,',
            life:Math.random()*Math.PI*2, lifeSpeed:Math.random()*0.01+0.003};
    }

    function initParticles(theme,w,h){
        particles=[];
        const count = theme==='night'? 8 : (theme==='evening'? 15 : 20);
        for(let i=0;i<count;i++) particles.push(spawnDust(w,h));
    }

    function animate(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        particles.forEach(p=>{
            p.life+=p.lifeSpeed;
            const pulse=Math.sin(p.life)*0.3+0.7;
            ctx.beginPath();
            ctx.arc(p.x,p.y,p.size*pulse,0,Math.PI*2);
            ctx.fillStyle=p.color+(p.opacity*pulse).toFixed(2)+')';
            ctx.fill();
            p.x+=p.vx;p.y+=p.vy;
            if(p.x<-10||p.x>canvas.width+10||p.y<-10||p.y>canvas.height+10){
                Object.assign(p,spawnDust(canvas.width,canvas.height));
            }
        });
        requestAnimationFrame(animate);
    }

    // ====================== CLOCK — hand-drawn style ======================
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

    // Wobbly circle — generated once
    const wobblePoints=[];
    for(let i=0;i<36;i++){
        wobblePoints.push({r:36+Math.random()*3-1.5, a:(i/36)*Math.PI*2});
    }

    function drawClock(){
        const W=88,cx=44,cy=44;
        const now=new Date();
        const isNight=currentTheme==='night';
        const ink=isNight?'#d2c4ab':'#5c4a2a';
        const inkLight=isNight?'#b8a88a':'#8b7355';
        const face=isNight?'#3c2a1c':'#fef9ef';

        clockCtx.clearRect(0,0,W,W);

        // Wobbly face
        clockCtx.beginPath();
        clockCtx.moveTo(cx+wobblePoints[0].r*Math.cos(wobblePoints[0].a),
                        cy+wobblePoints[0].r*Math.sin(wobblePoints[0].a));
        for(let i=1;i<wobblePoints.length;i++){
            const p=wobblePoints[i];
            clockCtx.lineTo(cx+p.r*Math.cos(p.a),cy+p.r*Math.sin(p.a));
        }
        clockCtx.closePath();
        clockCtx.fillStyle=face;clockCtx.fill();
        clockCtx.strokeStyle=inkLight;clockCtx.lineWidth=1.5;
        clockCtx.setLineDash([3,2]);clockCtx.stroke();clockCtx.setLineDash([]);

        // Hour dots
        [[0,-28],[28,0],[0,28],[-28,0]].forEach(([dx,dy])=>{
            clockCtx.beginPath();clockCtx.arc(cx+dx,cy+dy,2,0,Math.PI*2);
            clockCtx.fillStyle=inkLight;clockCtx.fill();
        });

        const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
        const hAngle=(Math.PI/6)*h+(Math.PI/360)*m-Math.PI/2;
        const mAngle=(Math.PI/30)*m+(Math.PI/1800)*s-Math.PI/2;
        const sAngle=(Math.PI/30)*s-Math.PI/2;

        clockCtx.lineCap='round';
        // Hour
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(hAngle)*3,cy+Math.sin(hAngle)*3);
        clockCtx.lineTo(cx+Math.cos(hAngle)*18,cy+Math.sin(hAngle)*18);
        clockCtx.strokeStyle=ink;clockCtx.lineWidth=3;clockCtx.stroke();
        // Minute
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(mAngle)*3,cy+Math.sin(mAngle)*3);
        clockCtx.lineTo(cx+Math.cos(mAngle)*26,cy+Math.sin(mAngle)*26);
        clockCtx.strokeStyle=ink;clockCtx.lineWidth=2;clockCtx.stroke();
        // Second
        clockCtx.beginPath();
        clockCtx.moveTo(cx+Math.cos(sAngle)*(-5),cy+Math.sin(sAngle)*(-5));
        clockCtx.lineTo(cx+Math.cos(sAngle)*28,cy+Math.sin(sAngle)*28);
        clockCtx.strokeStyle=isNight?'rgba(180,120,80,0.6)':'rgba(180,60,40,0.6)';
        clockCtx.lineWidth=0.8;clockCtx.stroke();
        // Center
        clockCtx.beginPath();clockCtx.arc(cx,cy,2.5,0,Math.PI*2);
        clockCtx.fillStyle=ink;clockCtx.fill();
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
        drawPaperBg(newTheme);
        initParticles(newTheme,canvas.width,canvas.height);
    }

    canvas.width=window.innerWidth;canvas.height=window.innerHeight;
    window.addEventListener('resize',()=>{
        canvas.width=window.innerWidth;canvas.height=window.innerHeight;
        drawPaperBg(currentTheme);
    });
    updateTheme();animate();setInterval(updateTheme,60000);

    // Z-index stacking
    const stackStyle=document.createElement('style');
    stackStyle.textContent='#app,#app>*,.navbar,header{position:relative;z-index:10!important;}';
    document.head.appendChild(stackStyle);
});
