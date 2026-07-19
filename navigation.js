// navigation.js - Injects the modern 3-column Left Sidebar and Mobile Dock

(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
        localStorage.setItem('referralUid', ref);
    }
})();

const NAV_ITEMS = [
    { label: 'Inicio', icon: 'fas fa-home', href: 'index.html' },
    { label: 'Cat&aacute;logo', icon: 'fas fa-search', href: 'catalogo.html' },
    { label: 'M&eacute;todos', icon: 'fas fa-wallet', href: 'metodos.html' },
    { label: 'Biblioteca', icon: 'fas fa-gamepad', href: 'perfil.html' }
];

function getCurrentActiveIndex() {
    const path = window.location.pathname;
    let index = NAV_ITEMS.findIndex(item => path.includes(item.href));
    return index === -1 ? 0 : index;
}

function injectNavigation() {
    const activeIndex = getCurrentActiveIndex();

    // 1. Create Left Sidebar (PC)
    let navLinksHtml = '';
    NAV_ITEMS.forEach((item, i) => {
        const isActive = i === activeIndex ? 'active' : '';
        navLinksHtml += `
            <a href="${item.href}" class="nav-item ${isActive}">
                <i class="${item.icon}"></i>
                <span>${item.label}</span>
            </a>
        `;
    });

    const leftSidebarHtml = `
        <aside class="sidebar left-sidebar">
            <div class="sidebar-header" style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <div style="display:flex; gap: 5px;">
                    <div style="width:10px; height:10px; border-radius:50%; background:#f87171;"></div>
                    <div style="width:10px; height:10px; border-radius:50%; background:#fbbf24;"></div>
                    <div style="width:10px; height:10px; border-radius:50%; background:#34d399;"></div>
                </div>
                <div style="display:flex; gap: 10px; color: var(--text-secondary); font-size: 0.8rem;">
                    <i class="fas fa-arrow-left"></i>
                    <i class="fas fa-arrow-right"></i>
                </div>
            </div>
            <div class="brand" style="margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap: 10px;">
                    <img src="https://i.imgur.com/S00u4EI.png" class="brand-icon" style="width:24px; height:24px; border-radius:50%; background:var(--accent-blue);" alt="GhostKey">
                    <span style="font-weight:600; font-size: 0.9rem;">GhostKey</span>
                </div>
                <div style="display:flex; align-items:center; gap: 5px;">
                    <img src="https://i.imgur.com/S00u4EI.png" style="width:20px; height:20px; border-radius:50%;" alt="User">
                    <i class="fas fa-chevron-down" style="font-size: 0.6rem; color: var(--text-secondary);"></i>
                </div>
            </div>
            <nav class="nav-menu">
                ${navLinksHtml}
            </nav>
            <div class="sidebar-section-title" style="margin-top:10px;">My apps</div>
            <div class="fast-launch" style="flex: none; margin-bottom: 20px;">
                <div class="game-item" onclick="window.location.href='catalogo.html?filter=vbucks'">
                    <div style="width:24px; height:24px; border-radius:6px; background:#1e293b; display:flex; align-items:center; justify-content:center; color:#3b82f6; font-weight:bold; font-size:12px;">V</div>
                    <span class="game-name" style="font-size:0.85rem;">V-Bucks</span>
                </div>
                <div class="game-item" onclick="window.location.href='catalogo.html?filter=discord'">
                    <div style="width:24px; height:24px; border-radius:6px; background:#ef4444; display:flex; align-items:center; justify-content:center; color:white; font-size:12px;"><i class="fab fa-discord"></i></div>
                    <span class="game-name" style="font-size:0.85rem;">Discord Nitro</span>
                </div>
            </div>
            
            <div class="sidebar-section-title" style="display:flex; justify-content:space-between; align-items:center;">
                <span>My favorites</span>
                <i class="fas fa-plus" style="cursor:pointer; padding:5px;"></i>
            </div>
            <div class="fast-launch">
                <div class="game-item" onclick="window.location.href='catalogo.html?filter=crew'">
                    <img src="https://i.imgur.com/3XpcBuu.png" class="game-icon" style="border-radius:6px; width:28px; height:28px;" alt="Crew">
                    <div style="display:flex; flex-direction:column; line-height:1.2;">
                        <span class="game-name" style="font-size:0.85rem;">Fortnite Crew</span>
                        <span style="font-size:0.7rem; color:var(--text-secondary);">Game</span>
                    </div>
                </div>
                <div class="game-item">
                    <div style="width:28px; height:28px; border-radius:6px; background:#8b5cf6; display:flex; align-items:center; justify-content:center; color:white; font-size:12px;"><i class="fas fa-ghost"></i></div>
                    <div style="display:flex; flex-direction:column; line-height:1.2; flex:1;">
                        <span class="game-name" style="font-size:0.85rem;">Premium</span>
                        <span style="font-size:0.7rem; color:var(--text-secondary);">Service</span>
                    </div>
                    <span style="background:var(--accent-red); color:white; font-size:10px; padding:2px 6px; border-radius:10px;">2</span>
                </div>
            </div>
        </aside>
    `;

    // 2. Create Mobile Dock
    let dockLinksHtml = '';
    const dockItems = [
        NAV_ITEMS[0],
        NAV_ITEMS[1],
        { label: 'Wishlist', icon: 'fas fa-heart', href: 'perfil.html?tab=wishlist' },
        NAV_ITEMS[2],
        NAV_ITEMS[3]
    ];

    dockItems.forEach((item, i) => {
        const cleanPath = window.location.pathname;
        const cleanHref = item.href.split('?')[0];
        let isActive = cleanPath.includes(cleanHref) ? 'active' : '';
        
        // Special case handling to avoid double activation on Wishlist and Biblioteca
        if (cleanHref === 'perfil.html') {
            const isWishlistTab = window.location.search.includes('tab=wishlist') || window.location.hash === '#wishlist';
            if (item.label === 'Wishlist') {
                isActive = isWishlistTab ? 'active' : '';
            } else if (item.label === 'Biblioteca') {
                isActive = !isWishlistTab ? 'active' : '';
            }
        }

        dockLinksHtml += `
            <a href="${item.href}" class="dock-item ${isActive}">
                <div class="dock-icon"><i class="${item.icon}"></i></div>
            </a>
        `;
    });

    const dockHtml = `
        <div class="mobile-dock">
            ${dockLinksHtml}
        </div>
    `;

    const appContainer = document.querySelector('.app-container');
    const mainContent = document.querySelector('.main-content');
    
    if (appContainer) {
        // Remove old sidebars if any
        document.querySelectorAll('.sidebar, .mobile-dock').forEach(e => {
            if (!e.classList.contains('left-sidebar') && !e.classList.contains('right-sidebar')) {
                e.remove();
            } else if (e.classList.contains('mobile-dock')) {
                e.remove();
            }
        });
        
        // Remove left sidebar if it already exists to avoid duplicates
        document.querySelectorAll('.sidebar.left-sidebar').forEach(e => e.remove());
        
        // Insert left sidebar before main content
        if (mainContent) {
            appContainer.insertAdjacentHTML('afterbegin', leftSidebarHtml);
        }
        
        // Insert mobile dock at body end
        document.body.insertAdjacentHTML('beforeend', dockHtml);
    }
}

document.addEventListener("DOMContentLoaded", injectNavigation);
