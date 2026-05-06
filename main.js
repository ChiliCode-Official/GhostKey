// PWA Registration & Install Logic
let deferredPrompt;
const installBtn = document.getElementById('installApp');
const installSegment = document.getElementById('installSegment');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW Registered', reg))
            .catch(err => console.log('SW Error', err));
    });
}

// Check if running as PWA
const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if (isPWA && installSegment) {
    installSegment.style.display = 'none';
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installSegment && !isPWA) {
        installSegment.style.display = 'flex';
    }
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installSegment.style.display = 'none';
            }
            deferredPrompt = null;
        }
    });
}

// Existing Logic
document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. PERSISTENT CART LOGIC
    // -------------------------------------------------------------------------
    let cart = JSON.parse(localStorage.getItem('df_cart')) || [];

    // Global function to add to cart (accessible from HTML)
    window.addToCart = (productId) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            const existingItem = cart.find(item => item.id === productId && !item.calculated);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                // Enforce minimum amount if it exists
                const initialQty = product.minAmount || 1;
                cart.push({ ...product, quantity: initialQty });
            }
            saveCart();
            updateCartUI();
            openCart();
            showToast(`¡${product.name} añadido!`);
        }
    };

    window.addToCartCalculated = (productId, amount, totalPrice, unitName = '', mode = '') => {
        const product = products.find(p => p.id === productId);
        if (product) {
            // Enforce minimum amount for wholesale products
            const min = product.minAmount || 0;
            const finalAmount = amount < min ? min : amount;
            
            // Adjust price if amount was forced to min
            const finalPrice = amount < min ? (isPerThousand(product) ? (min * (product.price / 1000)) : (min * product.price)) : totalPrice;

            let displayName = mode ? `${finalAmount} ${unitName} (${mode})` : `${finalAmount} ${unitName}`;
            displayName = displayName.trim();
            const fullName = displayName ? `${product.name} - ${displayName}` : product.name;
            const newItem = {
                ...product,
                id: `${product.id}-${finalAmount}-${Date.now()}`,
                name: fullName,
                price: finalPrice,
                quantity: 1, // Calculated items are added as 1 "bundle"
                calculated: true,
                originalId: productId,
                amount: finalAmount
            };
            cart.push(newItem);
            saveCart();
            updateCartUI();
            openCart();
            showToast(`¡Añadido al carrito!`);
        }
    };

    // Helper to identify "per 1000" logic
    const isPerThousand = (p) => p.id === 90;

    window.removeFromCart = (productId) => {
        cart = cart.filter(item => item.id.toString() !== productId.toString());
        saveCart();
        updateCartUI();
    };

    window.updateQuantity = (productId, delta) => {
        const item = cart.find(item => item.id.toString() === productId.toString());
        if (item) {
            const minAllowed = item.minAmount || 1;
            
            if (delta < 0 && item.quantity <= minAllowed) {
                showToast(`El mínimo para este producto es ${minAllowed}`);
                return;
            }
            
            item.quantity += delta;
            
            if (item.quantity <= 0) {
                removeFromCart(productId);
            } else {
                saveCart();
                updateCartUI();
            }
        }
    };

    const saveCart = () => {
        localStorage.setItem('df_cart', JSON.stringify(cart));
    };

    // -------------------------------------------------------------------------
    // 2. DYNAMIC CART UI INJECTION (MATERIAL YOU)
    // -------------------------------------------------------------------------
    const injectCartUI = () => {
        const cartHTML = `
            <!-- Material FAB for Cart -->
            <button class="cart-toggle" id="cartToggle">
                <span class="material-symbols-rounded">shopping_cart</span>
                <span class="cart-count" id="cartCount">0</span>
            </button>

            <!-- Material 3 Cart Sidebar -->
            <div class="cart-sidebar" id="cartSidebar">
                <div class="cart-header">
                    <h3 style="font-weight:600;">Carrito</h3>
                    <button class="close-cart" id="closeCart">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div class="cart-items" id="cartItemsList">
                    <!-- Items injected here -->
                </div>
                <div class="cart-footer">
                    <div class="cart-total">
                        <span style="opacity: 0.7;">Total</span>
                        <span id="cartTotalValue">$0.00</span>
                    </div>
                    <button class="btn btn-primary" id="checkoutBtn" style="width:100%; padding: 16px;">
                        Finalizar compra
                    </button>
                </div>
            </div>

            <!-- Material Checkout Modal -->
            <div class="modal-overlay" id="checkoutModal">
                <div class="modal-content">
                    <button class="close-modal">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                    <h2 style="margin-bottom: 12px;">Finalizar pedido</h2>
                    <p style="color: var(--md-sys-color-on-surface-variant); margin-bottom: 24px;">Selecciona tu método de contacto preferido:</p>
                    
                    <div class="checkout-options" style="display: flex; flex-direction: column; gap: 12px;">
                        <div class="checkout-option" id="checkoutDiscord" style="display: flex; align-items: center; gap: 16px; padding: 20px; background: #e8f0fe; border-radius: 20px; cursor: pointer;">
                            <i class="fab fa-discord" style="font-size: 32px; color: #5865F2;"></i>
                            <div style="text-align: left;">
                                <h4 style="font-weight: 600;">Vía Discord (Recomendado)</h4>
                                <p style="font-size: 0.85rem; opacity: 0.8;">Soporte premium y entrega rápida.</p>
                            </div>
                        </div>
                        <div class="checkout-option" id="checkoutWhatsapp" style="display: flex; align-items: center; gap: 16px; padding: 20px; background: #e6f4ea; border-radius: 20px; cursor: pointer;">
                            <i class="fab fa-whatsapp" style="font-size: 32px; color: #25D366;"></i>
                            <div style="text-align: left;">
                                <h4 style="font-weight: 600;">Vía WhatsApp</h4>
                                <p style="font-size: 0.85rem; opacity: 0.8;">Atención directa y personalizada.</p>
                            </div>
                        </div>
                    </div>

                    <div id="discordMessage" class="discord-result" style="display:none; margin-top: 24px; text-align: left; background: var(--md-sys-color-primary-container); padding: 20px; border-radius: 20px;">
                        <p style="margin-bottom: 12px; font-weight: 500;">¡Copia este código y pégalo en el canal de tickets!</p>
                        <div class="copy-box" style="background: white; padding: 12px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border: 1px solid var(--md-sys-color-outline-variant);">
                            <code id="orderCode" style="font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;"></code>
                            <button onclick="copyOrder()" style="background: none; border: none; cursor: pointer; color: var(--google-blue);">
                                <span class="material-symbols-rounded">content_copy</span>
                            </button>
                        </div>
                        <a href="https://discord.gg/Aq3TjM4tJT" target="_blank" class="btn btn-primary" style="width: 100%;">Ir al Servidor</a>
                    </div>
                </div>
            </div>

            <!-- Material Snackbar (Toast) -->
            <div id="toast" class="snackbar"></div>
        `;

        const cartStyles = `
            <style>
                .cart-toggle {
                    position: fixed;
                    bottom: 110px;
                    left: 24px;
                    width: 56px;
                    height: 56px;
                    background: var(--md-sys-color-primary-container);
                    color: var(--md-sys-color-on-primary-container);
                    border: none;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--md-sys-elevation-2);
                    cursor: pointer;
                    z-index: 1999;
                    transition: all 0.2s;
                }
                @media (max-width: 768px) {
                    .cart-toggle { display: none !important; }
                }
                .cart-toggle:hover { transform: scale(1.05); box-shadow: var(--md-sys-elevation-3); }
                .cart-count {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: var(--google-red);
                    color: white;
                    min-width: 20px;
                    height: 20px;
                    border-radius: 10px;
                    font-size: 11px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                }
                .cart-sidebar {
                    position: fixed;
                    top: 0;
                    right: -400px;
                    width: 400px;
                    height: 100vh;
                    background: white;
                    z-index: 2000;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    box-shadow: var(--md-sys-elevation-3);
                }
                .cart-sidebar.open { right: 0; }
                .cart-header {
                    padding: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--md-sys-color-outline-variant);
                }
                .close-cart { background: none; border: none; cursor: pointer; color: var(--md-sys-color-on-surface-variant); }
                .cart-items { flex: 1; overflow-y: auto; padding: 24px; }
                .cart-item {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                    align-items: center;
                }
                .cart-item-info h4 { font-size: 0.95rem; margin-bottom: 4px; font-weight: 500; }
                .cart-item-info p { color: var(--google-blue); font-weight: 600; font-size: 0.9rem; }
                .qty-controls { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
                .qty-btn { 
                    width: 28px; height: 28px; border-radius: 14px; 
                    border: 1px solid var(--md-sys-color-outline-variant); 
                    background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
                }
                .cart-footer { padding: 24px; background: var(--md-sys-color-surface); border-top: 1px solid var(--md-sys-color-outline-variant); }
                .cart-total { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 1.25rem; font-weight: 600; }
                
                .modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); display: none; justify-content: center; align-items: center; z-index: 3000;
                }
                .modal-content {
                    background: white; padding: 32px; border-radius: 28px; max-width: 480px; width: 90%;
                    position: relative; text-align: center; box-shadow: var(--md-sys-elevation-3);
                }
                .close-modal { position: absolute; top: 16px; right: 16px; background: none; border: none; cursor: pointer; opacity: 0.6; }
                
                .snackbar {
                    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(100px);
                    background: #322f33; color: #f5eff4; padding: 14px 24px; border-radius: 12px;
                    font-size: 0.9rem; z-index: 4000; transition: transform 0.2s cubic-bezier(0, 0, 0.2, 1);
                    min-width: 300px; text-align: center;
                }
                .snackbar.show { transform: translateX(-50%) translateY(0); }

                @media (max-width: 576px) { .cart-sidebar { width: 100%; right: -100%; } }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', cartHTML);
        document.head.insertAdjacentHTML('beforeend', cartStyles);

        document.getElementById('cartToggle').addEventListener('click', openCart);
        document.getElementById('closeCart').addEventListener('click', closeCart);
        document.getElementById('checkoutBtn').addEventListener('click', showCheckoutModal);
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('checkoutModal').style.display = 'none';
        });

        document.getElementById('checkoutDiscord').addEventListener('click', processDiscordCheckout);
        document.getElementById('checkoutWhatsapp').addEventListener('click', processWhatsappCheckout);
    };

    window.openCart = () => document.getElementById('cartSidebar').classList.add('open');
    window.closeCart = () => document.getElementById('cartSidebar').classList.remove('open');

    const updateCartUI = () => {
        const count = cart.reduce((acc, item) => acc + item.quantity, 0);
        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        const cartCountEl = document.getElementById('cartCount');
        const navCartCountEl = document.getElementById('navCartCount');
        
        if (cartCountEl) cartCountEl.textContent = count;
        if (navCartCountEl) {
            navCartCountEl.textContent = count;
            navCartCountEl.style.display = count > 0 ? 'flex' : 'none';
        }

        const totalValueEl = document.getElementById('cartTotalValue');
        if (totalValueEl) totalValueEl.textContent = `$${total.toFixed(2)} MXN`;

        const list = document.getElementById('cartItemsList');
        if (cart.length === 0) {
            list.innerHTML = '<div style="text-align:center; margin-top:3rem; color:var(--md-sys-color-on-surface-variant);"><span class="material-symbols-rounded" style="font-size: 48px; opacity:0.3;">shopping_basket</span><p>Tu carrito está vacío</p></div>';
        } else {
            list.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div style="width: 48px; height: 48px; background: var(--md-sys-color-primary-container); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--google-blue);">
                         ${item.image ? `<img src="${item.image}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : `<span class="material-symbols-rounded">inventory_2</span>`}
                    </div>
                    <div class="cart-item-info" style="flex: 1;">
                        <h4>${item.name}</h4>
                        <p>$${item.price.toFixed(2)}</p>
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)"><span class="material-symbols-rounded" style="font-size:16px;">remove</span></button>
                            <span style="font-weight: 500;">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)"><span class="material-symbols-rounded" style="font-size:16px;">add</span></button>
                        </div>
                    </div>
                    <button onclick="removeFromCart('${item.id}')" style="background:none; border:none; color:var(--google-red); cursor:pointer;"><span class="material-symbols-rounded">delete</span></button>
                </div>
            `).join('') + `
                <div style="text-align: center; margin-top: 1rem;">
                    <button onclick="clearCart()" style="background:none; border:none; color:var(--md-sys-color-on-surface-variant); font-size: 0.75rem; cursor:pointer;">Limpiar todo</button>
                </div>
            `;
        }
    };

    window.clearCart = () => {
        cart = [];
        saveCart();
        updateCartUI();
        showToast("Carrito vaciado");
    };

    const showCheckoutModal = () => {
        if (cart.length === 0) {
            showToast("Agrega productos para continuar");
            return;
        }
        document.getElementById('checkoutModal').style.display = 'flex';
        document.getElementById('discordMessage').style.display = 'none';
    };

    const processDiscordCheckout = () => {
        const orderSummary = cart.map(item => `${item.name} (x${item.quantity})`).join(', ');
        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);
        const orderCode = `DF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        document.getElementById('orderCode').textContent = `[${orderSummary}] Total: $${total} MXN - ID: ${orderCode}`;
        document.getElementById('discordMessage').style.display = 'block';
    };

    const processWhatsappCheckout = () => {
        const orderSummary = cart.map(item => `- ${item.name} (x${item.quantity})`).join('\n');
        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const whatsappMsg = encodeURIComponent(`Hola Digital Footprint! 🚀\nMe gustaría adquirir:\n${orderSummary}\nTotal: $${total.toFixed(2)} MXN`);
        window.open(`https://wa.me/525574123521?text=${whatsappMsg}`, '_blank');
    };

    window.copyOrder = () => {
        const code = document.getElementById('orderCode').textContent;
        navigator.clipboard.writeText(code).then(() => {
            showToast("Código copiado");
        });
    };

    const showToast = (msg) => {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    // -------------------------------------------------------------------------
    // 3. CATALOG RENDERING (MATERIAL 3)
    // -------------------------------------------------------------------------
    const catalogGrid = document.getElementById('fullCatalog');
    if (catalogGrid && typeof products !== 'undefined') {
        const renderCatalog = (filter = 'all') => {
            const filteredProducts = filter === 'all'
                ? products
                : products.filter(p => p.category === filter);

            catalogGrid.innerHTML = filteredProducts.map(p => {
                let googleColorClass = 'card-fortnite';
                if (p.category.includes('streaming')) googleColorClass = 'card-streaming';
                if (p.category.includes('xbox') || p.category.includes('playstation')) googleColorClass = 'card-consoles';

                return `
                <div class="card ${googleColorClass} animate-reveal active" 
                     onclick="window.location.href='producto.html?id=${p.id}'" 
                     style="cursor: pointer;">
                    <div style="height: 160px; background: #f1f3f4; border-radius: 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                         ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover;">` : `<span class="material-symbols-rounded" style="font-size: 64px; opacity: 0.2;">inventory_2</span>`}
                         ${p.badge ? `<div style="position:absolute; top:12px; left:12px; background:white; padding:4px 12px; border-radius:100px; font-size:10px; font-weight:700; box-shadow:var(--md-sys-elevation-1);">${p.badge}</div>` : ''}
                    </div>
                    <h3 style="font-size: 1.1rem; margin-bottom: 8px;">${p.name}</h3>
                    <p style="font-size: 1.4rem; font-weight: 700; color: var(--google-blue); margin-bottom: 16px;">
                        ${p.type === 'selectable' ? `<small style="font-size: 0.8rem; font-weight: 400; opacity: 0.6;">Desde</small> $${p.variants[0].price.toFixed(2)}` : `$${p.price.toFixed(2)}`}
                        <small style="font-size: 0.8rem; font-weight: 400; opacity: 0.6;">MXN</small>
                    </p>
                    <div style="display: flex; gap: 8px; margin-top: auto;" onclick="event.stopPropagation()">
                        ${p.type === 'selectable' ? `
                            <button onclick="window.location.href='producto.html?id=${p.id}'" class="btn btn-primary" style="flex: 1; padding: 12px;">
                                <span class="material-symbols-rounded" style="font-size: 20px;">visibility</span>
                                Ver opciones
                            </button>
                        ` : `
                            <button onclick="addToCart(${p.id})" class="btn btn-primary" style="flex: 1; padding: 12px;">
                                <span class="material-symbols-rounded" style="font-size: 20px;">add_shopping_cart</span>
                                Añadir al carrito
                            </button>
                        `}
                    </div>
                </div>
            `}).join('');
        };

        // Simple filtering
        const mainFilters = document.querySelectorAll('.main-filters .btn');
        mainFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                const isAlreadyActive = btn.classList.contains('btn-secondary');
                const targetFilter = isAlreadyActive ? 'all' : btn.dataset.main;

                // Reset all to outline
                mainFilters.forEach(b => {
                    b.classList.remove('btn-secondary');
                    b.classList.add('btn-outline');
                });

                // If we didn't toggle off, set the new one to secondary
                if (!isAlreadyActive || targetFilter === 'all') {
                    const btnToActivate = targetFilter === 'all' 
                        ? document.querySelector('.main-filters .btn[data-main="all"]')
                        : btn;
                    
                    if (btnToActivate) {
                        btnToActivate.classList.remove('btn-outline');
                        btnToActivate.classList.add('btn-secondary');
                    }
                }

                renderCatalog(targetFilter);
            });
        });

        // Search Input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = products.filter(p => p.name.toLowerCase().includes(term));
                catalogGrid.innerHTML = filtered.map(p => `
                    <div class="card animate-reveal active" 
                         onclick="window.location.href='producto.html?id=${p.id}'" 
                         style="cursor: pointer;">
                        <div style="height: 120px; background: #f1f3f4; border-radius: 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center;">
                             ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">` : `<span class="material-symbols-rounded">inventory_2</span>`}
                        </div>
                        <h3>${p.name}</h3>
                        <p style="font-weight:700; color:var(--google-blue);">
                            ${p.type === 'selectable' ? `Desde $${p.variants[0].price.toFixed(2)}` : `$${p.price.toFixed(2)}`}
                        </p>
                        <div onclick="event.stopPropagation()">
                            ${p.type === 'selectable' ? `
                                <button onclick="window.location.href='producto.html?id=${p.id}'" class="btn btn-primary" style="width:100%; margin-top:12px; padding: 12px;">
                                    <span class="material-symbols-rounded" style="font-size: 20px;">visibility</span>
                                    Ver opciones
                                </button>
                            ` : `
                                <button onclick="addToCart(${p.id})" class="btn btn-primary" style="width:100%; margin-top:12px; padding: 12px;">
                                    <span class="material-symbols-rounded" style="font-size: 20px;">add_shopping_cart</span>
                                    Añadir
                                </button>
                            `}
                        </div>
                    </div>
                `).join('');
            });
        }

        renderCatalog('all');
    }

    // INITIALIZE
    injectCartUI();
    updateCartUI();
});
