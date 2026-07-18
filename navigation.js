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
    { label: 'Tienda', icon: 'fas fa-store', href: 'metodos.html' },
    { label: 'Biblioteca', icon: 'fas fa-chart-bar', href: 'perfil.html' }
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
        navLinksHtml += 
            <a href="" class="nav-item ">
                <i class=""></i>
                <span></span>
            </a>
        ;
    });

    const leftSidebarHtml = 
        <aside class="sidebar left-sidebar">
            <div class="brand">
                <div class="brand-logo">DF</div>
                <span>GHOSTKEY</span>
            </div>
            <nav class="nav-menu">
                
            </nav>
            <div class="sidebar-section-title">TOP VENTAS</div>
            <div class="fast-launch">
                <div class="game-item" onclick="window.location.href='catalogo.html?filter=vbucks'">
                    <img src="https://i.imgur.com/bAD3nB1.png" class="game-icon" alt="VBucks">
                    <span class="game-name">V-Bucks Ofertas</span>
                </div>
                <div class="game-item" onclick="window.location.href='catalogo.html?filter=crew'">
                    <img src="https://i.imgur.com/3XpcBuu.png" class="game-icon" alt="Crew">
                    <span class="game-name">Fortnite Crew</span>
                </div>
                <div class="game-item" onclick="window.location.href='catalogo.html?filter=discord'">
                    <img src="https://i.imgur.com/TT7IPi9.png" class="game-icon" alt="Discord">
                    <span class="game-name">Discord Nitro</span>
                </div>
            </div>
            <div class="active-download">
                <div class="active-download-top">
                    <i class="fab fa-discord dl-icon" style="background:#5865F2; display:flex; align-items:center; justify-content:center; font-size:14px; color:white;"></i>
                    <div class="dl-info">
                        <span class="dl-title">Comunidad Activa</span>
                    </div>
                </div>
                <div class="dl-progress-bar">
                    <div class="dl-progress-fill" style="width: 100%;"></div>
                </div>
                <div class="dl-stats">
                    <span>Unirse al Servidor</span>
                    <span><i class="fas fa-external-link-alt"></i></span>
                </div>
            </div>
        </aside>
    ;

    // 2. Create Mobile Dock
    let dockLinksHtml = '';
    const dockItems = [
        NAV_ITEMS[0],
        NAV_ITEMS[1],
        { label: 'Wishlist', icon: 'fas fa-heart', href: 'perfil.html' },
        NAV_ITEMS[2],
        NAV_ITEMS[3]
    ];

    dockItems.forEach((item, i) => {
        const isActive = NAV_ITEMS.findIndex(n => n.href === item.href) === activeIndex ? 'active' : '';
        dockLinksHtml += 
            <a href="" class="dock-item ">
                <div class="dock-icon"><i class=""></i></div>
            </a>
        ;
    });

    const dockHtml = 
        <div class="mobile-dock">
            
        </div>
    ;

    const appContainer = document.querySelector('.app-container');
    const mainContent = document.querySelector('.main-content');
    
    if (appContainer) {
        // Remove old sidebars if any
        document.querySelectorAll('.sidebar.left-sidebar, .mobile-dock').forEach(e => e.remove());
        
        // Insert left sidebar before main content
        if (mainContent) {
            appContainer.insertAdjacentHTML('afterbegin', leftSidebarHtml);
        }
        
        // Insert mobile dock at body end
        document.body.insertAdjacentHTML('beforeend', dockHtml);
    }
}

document.addEventListener("DOMContentLoaded", injectNavigation);
