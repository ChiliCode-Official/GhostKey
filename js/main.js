import { db, auth, provider } from './firebase-config.js';
import {
    signInWithPopup,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    limit,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initWishlistButtons } from './wishlist.js';

let currentUser = null;
let currentUserWishlist = [];

// --- GSAP Animations (GooeyNav & Dock) ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const indicator = document.querySelector('.nav-indicator');

    if (navItems.length > 0 && indicator) {
        const activeItem = document.querySelector('.nav-item.active');
        if (activeItem) {
            indicator.style.top = `${activeItem.offsetTop}px`;
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            if (indicator) {
                indicator.style.top = `${item.offsetTop}px`;
                createParticles(item.offsetTop + 22);
            }
        });
    });
}

function createParticles(yPos) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '8px';
        particle.style.height = '8px';
        particle.style.background = 'var(--accent-primary)';
        particle.style.borderRadius = '50%';
        particle.style.left = '40px';
        particle.style.top = `${yPos}px`;
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '0';

        sidebar.appendChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const velocity = 20 + Math.random() * 30;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        gsap.to(particle, {
            x: tx,
            y: ty,
            opacity: 0,
            duration: 0.6 + Math.random() * 0.4,
            ease: "power2.out",
            onComplete: () => particle.remove()
        });
    }
}

function initMobileDock() {
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
        item.addEventListener('touchstart', () => {
            gsap.to(item, { scale: 1.2, y: -5, duration: 0.2 });
        });
        item.addEventListener('touchend', () => {
            gsap.to(item, { scale: 1, y: 0, duration: 0.2 });
        });
    });
}

// --- Auth UI ---
const userProfileBtn = document.getElementById('user-profile-btn');
const userNameDisplay = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');

function setUserProfileLoading(isLoading) {
    if (!userProfileBtn) return;
    userProfileBtn.classList.toggle('user-profile--loading', isLoading);
    if (userNameDisplay) {
        userNameDisplay.classList.toggle('user-name--skeleton', isLoading);
        if (isLoading) userNameDisplay.textContent = '';
    }
    if (userAvatar) {
        userAvatar.classList.toggle('user-avatar--skeleton', isLoading);
        if (isLoading) {
            userAvatar.removeAttribute('src');
            userAvatar.alt = '';
        }
    }
}

function updateUserProfileUI(user) {
    if (!userProfileBtn) return;

    userProfileBtn.classList.remove('user-profile--loading');

    if (user) {
        if (userNameDisplay) {
            userNameDisplay.classList.remove('user-name--skeleton');
            const displayName = user.displayName || user.email.split('@')[0];
            userNameDisplay.textContent = displayName.length > 12
                ? `${displayName.substring(0, 12)}…`
                : displayName;
        }
        if (userAvatar) {
            userAvatar.classList.remove('user-avatar--skeleton');
            userAvatar.src = user.photoURL
                || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=A182E8&color=fff`;
            userAvatar.alt = user.displayName || user.email;
        }
        userProfileBtn.title = 'Ver perfil';
    } else {
        if (userNameDisplay) {
            userNameDisplay.classList.remove('user-name--skeleton');
            userNameDisplay.textContent = 'Iniciar sesión';
        }
        if (userAvatar) {
            userAvatar.classList.remove('user-avatar--skeleton');
            userAvatar.src = 'https://ui-avatars.com/api/?name=?&background=1C222E&color=9CA3AF';
            userAvatar.alt = 'Invitado';
        }
        userProfileBtn.title = 'Iniciar sesión con Google';
    }
}

async function handleLogin() {
    if (currentUser) {
        window.location.href = 'perfil.html';
        return;
    }

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                email: user.email,
                balance: 0,
                wishlist: [],
                referralCode: user.uid.substring(0, 8).toUpperCase(),
                referredBy: null
            });
        }
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            console.error("Login Error:", error);
        }
    }
}

if (userProfileBtn) {
    userProfileBtn.addEventListener('click', handleLogin);
}

setPersistence(auth, browserLocalPersistence).catch(console.error);

onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    updateUserProfileUI(user);

    if (user) {
        const uSnap = await getDoc(doc(db, 'users', user.uid));
        if (uSnap.exists()) {
            currentUserWishlist = uSnap.data().wishlist || [];
        } else {
            currentUserWishlist = [];
        }
    } else {
        currentUserWishlist = [];
    }

    if (document.getElementById('products-container')) {
        loadIndexProducts();
    }
});

function getGhostLoaderHTML(message = 'Cargando…') {
    return `
        <div class="loading-state">
            <div class="ghost-loader" aria-hidden="true">
                <div class="ghost-red">
                    <div class="ghost-pupil"></div>
                    <div class="ghost-pupil ghost-pupil1"></div>
                    <div class="ghost-eye"></div>
                    <div class="ghost-eye ghost-eye1"></div>
                    <div class="ghost-top0"></div>
                    <div class="ghost-top1"></div>
                    <div class="ghost-top2"></div>
                    <div class="ghost-top3"></div>
                    <div class="ghost-top4"></div>
                    <div class="ghost-st0"></div>
                    <div class="ghost-st1"></div>
                    <div class="ghost-st2"></div>
                    <div class="ghost-st3"></div>
                    <div class="ghost-st4"></div>
                    <div class="ghost-st5"></div>
                    <div class="ghost-an1"></div>
                    <div class="ghost-an2"></div>
                    <div class="ghost-an3"></div>
                    <div class="ghost-an4"></div>
                    <div class="ghost-an5"></div>
                    <div class="ghost-an6"></div>
                    <div class="ghost-an7"></div>
                    <div class="ghost-an8"></div>
                    <div class="ghost-an9"></div>
                    <div class="ghost-an10"></div>
                    <div class="ghost-an11"></div>
                    <div class="ghost-an12"></div>
                    <div class="ghost-an13"></div>
                    <div class="ghost-an14"></div>
                    <div class="ghost-an15"></div>
                    <div class="ghost-an16"></div>
                    <div class="ghost-an17"></div>
                    <div class="ghost-an18"></div>
                </div>
                <div class="ghost-shadow"></div>
            </div>
            <p class="loading-text">${message}</p>
        </div>
    `;
}

async function loadIndexProducts() {
    const container = document.getElementById('products-container');
    const heroSkeleton = document.getElementById('hero-skeleton');

    if (container) {
        container.innerHTML = getGhostLoaderHTML('Cargando productos…');
    }

    try {
        const qHero = query(collection(db, "products"), where("isFeatured", "==", true), limit(1));
        const heroSnap = await getDocs(qHero);

        if (!heroSnap.empty) {
            const heroProd = heroSnap.docs[0];
            const hData = heroProd.data();
            const banner = document.getElementById('hero-banner');
            banner.style.display = 'flex';
            banner.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.2)), url('${hData.image}')`;
            document.getElementById('hero-title').textContent = hData.name;
            document.getElementById('hero-price').textContent = `$${hData.price}`;
            document.getElementById('hero-buy-btn').href = `producto.html?id=${heroProd.id}`;
        }

        if (heroSkeleton) heroSkeleton.style.display = 'none';

        const qProds = query(collection(db, "products"), limit(6));
        const prodsSnap = await getDocs(qProds);

        container.innerHTML = '';

        const stockSnapshot = await getDocs(collection(db, "products_stock"));
        const stockData = {};
        stockSnapshot.forEach((d) => { stockData[d.id] = d.data(); });

        prodsSnap.forEach((d) => {
            const p = d.data();

            let statusColor = 'var(--danger)';
            let stockLabel = 'Agotado';
            if (stockData[d.id]) {
                const sd = stockData[d.id];
                if (sd.status === 'disponible') {
                    const count = (sd.credentialsPool || "").split('\n').filter(l => l.trim() !== "").length;
                    stockLabel = count > 0 ? `En stock (${count})` : 'Agotado';
                    statusColor = count > 0 ? 'var(--success)' : 'var(--danger)';
                } else if (sd.status === 'bajo_pedido') {
                    stockLabel = 'Bajo pedido';
                    statusColor = 'var(--warning)';
                }
            }

            container.innerHTML += `
                <a href="producto.html?id=${d.id}" class="product-card" style="opacity:0;">
                    <div class="product-img-wrapper">
                        <span class="stock-badge" style="background:${statusColor}">${stockLabel}</span>
                        <button class="wishlist-btn" data-id="${d.id}"><i class="fa-solid fa-heart"></i></button>
                        <img src="${p.image}" alt="${p.name}" class="product-img">
                    </div>
                    <h3 class="product-title">${p.name}</h3>
                    <p class="product-price">$${p.price}</p>
                </a>
            `;
        });

        initWishlistButtons(currentUserWishlist);

        gsap.from(".hero-banner", { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" });
        gsap.to(".product-card", {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power3.out",
            delay: 0.3
        });
    } catch (e) {
        console.error("Error loading products on index", e);
        if (heroSkeleton) heroSkeleton.style.display = 'none';
        if (container) {
            container.innerHTML = `<p style="color:var(--danger); width:100%; text-align:center; padding:2rem;">No se pudieron cargar los productos.</p>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initMobileDock();
    setUserProfileLoading(true);
});
