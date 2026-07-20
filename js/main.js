import { auth, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { app } from './firebase-config.js';

const db = getFirestore(app);

// --- GSAP Animations (GooeyNav & Dock) ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const indicator = document.querySelector('.nav-indicator');
    
    // Set initial position
    if (navItems.length > 0 && indicator) {
        const activeItem = document.querySelector('.nav-item.active');
        if(activeItem) {
            indicator.style.top = `${activeItem.offsetTop}px`;
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add to clicked
            item.classList.add('active');
            // Move indicator
            if(indicator) {
                indicator.style.top = `${item.offsetTop}px`;
                createParticles(item.offsetTop + 22); // Center of the 45px icon
            }
        });
    });
}

function createParticles(yPos) {
    const sidebar = document.querySelector('.sidebar');
    if(!sidebar) return;
    
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '8px';
        particle.style.height = '8px';
        particle.style.background = 'var(--accent-primary)';
        particle.style.borderRadius = '50%';
        particle.style.left = '40px'; // center of sidebar
        particle.style.top = `${yPos}px`;
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '0';
        
        sidebar.appendChild(particle);
        
        // Math for particles
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

// --- Mobile Dock Magnetic Effect ---
function initMobileDock() {
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
        // We use hover in CSS, but can add touch events for mobile scaling if needed
        item.addEventListener('touchstart', () => {
            gsap.to(item, { scale: 1.2, y: -5, duration: 0.2 });
        });
        item.addEventListener('touchend', () => {
            gsap.to(item, { scale: 1, y: 0, duration: 0.2 });
        });
    });
}

import { app, db, auth, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs, limit, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initWishlistButtons } from './wishlist.js';

let currentUser = null;
let currentUserWishlist = [];

// ... (keep navigation functions intact, just updating the load logic)

// --- Auth Handling ---
const userProfileBtn = document.getElementById('user-profile-btn');
const userNameDisplay = document.getElementById('user-name');
const userAvatars = document.querySelectorAll('.user-avatar');

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
        console.error("Login Error:", error);
    }
}

if (userProfileBtn) {
    userProfileBtn.addEventListener('click', handleLogin);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if(userNameDisplay) {
            let displayName = user.displayName || user.email.split('@')[0];
            userNameDisplay.textContent = displayName.length > 10 ? displayName.substring(0, 10) + '...' : displayName;
        }
        userAvatars.forEach(img => {
            img.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=A182E8&color=fff`;
        });
        
        const uSnap = await getDoc(doc(db, 'users', user.uid));
        if(uSnap.exists()) {
            currentUserWishlist = uSnap.data().wishlist || [];
        }
    } else {
        currentUser = null;
        currentUserWishlist = [];
        if(userNameDisplay) userNameDisplay.textContent = 'Login';
        userAvatars.forEach(img => {
            img.src = `https://ui-avatars.com/api/?name=User&background=A182E8&color=fff`;
        });
    }
    
    // Only fetch index products if we are on index.html
    if (document.getElementById('products-container')) {
        loadIndexProducts();
    }
});

async function loadIndexProducts() {
    try {
        // 1. Fetch featured product
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
        
        // 2. Fetch recent products for horizontal carousel
        const qProds = query(collection(db, "products"), limit(6));
        const prodsSnap = await getDocs(qProds);
        
        const container = document.getElementById('products-container');
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
                    let count = (sd.credentialsPool || "").split('\n').filter(l => l.trim() !== "").length;
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
        
        // Animaciones
        gsap.from(".hero-banner", { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" });
        gsap.to(".product-card", { 
            opacity: 1,
            y: 0, 
            duration: 0.6, 
            stagger: 0.1, 
            ease: "power3.out",
            delay: 0.3
        });
        
    } catch(e) {
        console.error("Error loading products on index", e);
    }
}

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initMobileDock();
});
