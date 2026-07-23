import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;
let cartItems = [];

function createCartModalHTML() {
    if (document.getElementById('cart-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'cart-modal';
    modal.className = 'cart-modal';
    modal.innerHTML = `
        <div class="cart-drawer">
            <div class="cart-header">
                <h3 style="display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-bag-shopping" style="color: var(--accent-primary);"></i> Tu Carrito / Wishlist
                </h3>
                <button id="close-cart-btn" class="btn-secondary" style="padding: 4px 10px; border-radius: 50%;">&times;</button>
            </div>
            <div class="cart-items-list" id="cart-items-container">
                <p style="color: var(--text-muted); text-align: center; margin-top: 2rem;">Cargando tu carrito...</p>
            </div>
            <div class="cart-footer">
                <div style="display:flex; justify-content:space-between; font-weight:700; font-size:1.1rem; margin-bottom:1rem;">
                    <span>Total Estimado:</span>
                    <span id="cart-total-price" style="color: var(--accent-primary);">$0.00</span>
                </div>
                <a href="catalogo.html" id="cart-checkout-btn" class="btn-primary" style="display:block; text-align:center; padding:12px;">Explorar Productos</a>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-cart-btn')?.addEventListener('click', closeCart);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCart();
    });
}

export function openCart() {
    createCartModalHTML();
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.add('active');
        loadCartContent();
    }
}

export function closeCart() {
    const modal = document.getElementById('cart-modal');
    if (modal) modal.classList.remove('active');
}

async function loadCartContent() {
    const container = document.getElementById('cart-items-container');
    const totalPriceEl = document.getElementById('cart-total-price');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fa-solid fa-user-slash" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                <p>Inicia sesión para sincronizar tus artículos guardados y carrito.</p>
            </div>
        `;
        if (totalPriceEl) totalPriceEl.textContent = '$0.00';
        return;
    }

    try {
        const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const wishlistIds = (uSnap.exists() && uSnap.data().wishlist) ? uSnap.data().wishlist : [];

        if (wishlistIds.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fa-solid fa-basket-shopping" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                    <p>Tu carrito/wishlist está vacío.</p>
                </div>
            `;
            if (totalPriceEl) totalPriceEl.textContent = '$0.00';
            return;
        }

        container.innerHTML = '';
        let totalSum = 0;

        for (const pid of wishlistIds) {
            const pSnap = await getDoc(doc(db, 'products', pid));
            if (pSnap.exists()) {
                const p = pSnap.data();
                totalSum += (p.price || 0);

                const itemDiv = document.createElement('div');
                itemDiv.className = 'cart-item';
                itemDiv.innerHTML = `
                    <img src="${p.image || 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&w=100'}" class="cart-item-img">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${escapeHtml(p.name)}</div>
                        <div class="cart-item-price">$${p.price}</div>
                    </div>
                    <a href="producto.html?id=${pid}" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;">Ver</a>
                `;
                container.appendChild(itemDiv);
            }
        }

        if (totalPriceEl) totalPriceEl.textContent = `$${totalSum.toFixed(2)}`;

    } catch (err) {
        console.error("Error loading cart:", err);
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
    });

    // Global listener for bag/cart icons across all pages
    document.querySelectorAll('.fa-bag-shopping, .fa-shopping-bag, .action-btn i.fa-bag-shopping').forEach(icon => {
        const btn = icon.closest('button, a');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openCart();
            });
        }
    });
});
