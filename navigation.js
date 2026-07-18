// navigation.js - Dual Navigation System (GooeyNav PC + Dock Mobile)

// Capture referral UID globally
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
        localStorage.setItem('referralUid', ref);
    }
})();
const NAV_ITEMS = [
    { label: "Inicio", icon: "fas fa-home", href: "index.html" },
    { label: "Catálogo", icon: "fas fa-th-large", href: "catalogo.html" },
    { label: "Métodos", icon: "fas fa-wallet", href: "metodos.html" },
    { label: "Mi Perfil", icon: "fas fa-user", href: "perfil.html" },
    { label: "Ayuda", icon: "fas fa-question-circle", href: "comprar.html" },
    { label: "Contacto", icon: "fas fa-headset", href: "contacto.html" }
];

function getCurrentActiveIndex() {
    const path = window.location.pathname;
    let index = NAV_ITEMS.findIndex(item => path.includes(item.href));
    return index === -1 ? 0 : index;
}

// 1. Gooey Nav (PC) Logic
function createGooeyNav() {
    const container = document.createElement('div');
    container.className = 'gooey-nav-container';
    
    // Brand header
    const brand = document.createElement('div');
    brand.className = 'brand';
    brand.style.padding = '0 1em';
    brand.style.marginBottom = '2em';
    brand.innerHTML = `
        <img src="https://i.imgur.com/S00u4EI.png" alt="Logo" class="brand-icon">
        <span class="brand-name" style="font-weight: 800; font-size: 1.2rem;">FOOTPRINT</span>
    `;
    container.appendChild(brand);

    const nav = document.createElement('nav');
    const ul = document.createElement('ul');
    const activeIndex = getCurrentActiveIndex();

    NAV_ITEMS.forEach((item, index) => {
        const li = document.createElement('li');
        if (index === activeIndex) li.classList.add('active');
        
        const a = document.createElement('a');
        a.href = item.href;
        a.innerHTML = `<i class="${item.icon}" style="width:20px; text-align:center;"></i> <span>${item.label}</span>`;
        
        li.appendChild(a);
        
        li.addEventListener('click', (e) => {
            // We let the link act normally, but we can trigger particles
            handleGooeyClick(li, ul, container);
        });

        ul.appendChild(li);
    });

    nav.appendChild(ul);
    
    // Effects
    const filterEffect = document.createElement('span');
    filterEffect.className = 'effect filter';
    
    container.appendChild(nav);
    container.appendChild(filterEffect);

    // Initial positioning
    setTimeout(() => {
        const activeLi = ul.children[activeIndex];
        if (activeLi) updateEffectPosition(activeLi, container, filterEffect);
    }, 100);

    return container;
}

function updateEffectPosition(element, container, filterRef) {
    const containerRect = container.getBoundingClientRect();
    const pos = element.getBoundingClientRect();

    const styles = {
        left: `${pos.x - containerRect.x}px`,
        top: `${pos.y - containerRect.y}px`,
        width: `${pos.width}px`,
        height: `${pos.height}px`
    };
    
    Object.assign(filterRef.style, styles);
}

function handleGooeyClick(liEl, ul, container) {
    const filterRef = container.querySelector('.effect.filter');
    
    // Update active class
    Array.from(ul.children).forEach(child => child.classList.remove('active'));
    liEl.classList.add('active');

    updateEffectPosition(liEl, container, filterRef);

    // Particles
    const particles = filterRef.querySelectorAll('.particle');
    particles.forEach(p => p.remove());

    makeParticles(filterRef);
}

function makeParticles(element) {
    const particleCount = 15;
    const animationTime = 600;
    const timeVariance = 300;
    const colors = [1, 2, 3, 1, 2, 3, 1, 4];
    const particleDistances = [90, 10];
    const particleR = 100;

    const noise = (n = 1) => n / 2 - Math.random() * n;
    const getXY = (distance, pointIndex, totalPoints) => {
        const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
        return [distance * Math.cos(angle), distance * Math.sin(angle)];
    };

    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);

    for (let i = 0; i < particleCount; i++) {
        const t = animationTime * 2 + noise(timeVariance * 2);
        
        let rotate = noise(particleR / 10);
        const p = {
            start: getXY(particleDistances[0], particleCount - i, particleCount),
            end: getXY(particleDistances[1] + noise(7), particleCount - i, particleCount),
            time: t,
            scale: 1 + noise(0.2),
            color: colors[Math.floor(Math.random() * colors.length)],
            rotate: rotate > 0 ? (rotate + particleR / 20) * 10 : (rotate - particleR / 20) * 10
        };

        element.classList.remove('active');

        setTimeout(() => {
            const particle = document.createElement('span');
            const point = document.createElement('span');
            particle.className = 'particle';
            particle.style.setProperty('--start-x', `${p.start[0]}px`);
            particle.style.setProperty('--start-y', `${p.start[1]}px`);
            particle.style.setProperty('--end-x', `${p.end[0]}px`);
            particle.style.setProperty('--end-y', `${p.end[1]}px`);
            particle.style.setProperty('--time', `${p.time}ms`);
            particle.style.setProperty('--scale', `${p.scale}`);
            particle.style.setProperty('--color', `var(--accent-blue)`); // Or use p.color logic
            particle.style.setProperty('--rotate', `${p.rotate}deg`);

            point.className = 'point';
            particle.appendChild(point);
            element.appendChild(particle);
            
            requestAnimationFrame(() => {
                element.classList.add('active');
            });
            
            setTimeout(() => {
                if(element.contains(particle)) element.removeChild(particle);
            }, t);
        }, 30);
    }
}

// 2. Dock Logic (Mobile)
function createDock() {
    const dockOuter = document.createElement('div');
    dockOuter.className = 'dock-outer';
    
    const dockPanel = document.createElement('div');
    dockPanel.className = 'dock-panel';

    const activeIndex = getCurrentActiveIndex();

    // Use a subset of items for the dock so it's not overcrowded
    const dockItems = [
        NAV_ITEMS[0], // Inicio
        NAV_ITEMS[1], // Catalogo
        { label: "Wishlist", icon: "fas fa-heart", href: "perfil.html" }, // Direct to wishlist or profile
        NAV_ITEMS[2], // Metodos
        NAV_ITEMS[3]  // Perfil
    ];

    dockItems.forEach((item, index) => {
        const a = document.createElement('a');
        a.href = item.href;
        a.className = 'dock-item';
        if (NAV_ITEMS.findIndex(n => n.href === item.href) === activeIndex) {
            a.classList.add('active');
        }

        a.innerHTML = `
            <div class="dock-icon"><i class="${item.icon}"></i></div>
            <div class="dock-label">${item.label}</div>
        `;

        // GSAP Magnification logic
        a.addEventListener('mousemove', (e) => {
            const rect = a.getBoundingClientRect();
            const mouseX = e.clientX;
            const itemCenterX = rect.left + rect.width / 2;
            const distance = Math.abs(mouseX - itemCenterX);
            
            // Map distance to scale (max scale 1.4, min scale 1)
            const maxDist = 80;
            let scale = 1;
            if (distance < maxDist) {
                scale = 1 + (0.4 * (1 - distance / maxDist));
            }
            
            gsap.to(a, {
                scale: scale,
                y: -10 * (scale - 1),
                duration: 0.1,
                ease: "power2.out",
                overwrite: true
            });
        });

        a.addEventListener('mouseleave', () => {
            gsap.to(a, {
                scale: 1,
                y: 0,
                duration: 0.3,
                ease: "back.out(1.5)",
                overwrite: true
            });
        });

        dockPanel.appendChild(a);
    });

    // Reset all on panel leave to be safe
    dockPanel.addEventListener('mouseleave', () => {
        dockPanel.querySelectorAll('.dock-item').forEach(item => {
            gsap.to(item, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" });
        });
    });

    dockOuter.appendChild(dockPanel);
    return dockOuter;
}


// Initialization
document.addEventListener("DOMContentLoaded", () => {
    // Inject stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'dock-gooey.css';
    document.head.appendChild(link);

    const appContainer = document.querySelector('.app-container');
    const mainContent = document.querySelector('.main-content');

    if (appContainer && mainContent) {
        // Remove existing static sidebar to avoid conflicts
        const oldSidebar = document.querySelector('.sidebar');
        if (oldSidebar) oldSidebar.remove();

        // Inject GooeyNav
        const gooeyNav = createGooeyNav();
        appContainer.insertBefore(gooeyNav, mainContent);

        // Inject Mobile Dock (outside app-container or fixed)
        const dock = createDock();
        document.body.appendChild(dock);
    }
});
