import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    // 1. GSAP Animations with container scroller fix
    gsap.registerPlugin(ScrollTrigger);

    // Initial reveal for elements (watching .content-scroll)
    
    // BlurText utility using GSAP
    const applyBlurText = (selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            const text = el.innerText;
            const words = text.split(' ');
            el.innerHTML = '';
            words.forEach((word, i) => {
                const span = document.createElement('span');
                span.innerText = word + (i < words.length - 1 ? '\u00A0' : '');
                span.style.display = 'inline-block';
                span.style.filter = 'blur(10px)';
                span.style.opacity = '0';
                span.style.transform = 'translateY(-20px)';
                el.appendChild(span);
            });

            gsap.to(el.querySelectorAll('span'), {
                scrollTrigger: {
                    trigger: el,
                    scroller: ".content-scroll",
                    start: "top 90%",
                    toggleActions: "play none none none"
                },
                filter: 'blur(0px)',
                opacity: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: "power3.out"
            });
        });
    };
    applyBlurText('.blur-text');

    gsap.utils.toArray('.gsap-reveal').forEach(elem => {
        gsap.to(elem, {
            scrollTrigger: {
                trigger: elem,
                scroller: ".content-scroll", // FIX: Watch the scroll container, not the window!
                start: "top 85%",
                toggleActions: "play none none reverse"
            },
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out"
        });
    });

    // 2. Render Products in Index
    const featuredContainer = document.getElementById('featuredProducts');
    const mayoreoContainer = document.getElementById('mayoreoProducts');

    const renderProducts = async () => {
        if (typeof products === 'undefined') return;

        // Fetch stock status from Firestore
        let stockMap = {};
        try {
            const stockSnap = await getDocs(collection(db, "products_stock"));
            stockSnap.forEach(docSnap => {
                stockMap[docSnap.data().productId] = docSnap.data();
            });
        } catch(e) {
            console.error("Firestore offline or configuration issue:", e);
        }

        const renderProductCard = (product) => {
            const prodStock = stockMap[product.id] || { status: 'disponible' };
            
            let badgeClass = 'stock-disponible';
            let label = 'Disponible';
            let isDisabled = false;

            if (prodStock.status === 'bajo_pedido') {
                badgeClass = 'stock-bajo-pedido';
                label = 'Bajo pedido';
            } else if (prodStock.status === 'agotado') {
                badgeClass = 'stock-agotado';
                label = 'Agotado';
                isDisabled = true;
            }

            const badgeHtml = `<div class="product-badge stock-badge ${badgeClass}">${label}</div>`;
            
            return `
                <div class="product-card" onclick="window.location.href='producto.html?id=${product.id}'" style="${isDisabled ? 'opacity: 0.7;' : ''}">
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.name}">
                        ${badgeHtml}
                    </div>
                    <div class="product-info">
                        <h4 class="product-title">${product.name}</h4>
                        <p class="product-desc">${product.description}</p>
                        <div class="product-footer">
                            <div class="price-box">
                                <span class="price-tag">MXN</span>
                                <span class="price">$${product.price.toFixed(2)}</span>
                            </div>
                            <button class="buy-btn" ${isDisabled ? 'disabled' : ''}><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                </div>
            `;
        };

        if (featuredContainer) {
            const featured = products.filter(p => p.category === 'vbucks' || p.category === 'crew').slice(0, 4);
            featuredContainer.innerHTML = featured.map(renderProductCard).join('');
        }

        if (mayoreoContainer) {
            const mayoreo = products.filter(p => p.category === 'mayoreo').slice(0, 4);
            mayoreoContainer.innerHTML = mayoreo.map(renderProductCard).join('');
        }

        // Trigger ScrollTrigger refresh since we just dynamically added elements
        ScrollTrigger.refresh();
    };

    renderProducts();

    // 3. Carousel Logic (Simple click rotation)
    const cards = document.querySelectorAll('.carousel-card');
    if (cards.length === 3) {
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const clickedPos = card.getAttribute('data-pos');
                if (clickedPos === 'center') return; // Already center

                let currentCenter, currentLeft, currentRight;
                cards.forEach(c => {
                    const p = c.getAttribute('data-pos');
                    if (p === 'center') currentCenter = c;
                    if (p === 'left') currentLeft = c;
                    if (p === 'right') currentRight = c;
                });

                if (clickedPos === 'left') {
                    currentLeft.setAttribute('data-pos', 'center');
                    currentCenter.setAttribute('data-pos', 'right');
                    currentRight.setAttribute('data-pos', 'left');
                } else if (clickedPos === 'right') {
                    currentRight.setAttribute('data-pos', 'center');
                    currentCenter.setAttribute('data-pos', 'left');
                    currentLeft.setAttribute('data-pos', 'right');
                }
            });
        });
    }

    // 4. Update Profile Info in Topbar (Firebase)
    onAuthStateChanged(auth, async (user) => {
        const userNameElem = document.querySelector('.user-name');
        const userLinkElem = document.querySelector('.user-link');
        const cartBadge = document.getElementById('cartBadge');

        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (userNameElem) userNameElem.textContent = data.username;
                if (userLinkElem) {
                    userLinkElem.textContent = `$${data.balance.toFixed(2)} MXN`;
                    userLinkElem.href = 'perfil.html';
                }
            }
        } else {
            if (userNameElem) userNameElem.textContent = "Invitado";
            if (userLinkElem) {
                userLinkElem.textContent = "Ingresar";
                userLinkElem.href = 'perfil.html';
            }
        }
    });
});
