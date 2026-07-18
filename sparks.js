// Vanilla JS implementation of ClickSpark and CursorGrid (adapted from React Bits)
// Theme colors: Purple #5113fa

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------
    // 1. ClickSpark Implementation
    // ----------------------------------------------------
    const sparkCanvas = document.createElement("canvas");
    sparkCanvas.style.position = "fixed";
    sparkCanvas.style.top = "0";
    sparkCanvas.style.left = "0";
    sparkCanvas.style.width = "100vw";
    sparkCanvas.style.height = "100vh";
    sparkCanvas.style.pointerEvents = "none";
    sparkCanvas.style.zIndex = "99999";
    document.body.appendChild(sparkCanvas);

    const sparkCtx = sparkCanvas.getContext("2d");
    let sparks = [];
    const sparkColor = '#5113fa'; // Purple Eneba
    const sparkSize = 10;
    const sparkRadius = 15;
    const sparkCount = 8;
    const duration = 400;

    const resizeSparkCanvas = () => {
        sparkCanvas.width = window.innerWidth;
        sparkCanvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resizeSparkCanvas);
    resizeSparkCanvas();

    const drawSparks = (timestamp) => {
        sparkCtx.clearRect(0, 0, sparkCanvas.width, sparkCanvas.height);
        
        sparks = sparks.filter(spark => {
            const elapsed = timestamp - spark.startTime;
            if (elapsed >= duration) return false;

            const progress = elapsed / duration;
            const eased = progress * (2 - progress); // ease-out

            const distance = eased * sparkRadius;
            const lineLength = sparkSize * (1 - eased);

            const x1 = spark.x + distance * Math.cos(spark.angle);
            const y1 = spark.y + distance * Math.sin(spark.angle);
            const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
            const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

            sparkCtx.strokeStyle = sparkColor;
            sparkCtx.lineWidth = 2;
            sparkCtx.beginPath();
            sparkCtx.moveTo(x1, y1);
            sparkCtx.lineTo(x2, y2);
            sparkCtx.stroke();

            return true;
        });

        requestAnimationFrame(drawSparks);
    };
    requestAnimationFrame(drawSparks);

    document.addEventListener("click", (e) => {
        const x = e.clientX;
        const y = e.clientY;
        const now = performance.now();
        
        const newSparks = Array.from({ length: sparkCount }, (_, i) => ({
            x,
            y,
            angle: (2 * Math.PI * i) / sparkCount,
            startTime: now
        }));

        sparks.push(...newSparks);
    });

    // ----------------------------------------------------
    // 2. CursorGrid Implementation
    // ----------------------------------------------------
    const gridContainer = document.createElement("div");
    gridContainer.style.position = "fixed";
    gridContainer.style.top = "0";
    gridContainer.style.left = "0";
    gridContainer.style.width = "100vw";
    gridContainer.style.height = "100vh";
    gridContainer.style.zIndex = "-1";
    gridContainer.style.pointerEvents = "none";
    document.body.appendChild(gridContainer);

    const gridCanvas = document.createElement("canvas");
    gridCanvas.style.display = "block";
    gridCanvas.style.width = "100%";
    gridCanvas.style.height = "100%";
    gridContainer.appendChild(gridCanvas);

    const ctx = gridCanvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const cellSize = 70;
    const color = '#5113fa';
    const radius = 140;
    const holdTime = 400;
    const fadeDuration = 800;
    const lineWidth = 1.2;
    const maxOpacity = 0.5; // Slightly lower opacity for background subtlety
    const fillOpacity = 0.05;
    const gridOpacity = 0.02;

    let cols = 0;
    let rows = 0;
    let offX = 0;
    let offY = 0;
    let alphas = new Float32Array(0);
    let touched = new Float64Array(0);
    let w = 0;
    let h = 0;
    let running = false;
    let lastFrame = 0;

    const rebuildGrid = () => {
        w = window.innerWidth;
        h = window.innerHeight;
        gridCanvas.width = Math.max(1, Math.round(w * dpr));
        gridCanvas.height = Math.max(1, Math.round(h * dpr));
        gridCanvas.style.width = `${w}px`;
        gridCanvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(w / cellSize) + 1;
        rows = Math.ceil(h / cellSize) + 1;
        offX = (w - cols * cellSize) / 2;
        offY = (h - rows * cellSize) / 2;
        alphas = new Float32Array(cols * rows);
        touched = new Float64Array(cols * rows);
    };

    const cellCenter = i => {
        const cx = offX + (i % cols) * cellSize + cellSize / 2;
        const cy = offY + Math.floor(i / cols) * cellSize + cellSize / 2;
        return [cx, cy];
    };

    const hexToRgb = hex => {
        const num = parseInt(hex.replace('#', ''), 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    };

    const energize = (x, y) => {
        const r = Math.max(radius, 1);
        const now = performance.now();
        const minCol = Math.max(0, Math.floor((x - r - offX) / cellSize));
        const maxCol = Math.min(cols - 1, Math.floor((x + r - offX) / cellSize));
        const minRow = Math.max(0, Math.floor((y - r - offY) / cellSize));
        const maxRow = Math.min(rows - 1, Math.floor((y + r - offY) / cellSize));

        for (let cRow = minRow; cRow <= maxRow; cRow++) {
            for (let cCol = minCol; cCol <= maxCol; cCol++) {
                const i = cRow * cols + cCol;
                const [cx, cy] = cellCenter(i);
                const dist = Math.hypot(cx - x, cy - y);
                if (dist > r) continue;
                
                // Smooth falloff
                const t = 1 - dist / r;
                const level = (t * t * (3 - 2 * t)) * maxOpacity;
                
                if (level > alphas[i]) {
                    alphas[i] = level;
                    touched[i] = now;
                } else if (level > 0) {
                    touched[i] = now;
                }
            }
        }
    };

    const drawGrid = now => {
        const dt = Math.min(now - lastFrame, 50);
        lastFrame = now;
        ctx.clearRect(0, 0, w, h);
        const [cr, cg, cb] = hexToRgb(color);

        // Grid opacity lattice
        if (gridOpacity > 0) {
            ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${gridOpacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let cCol = 0; cCol <= cols; cCol++) {
                const x = Math.round(offX + cCol * cellSize) + 0.5;
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
            }
            for (let cRow = 0; cRow <= rows; cRow++) {
                const y = Math.round(offY + cRow * cellSize) + 0.5;
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
            }
            ctx.stroke();
        }

        let anyVisible = false;
        const fadeStep = dt / Math.max(fadeDuration, 16);
        const half = cellSize / 2;

        for (let i = 0; i < alphas.length; i++) {
            let a = alphas[i];
            if (a <= 0) continue;
            if (now - touched[i] > holdTime) {
                a = Math.max(0, a - fadeStep);
                alphas[i] = a;
                if (a <= 0) continue;
            }
            anyVisible = true;

            const [cx, cy] = cellCenter(i);
            const gradient = ctx.createRadialGradient(cx, cy, half * 0.1, cx, cy, cellSize);
            gradient.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a})`);
            gradient.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);

            const x = cx - half + 0.5;
            const y = cy - half + 0.5;
            const s = cellSize - 1;

            ctx.beginPath();
            ctx.rect(x, y, s, s);
            if (fillOpacity > 0) {
                ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${a * fillOpacity})`;
                ctx.fill();
            }
            ctx.strokeStyle = gradient;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }

        if (anyVisible || gridOpacity > 0) {
            requestAnimationFrame(drawGrid);
        } else {
            running = false;
        }
    };

    const wakeGrid = () => {
        if (running) return;
        running = true;
        lastFrame = performance.now();
        requestAnimationFrame(drawGrid);
    };

    window.addEventListener("pointermove", (e) => {
        energize(e.clientX, e.clientY);
        wakeGrid();
    });

    window.addEventListener("resize", rebuildGrid);
    rebuildGrid();
    wakeGrid();
});
