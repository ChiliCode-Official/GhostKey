import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initWishlistButtons } from './wishlist.js';

const catalogGrid = document.getElementById('catalog-grid');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
let allProducts = [];
let stockData = {};
let currentUserWishlist = [];

async function fetchUserWishlist(uid) {
    try {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) {
            currentUserWishlist = userSnap.data().wishlist || [];
        }
    } catch(e) {
        console.error(e);
    }
}

async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        
        const stockSnapshot = await getDocs(collection(db, "products_stock"));
        stockData = {};
        stockSnapshot.forEach((doc) => {
            stockData[doc.id] = doc.data();
        });

        renderProducts(allProducts);
    } catch (e) {
        console.error("Error loading products: ", e);
        catalogGrid.innerHTML = `<p style="color:var(--danger)">Error al cargar el catálogo.</p>`;
    }
}

function renderProducts(products) {
    catalogGrid.innerHTML = '';
    
    if (products.length === 0) {
        catalogGrid.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1;">No hay productos que coincidan con la búsqueda.</p>`;
        return;
    }

    products.forEach((prod) => {
        let status = 'Agotado';
        let stockLabel = 'Agotado';
        let statusColor = 'var(--danger)';
        
        if (stockData && stockData[prod.id]) {
            const sd = stockData[prod.id];
            status = sd.status;
            if (status === 'disponible') {
                let pool = sd.credentialsPool || "";
                let count = pool.split('\n').filter(line => line.trim() !== "").length;
                stockLabel = count > 0 ? `En stock (${count})` : 'Agotado';
                statusColor = count > 0 ? 'var(--success)' : 'var(--danger)';
            } else if (status === 'bajo_pedido') {
                stockLabel = 'Bajo pedido';
                statusColor = 'var(--warning)';
            }
        }

        const card = document.createElement('a');
        card.href = `producto.html?id=${prod.id}`;
        card.className = 'product-card';
        card.style.opacity = 0;
        card.innerHTML = `
            <div class="product-img-wrapper">
                <span class="stock-badge" style="background:${statusColor}">${stockLabel}</span>
                <button class="wishlist-btn" data-id="${prod.id}"><i class="fa-solid fa-heart"></i></button>
                <img src="${prod.image || 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&w=400'}" alt="${prod.name}" class="product-img">
            </div>
            <h3 class="product-title">${prod.name}</h3>
            <p class="product-price">$${prod.price}</p>
        `;
        catalogGrid.appendChild(card);
    });

    initWishlistButtons(currentUserWishlist);

    gsap.to('.product-card', {
        opacity: 1,
        y: -10,
        duration: 0.5,
        stagger: 0.05,
        ease: "power2.out"
    });
}

function handleFilters() {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            applyFilters();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
}

function applyFilters() {
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = allProducts;
    
    if (activeFilter !== 'all') {
        filtered = filtered.filter(p => p.category === activeFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm));
    }
    
    renderProducts(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    handleFilters();
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await fetchUserWishlist(user.uid);
    } else {
        currentUserWishlist = [];
    }
    // Only load products after we know auth state so wishlist renders correctly
    loadProducts();
});
