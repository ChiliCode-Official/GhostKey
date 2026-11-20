import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { toggleWishlist } from './wishlist.js';
import { getGhostLoaderHTML } from './main.js';

const catalogGrid = document.getElementById('catalog-grid');
const resultsCount = document.getElementById('results-count');
const searchInput = document.getElementById('gk-nav-search');
const collectionSelect = document.getElementById('collection-select');
const priceSelect = document.getElementById('price-select');
const sortSelect = document.getElementById('sort-select');
const fallbackImage = 'img/ghost-logo.png';

let allProducts = [];
let stockByProduct = new Map();
let wishlist = new Set();
let cards = new Map();
let catalogReady = false;
let stockAvailable = true;
let loadVersion = 0;

async function fetchWishlist(user) {
    if (!user) return new Set();
    try {
        const snapshot = await getDoc(doc(db, 'users', user.uid));
        const entries = snapshot.data()?.wishlist;
        return new Set(Array.isArray(entries) ? entries : []);
    } catch (error) {
        console.warn('Error al consultar favoritos', error);
        return new Set();
    }
}

async function loadProducts(user) {
    const version = ++loadVersion;
    catalogReady = false;
    resultsCount.textContent = 'Cargando…';
    catalogGrid.setAttribute('aria-busy', 'true');
    catalogGrid.innerHTML = getGhostLoaderHTML('Cargando catálogo…');

    try {
        const [products, stock, saved] = await Promise.allSettled([
            getDocs(collection(db, 'products')),
            getDocs(collection(db, 'products_stock')),
            fetchWishlist(user)
        ]);
        if (version !== loadVersion) return;
        if (products.status === 'rejected') throw products.reason;

        stockAvailable = stock.status === 'fulfilled';
        stockByProduct = stockAvailable
            ? new Map(stock.value.docs.map(item => [item.id, item.data()]))
            : new Map();
        wishlist = saved.status === 'fulfilled' ? saved.value : new Set();
        allProducts = products.value.docs.map(item => {
            const product = { ...item.data(), id: item.id };
            return { ...product, ...getDisplayPrice(product) };
        });

        cards = new Map();
        catalogReady = true;
        applyFilters();
    } catch (error) {
        console.error('Error al cargar el catálogo', error);
        resultsCount.textContent = 'Catálogo no disponible';
        renderMessage('No se pudo cargar el catálogo.');
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'btn-secondary';
        retry.textContent = 'Volver a intentar';
        retry.addEventListener('click', () => loadProducts(auth.currentUser));
        catalogGrid.firstElementChild.append(' ', retry);
    } finally {
        if (version === loadVersion) catalogGrid.setAttribute('aria-busy', 'false');
    }
}

function getDisplayPrice(product) {
    const basePrice = Number(product.price) || 0;
    if (product.isStreaming && typeof product.streamingOptions === 'string') {
        const options = product.streamingOptions.split(',').map(option => option.trim()).filter(Boolean);
        if (options.some(option => option.includes(':'))) {
            const price = Math.min(...options.map(option => Number.parseFloat(option.split(':')[1]) || basePrice));
            return { displayPrice: `Desde $${price.toFixed(2)}`, effectivePrice: price };
        }
        if (basePrice === 0) return { displayPrice: '¡Gratis!', effectivePrice: 0 };
    }
    return { displayPrice: `$${basePrice.toFixed(2)}`, effectivePrice: basePrice };
}

function resolveImage(url) {
    try {
        const image = new URL(url, window.location.href);
        if (image.protocol !== 'https:' && image.protocol !== 'http:') return fallbackImage;
        if (image.hostname === 'imgur.com' || image.hostname === 'www.imgur.com') {
            const id = image.pathname.split('/').filter(Boolean).pop()?.split('.')[0];
            return id ? `https://i.imgur.com/${encodeURIComponent(id)}.png` : fallbackImage;
        }
        return image.href;
    } catch {
        return fallbackImage;
    }
}

function getStockBadge(productId) {
    if (!stockAvailable) return ['Stock sin confirmar', 'var(--warning)'];
    const stock = stockByProduct.get(productId);
    if (!stock || stock.status === 'bajo_pedido') return ['Bajo pedido', 'var(--warning)'];
    if (stock.status === 'disponible' && typeof stock.credentialsPool === 'string') {
        const count = stock.credentialsPool.split('\n').filter(line => line.trim()).length;
        if (count > 0) return [`En stock (${count})`, 'var(--success)'];
    }
    return ['Agotado', 'var(--danger)'];
}

function createCard(product) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
        <div class="card__content">
            <button class="wishlist-btn" type="button"><i class="fa-solid fa-heart" aria-hidden="true"></i></button>
            <img class="card__image" alt="" loading="lazy" decoding="async">
            <div class="card__details">
                <h2 class="card__title"><a class="catalog-product-link"></a></h2>
                <span class="card__badge"></span>
                <p class="card__price-large"></p>
            </div>
            <a class="card__quick-buy-btn" title="Comprar directamente"><i class="fa-solid fa-cart-plus" aria-hidden="true"></i></a>
        </div>`;

    const name = product.name || 'Producto';
    const href = `producto.html?id=${encodeURIComponent(product.id)}`;
    const badge = card.querySelector('.card__badge');
    const [stockLabel, statusColor] = getStockBadge(product.id);
    badge.textContent = stockLabel;
    badge.style.background = statusColor;
    const detailsLink = card.querySelector('.catalog-product-link');
    detailsLink.textContent = name;
    card.querySelector('.card__price-large').textContent = product.displayPrice;

    const image = card.querySelector('img');
    image.src = product.image ? resolveImage(product.image) : fallbackImage;
    image.addEventListener('error', () => { image.src = fallbackImage; }, { once: true });

    detailsLink.href = href;
    detailsLink.setAttribute('aria-label', `Ver producto: ${name}`);
    const quickBuy = card.querySelector('.card__quick-buy-btn');
    quickBuy.href = `${href}&action=buy`;
    quickBuy.setAttribute('aria-label', `Comprar directamente: ${name}`);

    const favorite = card.querySelector('.wishlist-btn');
    const selected = wishlist.has(product.id);
    favorite.classList.toggle('active', selected);
    favorite.setAttribute('aria-label', `Guardar en favoritos: ${name}`);
    favorite.setAttribute('aria-pressed', String(selected));
    favorite.addEventListener('click', async () => {
        favorite.disabled = true;
        try {
            await toggleWishlist(product.id, favorite);
            favorite.setAttribute('aria-pressed', String(favorite.classList.contains('active')));
        } finally {
            favorite.disabled = false;
        }
    });
    return card;
}

function renderMessage(message) {
    const element = document.createElement('p');
    element.className = 'catalog-message';
    element.textContent = message;
    catalogGrid.replaceChildren(element);
}

async function loadCollections() {
    try {
        const snapshot = await getDocs(collection(db, 'collections'));
        const options = snapshot.docs.map(item => new Option(item.data().name || item.id, item.id));
        collectionSelect.replaceChildren(new Option('Todas las colecciones', 'all'), ...options);
        syncCollection();
    } catch (error) {
        console.warn('Error al cargar las colecciones', error);
    }
}

function syncCollection() {
    const category = new URLSearchParams(window.location.search).get('cat');
    if (category && !Array.from(collectionSelect.options).some(option => option.value === category)) {
        collectionSelect.add(new Option('Colección seleccionada', category));
    }
    collectionSelect.value = category || 'all';
}

function syncSearch() {
    if (searchInput) searchInput.value = new URLSearchParams(window.location.search).get('search') || '';
}

function updateUrl(parameter, value, method) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(parameter, value);
    else url.searchParams.delete(parameter);
    if (url.href !== window.location.href) window.history[method]({}, '', url);
}

function normalizeSearch(value) {
    return String(value || '').trim().toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function applyFilters() {
    if (!catalogReady) return;
    const category = collectionSelect.value;
    const searchTerm = normalizeSearch(searchInput?.value);
    const priceRange = priceSelect.value;
    const filtered = allProducts.filter(product => {
        if (category !== 'all' && product.category !== category) return false;
        if (searchTerm && !normalizeSearch(product.name).includes(searchTerm)) return false;
        const price = product.effectivePrice;
        if (priceRange === 'under-100') return price < 100;
        if (priceRange === '100-500') return price >= 100 && price <= 500;
        if (priceRange === 'over-500') return price > 500;
        return true;
    });

    if (sortSelect.value === 'price-asc') filtered.sort((a, b) => a.effectivePrice - b.effectivePrice);
    if (sortSelect.value === 'price-desc') filtered.sort((a, b) => b.effectivePrice - a.effectivePrice);
    if (sortSelect.value === 'newest') {
        filtered.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    }

    resultsCount.textContent = filtered.length === 1 ? '1 resultado' : `${filtered.length} resultados`;
    if (!filtered.length) {
        renderMessage(allProducts.length ? 'No hay coincidencias. Prueba otra búsqueda o limpia los filtros.' : 'Todavía no hay productos en el catálogo.');
        return;
    }

    const fragment = document.createDocumentFragment();
    for (const product of filtered) {
        if (!cards.has(product.id)) cards.set(product.id, createCard(product));
        fragment.append(cards.get(product.id));
    }
    catalogGrid.replaceChildren(fragment);
}

syncCollection();
syncSearch();
loadCollections();

searchInput?.addEventListener('input', () => {
    updateUrl('search', searchInput.value.trim(), 'replaceState');
    applyFilters();
});
collectionSelect.addEventListener('change', () => {
    updateUrl('cat', collectionSelect.value === 'all' ? '' : collectionSelect.value, 'pushState');
    applyFilters();
});
priceSelect.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);
document.getElementById('catalog-filters').addEventListener('reset', event => {
    event.preventDefault();
    collectionSelect.value = 'all';
    priceSelect.value = 'all';
    sortSelect.value = 'default';
    if (searchInput) searchInput.value = '';
    const url = new URL(window.location.href);
    url.searchParams.delete('cat');
    url.searchParams.delete('search');
    if (url.href !== window.location.href) window.history.pushState({}, '', url);
    applyFilters();
});
window.addEventListener('popstate', () => {
    syncCollection();
    syncSearch();
    applyFilters();
});

setPersistence(auth, browserLocalPersistence).catch(console.error);
onAuthStateChanged(auth, loadProducts);
