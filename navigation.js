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
            <div class="sidebar-section-title" style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                <span>My favorites</span>
                <i class="fas fa-plus" style="cursor:pointer; padding:5px;"></i>
            </div>
            <div class="fast-launch" style="flex: none; margin-bottom: 20px;">
                <div class="game-item" onclick="pageTransitionTo('catalogo.html?filter=crew')">
                    <img src="https://i.imgur.com/3XpcBuu.png" class="game-icon" style="border-radius:6px; width:28px; height:28px;" alt="Crew">
                    <div style="display:flex; flex-direction:column; line-height:1.2;">
                        <span class="game-name" style="font-size:0.85rem;">Fortnite Crew</span>
                        <span style="font-size:0.7rem; color:var(--text-secondary);">Game</span>
                    </div>
                </div>
            </div>
            
            <!-- Friends UI Integrated into Left Sidebar -->
            <div class="friends-sidebar-content" style="flex:1; display:flex; flex-direction:column; overflow:hidden; min-height: 250px;">
                <div class="tabs" style="display:flex; gap:15px; font-weight:600; font-size:0.9rem; margin-bottom:10px;">
                    <span class="tab active" id="tabFriends" style="cursor:pointer; color:var(--text-primary);">Friends <span class="friends-req-badge" id="badgeFriends" style="display:none;">0</span></span>
                    <span class="tab" id="tabRequests" style="cursor:pointer; color:var(--text-secondary);">Requests <span class="badge-red friends-req-badge" id="badgeRequests" style="background:rgba(244,63,94,0.2); color:#f43f5e; padding:2px 6px; border-radius:10px; font-size:0.75rem; display:none;">0</span></span>
                </div>
                
                <div class="search-friend-bar" style="display:flex; align-items:center; gap:10px; margin-bottom: 15px;">
                    <div style="flex:1; background:rgba(255,255,255,0.05); border-radius:10px; padding:8px 12px; display:flex; align-items:center; gap:10px;">
                        <i class="fas fa-search" style="color:var(--text-secondary); font-size:0.8rem;"></i>
                        <input type="text" id="friendSearchInput" placeholder="Search a friend" style="background:transparent; border:none; color:white; font-size:0.85rem; outline:none; width:100%;">
                    </div>
                    <div style="width:32px; height:32px; background:rgba(255,255,255,0.05); border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer;" id="addFriendBtn">
                        <i class="fas fa-user-plus" style="color:var(--text-secondary); font-size:0.8rem;"></i>
                    </div>
                </div>

                <div class="friends-category" style="flex:1; overflow-y:auto; overflow-x:hidden;">
                    <div class="friends-list" id="friendsListContainer">
                        <div style="text-align:center; margin-top:20px; color:rgba(255,255,255,0.5);">Cargando...</div>
                    </div>
                </div>
                
                <div class="friends-category" id="requestsListContainer" style="display:none; flex:1; overflow-y:auto; overflow-x:hidden;">
                    <div class="friends-list"></div>
                </div>
            </div>

            <div class="referral-box" style="margin-top:15px; padding:15px; background:rgba(255,255,255,0.02); border-radius:12px; text-align:center; border-top:1px solid rgba(255,255,255,0.05);">
                <h4 style="margin:0 0 10px 0; font-size:0.9rem; color:#a78bfa;"><i class="fas fa-gift"></i> Gana 3% de Comisi&oacute;n</h4>
                <p style="margin:0 0 15px 0; font-size:0.8rem; color:var(--text-secondary);">Invita a un amigo y gana cr&eacute;ditos.</p>
                <button class="btn btn-blue" id="copyReferralBtn" style="width:100%; font-size:0.8rem;">Copiar Link</button>
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
        
        if (cleanHref === 'perfil.html') {
            const isWishlistTab = window.location.search.includes('tab=wishlist') || window.location.hash === '#wishlist';
            if (item.label === 'Wishlist') {
                isActive = isWishlistTab ? 'active' : '';
            } else if (item.label === 'Biblioteca') {
                isActive = !isWishlistTab ? 'active' : '';
            }
        }

        dockLinksHtml += `
            <a href="javascript:void(0)" onclick="pageTransitionTo('${item.href}')" class="dock-item ${isActive}">
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
        document.querySelectorAll('.sidebar, .mobile-dock').forEach(e => {
            if (!e.classList.contains('left-sidebar') && !e.classList.contains('right-sidebar')) {
                e.remove();
            } else if (e.classList.contains('mobile-dock')) {
                e.remove();
            }
        });
        
        document.querySelectorAll('.sidebar.left-sidebar').forEach(e => e.remove());
        
        if (mainContent) {
            appContainer.insertAdjacentHTML('afterbegin', leftSidebarHtml);
        }
        
        document.body.insertAdjacentHTML('beforeend', dockHtml);
        
        // Dispatch event so friends.js knows DOM is ready
        window.dispatchEvent(new Event('sidebarLoaded'));
    }
}

// Intercept Links for Transitions
window.pageTransitionTo = function(href) {
    if (window.location.href.includes(href)) return;
    
    // Animate out based on current page
    const content = document.querySelector('.gsap-reveal') || document.querySelector('.content-scroll');
    if (content && window.gsap) {
        gsap.to(content, { y: 20, opacity: 0, duration: 0.3, ease: "power2.inOut", onComplete: () => {
            window.location.href = href;
        }});
    } else {
        window.location.href = href;
    }
};

// Global Page Load Animation
function animatePageIn() {
    const pageLoader = document.getElementById('page-loader');
    if (pageLoader) {
        pageLoader.classList.add('hidden');
        setTimeout(() => pageLoader.remove(), 500);
    }
    
    const content = document.querySelector('.gsap-reveal') || document.querySelector('.content-scroll');
    if (content && window.gsap) {
        // Different animation depending on page context
        let yOffset = 40;
        let scale = 1;
        if (window.location.pathname.includes('catalogo')) {
            yOffset = 0; scale = 0.95; // Zoom out effect for catalog
        } else if (window.location.pathname.includes('perfil')) {
            yOffset = -40; // Drop down effect for profile
        }
        
        gsap.fromTo(content, 
            { y: yOffset, scale: scale, opacity: 0 }, 
            { y: 0, scale: 1, opacity: 1, duration: 0.6, ease: "power3.out" }
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {
    injectNavigation();
    
    // Override nav links inside the sidebar to use transition
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            pageTransitionTo(link.getAttribute('href'));
        });
    });

    animatePageIn();
});
