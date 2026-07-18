// --- SplitText Vanilla JS (Custom Implementation) ---
function splitTextNode(el) {
    const text = el.innerText;
    el.innerHTML = '';
    const chars = [];
    text.split(' ').forEach((word, wordIndex) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'split-word';
        wordSpan.style.display = 'inline-block';
        wordSpan.style.whiteSpace = 'nowrap';
        
        word.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.className = 'split-char';
            charSpan.style.display = 'inline-block';
            charSpan.style.opacity = '0';
            charSpan.style.transform = 'translateY(40px)';
            charSpan.innerText = char;
            wordSpan.appendChild(charSpan);
            chars.push(charSpan);
        });
        
        el.appendChild(wordSpan);
        if (wordIndex < text.split(' ').length - 1) {
            el.appendChild(document.createTextNode(' '));
        }
    });
    return chars;
}

function initSplitText(selector) {
    if (typeof gsap === 'undefined') {
        console.warn('GSAP not loaded');
        return;
    }
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
        const chars = splitTextNode(el);
        gsap.to(chars, 
            {
                opacity: 1, 
                y: 0,
                duration: 1.25,
                ease: "power3.out",
                stagger: 0.05,
                scrollTrigger: {
                    trigger: el,
                    start: "top 90%",
                    once: true
                }
            }
        );
    });
}

// --- LineSidebar Vanilla JS ---
function initLineSidebar(containerId, itemsData, onItemClick) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Configuration
    const config = {
        accentColor: '#A855F7',
        textColor: '#c4c4c4',
        markerColor: '#6c6c6c',
        showIndex: true,
        showMarker: true,
        proximityRadius: 100,
        maxShift: 30,
        markerLength: 60,
        markerGap: 0,
        tickScale: 0.5,
        scaleTick: true,
        itemGap: 20,
        fontSize: 1.1,
        smoothing: 100
    };

    // Apply CSS variables to container
    container.className = `line-sidebar ${config.showMarker ? 'line-sidebar--markers' : ''} ${config.scaleTick ? 'line-sidebar--scale-tick' : ''}`;
    container.style.setProperty('--accent-color', config.accentColor);
    container.style.setProperty('--text-color', config.textColor);
    container.style.setProperty('--marker-color', config.markerColor);
    container.style.setProperty('--marker-length', `${config.markerLength}px`);
    container.style.setProperty('--marker-gap', `${config.markerGap}px`);
    container.style.setProperty('--tick-scale', config.tickScale);
    container.style.setProperty('--max-shift', `${config.maxShift}px`);
    container.style.setProperty('--item-gap', `${config.itemGap}px`);
    container.style.setProperty('--font-size', `${config.fontSize}rem`);
    container.style.setProperty('--smoothing', `${config.smoothing}ms`);

    const ul = document.createElement('ul');
    ul.className = 'line-sidebar__list';
    container.appendChild(ul);

    let activeIndex = 0;
    const itemElements = [];
    const targets = [];
    const currentVals = [];
    
    const smoothFalloff = p => p * p * (3 - 2 * p);

    itemsData.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'line-sidebar__item';
        if (index === activeIndex) li.setAttribute('aria-current', 'true');
        
        li.addEventListener('click', () => {
            activeIndex = index;
            itemElements.forEach((el, i) => {
                if (i === activeIndex) el.setAttribute('aria-current', 'true');
                else el.removeAttribute('aria-current');
            });
            if (onItemClick) onItemClick(index, item.label);
        });

        if (config.showMarker) {
            const marker = document.createElement('span');
            marker.className = 'line-sidebar__marker';
            marker.setAttribute('aria-hidden', 'true');
            li.appendChild(marker);
        }

        const labelSpan = document.createElement('span');
        labelSpan.className = 'line-sidebar__label';

        if (config.showIndex) {
            const idxSpan = document.createElement('span');
            idxSpan.className = 'line-sidebar__index';
            idxSpan.textContent = String(index + 1).padStart(2, '0');
            labelSpan.appendChild(idxSpan);
        }

        const textSpan = document.createElement('span');
        textSpan.className = 'line-sidebar__text';
        textSpan.textContent = item.label;
        labelSpan.appendChild(textSpan);

        li.appendChild(labelSpan);
        ul.appendChild(li);
        
        itemElements.push(li);
        targets.push(0);
        currentVals.push(0);
    });

    let rafId = null;
    let lastTime = 0;

    const runFrame = (now) => {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        const tau = Math.max(config.smoothing, 1) / 1000;
        const k = 1 - Math.exp(-dt / tau);

        let moving = false;
        for (let i = 0; i < itemElements.length; i++) {
            const el = itemElements[i];
            const target = Math.max(targets[i] || 0, activeIndex === i ? 1 : 0);
            const cur = currentVals[i] || 0;
            const next = cur + (target - cur) * k;
            const settled = Math.abs(target - next) < 0.0015;
            const value = settled ? target : next;
            currentVals[i] = value;
            el.style.setProperty('--effect', value.toFixed(4));
            if (!settled) moving = true;
        }

        if (moving) {
            rafId = requestAnimationFrame(runFrame);
        } else {
            rafId = null;
        }
    };

    const startLoop = () => {
        if (rafId !== null) return;
        lastTime = performance.now();
        rafId = requestAnimationFrame(runFrame);
    };

    ul.addEventListener('pointermove', (e) => {
        const rect = ul.getBoundingClientRect();
        const pointerY = e.clientY - rect.top;
        
        for (let i = 0; i < itemElements.length; i++) {
            const el = itemElements[i];
            const center = el.offsetTop + el.offsetHeight / 2;
            const distance = Math.abs(pointerY - center);
            targets[i] = smoothFalloff(Math.max(0, 1 - distance / config.proximityRadius));
        }
        startLoop();
    });

    ul.addEventListener('pointerleave', () => {
        for (let i = 0; i < targets.length; i++) targets[i] = 0;
        startLoop();
    });

    startLoop(); // Initial render
}


// --- Dock Vanilla JS ---
function initDock(containerId, itemsData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Config
    const baseItemSize = 50;
    const magnification = 70;
    const distance = 200;

    const dockOuter = document.createElement('div');
    dockOuter.className = 'dock-outer';
    
    const dockPanel = document.createElement('div');
    dockPanel.className = 'dock-panel';
    dockPanel.setAttribute('role', 'toolbar');
    
    let isHovered = false;
    let mouseX = Infinity;

    const itemElements = [];

    itemsData.forEach(item => {
        const dockItem = document.createElement('div');
        dockItem.className = 'dock-item';
        dockItem.setAttribute('role', 'button');
        dockItem.setAttribute('tabindex', '0');
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'dock-icon';
        iconDiv.innerHTML = item.icon; // Using fontawesome or raw html
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'dock-label';
        labelDiv.textContent = item.label;

        dockItem.appendChild(iconDiv);
        dockItem.appendChild(labelDiv);
        dockPanel.appendChild(dockItem);
        
        dockItem.addEventListener('click', item.onClick);
        
        itemElements.push({
            el: dockItem,
            labelEl: labelDiv
        });
    });

    dockOuter.appendChild(dockPanel);
    container.appendChild(dockOuter);

    const updateDock = () => {
        if (!isHovered) {
            itemElements.forEach(({el, labelEl}) => {
                gsap.to(el, {width: baseItemSize, height: baseItemSize, duration: 0.3, ease: "power2.out"});
                gsap.to(labelEl, {opacity: 0, y: 0, duration: 0.2});
            });
            gsap.to(dockPanel, {height: 68, duration: 0.3, ease: "power2.out"});
            return;
        }

        const maxHeight = magnification + magnification / 2 + 4;
        gsap.to(dockPanel, {height: maxHeight, duration: 0.3, ease: "power2.out"});

        itemElements.forEach(({el, labelEl}) => {
            const rect = el.getBoundingClientRect();
            // Calculate distance from mouse to center of item
            const itemCenterX = rect.x + rect.width / 2;
            const mouseDistance = mouseX - itemCenterX;
            
            // Map distance to size (from -distance to distance)
            let newSize = baseItemSize;
            if (Math.abs(mouseDistance) < distance) {
                // Map distance to magnification
                const normalized = 1 - Math.abs(mouseDistance) / distance;
                newSize = baseItemSize + (magnification - baseItemSize) * normalized;
            }
            
            gsap.to(el, {width: newSize, height: newSize, duration: 0.1});
            
            // Show label if hovered closely
            if (Math.abs(mouseDistance) < baseItemSize / 2) {
                gsap.to(labelEl, {opacity: 1, y: -10, duration: 0.2});
            } else {
                gsap.to(labelEl, {opacity: 0, y: 0, duration: 0.2});
            }
        });
    };

    dockPanel.addEventListener('mousemove', (e) => {
        isHovered = true;
        mouseX = e.clientX;
        updateDock();
    });

    dockPanel.addEventListener('mouseleave', () => {
        isHovered = false;
        mouseX = Infinity;
        updateDock();
    });
}

// --- Spring Modal Vanilla JS ---
function openSpringModal() {
    const overlay = document.getElementById('spring-modal');
    if (!overlay) return;
    overlay.classList.remove('closing');
    overlay.classList.add('active');
}

function closeSpringModal() {
    const overlay = document.getElementById('spring-modal');
    if (!overlay) return;
    
    // Add closing class to trigger exit animation on content
    overlay.classList.add('closing');
    overlay.classList.remove('active');
    
    // Remove closing class after animation completes so it's ready for next open
    setTimeout(() => {
        overlay.classList.remove('closing');
    }, 300);
}

// --- Gift Modal Vanilla JS ---
function openGiftModal() {
    const overlay = document.getElementById('gift-modal');
    if (!overlay) return;
    overlay.classList.remove('closing');
    overlay.classList.add('active');
}

function closeGiftModal() {
    const overlay = document.getElementById('gift-modal');
    if (!overlay) return;
    
    overlay.classList.add('closing');
    overlay.classList.remove('active');
    
    setTimeout(() => {
        overlay.classList.remove('closing');
    }, 300);
}
