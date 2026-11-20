import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, getDocs, collection, serverTimestamp, runTransaction, updateDoc, arrayUnion, arrayRemove, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { updateCartBadge } from './cart.js';
import { sendNotification } from './notifications.js';


function normalizeImageUrl(url) {
    if (!url) return '';
    let clean = String(url).trim();
    if (clean.includes('imgur.com') && !clean.includes('i.imgur.com')) {
        const id = clean.split('/').pop().split('.')[0];
        return `https://i.imgur.com/${id}.png`;
    }
    return clean;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

const pImage = document.getElementById('p-image');
const pTitle = document.getElementById('p-title');
const pDesc = document.getElementById('p-desc');
const pBadge = document.getElementById('p-badge');
const pPrice = document.getElementById('p-price');
const buyPanel = document.getElementById('product-buy-panel');
const reviewsSection = document.getElementById('product-reviews');
const streamSelect = document.getElementById('streaming-duration-select');
const shareBtn = document.getElementById('btn-share-product');
const backLink = document.getElementById('back-to-catalog');
const previousPage = document.referrer ? new URL(document.referrer) : null;

if (backLink && previousPage?.origin === window.location.origin && previousPage.pathname.split('/').pop() === 'catalogo.html') {
    backLink.href = previousPage.href;
}

const authMsg = document.getElementById('auth-state-message');
const buyControls = document.getElementById('buy-controls');
const userBalanceDisplay = document.getElementById('user-current-balance');
const btnBuy = document.getElementById('buy-btn');
const buyError = document.getElementById('buy-error');

const btnGift = document.getElementById('btn-toggle-gift');
const giftInputs = document.getElementById('gift-section');
const giftEmail = document.getElementById('gift-email');

let productData = null;
let stockData = null;
let currentUser = null;
let userDocData = null;
let isGiftMode = false;
let currentQty = 1;

function isFollowersProduct() {
    return productData?.pricingModel === 'instagram_followers' || /seguidores de instagram/i.test(productData?.name || '');
}

function getProductTotal() {
    if (!productData) return 0;
    if (isFollowersProduct()) {
        const qty = Math.max(0, Math.floor((Number(currentQty) || 0) / 100) * 100);
        if (qty < 300) return 0;
        if (qty <= 1000) return Number((25 + ((qty - 300) / 700) * 22).toFixed(2));
        return Number((47 + ((qty - 1000) / 1000) * 40).toFixed(2));
    }
    return (Number(productData.price) || 0) * currentQty;
}

if (btnGift) {
    btnGift.addEventListener('click', () => {
        if (!currentUser) {
            buyError.style.display = 'block';
            buyError.textContent = "Debes iniciar sesión para regalar este producto.";
            return;
        }
        const multiModal = document.getElementById('gift-multi-modal');
        if (multiModal) {
            document.getElementById('gift-step-1').style.display = 'block';
            document.getElementById('gift-step-2').style.display = 'none';
            document.getElementById('gift-step-3').style.display = 'none';
            multiModal.classList.add('active');
            
            // Set price in step 2 early
            const totalPrice = productData.price * currentQty;
            const confirmName = document.getElementById('gift-confirm-product-name');
            const confirmPrice = document.getElementById('gift-confirm-price');
            if (confirmName) confirmName.textContent = productData.name;
            if (confirmPrice) confirmPrice.textContent = `$${totalPrice.toFixed(2)} MXN`;

            // Load friends list into the modal
            loadFriendsInGiftModal();
        }
    });
}


async function loadProductDetails() {
    if (!productId) {
        showUnavailableProduct('Producto no especificado', 'Selecciona un producto en el catálogo.');
        return;
    }

    try {
        const pRef = doc(db, 'products', productId);
        const pSnap = await getDoc(pRef);

        if (!pSnap.exists()) {
            showUnavailableProduct("Producto no encontrado", "Este producto ya no está disponible en el catálogo.");
            return;
        }

        productData = { id: pSnap.id, ...pSnap.data() };
        currentQty = Number(productData.minQuantity) || 1;

        if (pImage) {
            const fallbackImg = 'img/ghost-logo.png';
            pImage.addEventListener('error', () => { pImage.src = fallbackImg; }, { once: true });
            pImage.src = normalizeImageUrl(productData.image) || fallbackImg;
        }
        if (pTitle) pTitle.textContent = productData.name || 'Producto';
        if (pDesc) pDesc.textContent = productData.description || 'Sin descripción disponible.';
        if (buyPanel) buyPanel.hidden = false;
        if (reviewsSection) reviewsSection.hidden = false;
        if (shareBtn) shareBtn.disabled = false;

        const streamContainer = document.getElementById('streaming-options-container');
        if (streamContainer && streamSelect) {
            if (productData.isStreaming && productData.streamingOptions) {
                streamContainer.style.display = 'block';
                streamSelect.innerHTML = '<option value="">Selecciona una opción</option>';
                const opts = productData.streamingOptions.split(',').map(o => o.trim()).filter(o => o);
                let minPrice = Infinity;
                opts.forEach(o => {
                    const opt = document.createElement('option');
                    let optName = o;
                    let optPrice = parseFloat(productData.price || 0);
                    
                    if (o.includes(':')) {
                        const parts = o.split(':');
                        optName = parts[0].trim();
                        optPrice = parseFloat(parts[1].trim()) || optPrice;
                    }
                    
                    if (optPrice < minPrice) minPrice = optPrice;

                    opt.value = optName;
                    opt.textContent = o.includes(':') ? `${optName} - $${optPrice.toFixed(2)}` : optName;
                    opt.setAttribute('data-price', optPrice);
                    streamSelect.appendChild(opt);
                });

                if (opts.some(option => option.includes(':')) && Number.isFinite(minPrice)) {
                    streamSelect.dataset.startingPrice = String(minPrice);
                }
                streamSelect.addEventListener('change', updateQtyUI);
            } else {
                streamContainer.style.display = 'none';
            }
        }

        updateQtyUI();

        // Check product stock status
        try {
            const sRef = doc(db, 'products_stock', productId);
            const sSnap = await getDoc(sRef);
            if (sSnap.exists()) {
                const sData = sSnap.data();
                if (sData.status === 'disponible') {
                    const pool = sData.credentialsPool || "";
                    const count = pool.split('\n').filter(line => line.trim() !== "").length;
                    if (pBadge) {
                        pBadge.textContent = count > 0 ? `En stock (${count})` : 'Agotado';
                        pBadge.style.background = count > 0 ? 'var(--success)' : 'var(--danger)';
                    }
                } else if (sData.status === 'bajo_pedido') {
                    if (pBadge) {
                        pBadge.textContent = 'Bajo pedido';
                        pBadge.style.background = 'var(--warning)';
                    }
                } else {
                    if (pBadge) {
                        pBadge.textContent = 'Agotado';
                        pBadge.style.background = 'var(--danger)';
                    }
                }
            } else {
                if (pBadge) {
                    pBadge.textContent = 'Bajo pedido';
                    pBadge.style.background = 'var(--warning)';
                }
            }
        } catch (e) {
            console.error('Error fetching stock:', e);
            if (pBadge) pBadge.textContent = 'Stock sin confirmar';
        }

        let focusQuickBuy = urlParams.get('action') === 'buy';
        setPersistence(auth, browserLocalPersistence).catch(console.error);
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            if (authMsg) authMsg.hidden = Boolean(user);
            if (buyControls) buyControls.style.display = user ? 'flex' : 'none';

            if (focusQuickBuy) {
                focusQuickBuy = false;
                const target = user ? btnBuy : authMsg;
                target?.focus({ preventScroll: true });
                target?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                    block: 'center'
                });
                target?.classList.add('pulse-highlight');
            }

            if (!user) return;
            if (userBalanceDisplay) userBalanceDisplay.textContent = 'Consultando…';
            try {
                const uSnap = await getDoc(doc(db, 'users', user.uid));
                if (currentUser?.uid !== user.uid) return;
                const balance = Number(uSnap.data()?.balance) || 0;
                if (userBalanceDisplay) userBalanceDisplay.textContent = `$${balance.toFixed(2)} MXN`;
            } catch (error) {
                console.error('Error fetching user balance:', error);
                if (currentUser?.uid === user.uid && userBalanceDisplay) userBalanceDisplay.textContent = 'No disponible';
            }
        });

        authMsg?.addEventListener('click', () => {
            document.getElementById('user-profile-btn')?.click();
        });

        // Load reviews
        loadProductReviews(productId);

    } catch (err) {
        console.error("Error loading product details:", err);
        showUnavailableProduct('No se pudo cargar el producto', 'Recarga la página o vuelve al catálogo.');
    }
}

function showUnavailableProduct(title, description) {
    if (pTitle) pTitle.textContent = title;
    if (pDesc) pDesc.textContent = description;
    if (pImage) pImage.hidden = true;
    if (buyPanel) buyPanel.hidden = true;
    if (reviewsSection) reviewsSection.hidden = true;
    if (shareBtn) shareBtn.disabled = true;
}

async function loadFriendsInGiftModal() {
    if (!currentUser) return;
    const container = document.getElementById('gift-friends-list');
    if (!container) return;
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;">Cargando... amigos...</p>';

    try {
        const { query, collection: firestoreCol, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        
        const [snap1, snap2] = await Promise.all([
            getDocs(query(firestoreCol(db, 'friendships'), where('uid1', '==', currentUser.uid))),
            getDocs(query(firestoreCol(db, 'friendships'), where('uid2', '==', currentUser.uid)))
        ]);

        const friends = [];
        const allDocs = [...snap1.docs, ...snap2.docs];
        
        for (const docSnap of allDocs) {
            const data = docSnap.data();
            if (data.status === 'aceptada') {
                const friendUid = (data.uid1 === currentUser.uid) ? data.uid2 : data.uid1;
                const fallbackEmail = (data.uid1 === currentUser.uid) ? data.recipientEmail : data.requesterEmail;
                friends.push({ uid: friendUid, email: fallbackEmail });
            }
        }

        if (friends.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;">Aún no tienes amigos agregados.<br>Ingresa su correo abajo.</p>';
            return;
        }

        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.75rem;margin-bottom:8px;font-weight:600;">Selecciona un amigo:</p>';
        for (const item of friends) {
            const email = item.email || 'Amigo';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.style.cssText = 'width:100%;display:flex;align-items:center;gap:10px;background:var(--bg-main);border:1px solid var(--glass-border);border-radius:8px;padding:8px 10px;cursor:pointer;color:var(--text-main);font-family:inherit;font-size:0.85rem;transition:border-color 0.2s;margin-bottom:6px;';
            btn.innerHTML = `<i class="fa-solid fa-user" style="color:var(--accent-primary);"></i> <span>${escapeHtml(email)}</span>`;
            btn.onclick = () => {
                const emailInput = document.getElementById('gift-email-input-modal');
                if (emailInput) {
                    emailInput.value = email;
                    emailInput.style.borderColor = 'var(--accent-primary)';
                    setTimeout(() => emailInput.style.borderColor = 'var(--glass-border)', 1000);
                }
            };
            container.appendChild(btn);
        }
    } catch(e) {
        console.error('Error loading friends in gift modal:', e);
        container.innerHTML = '<p style="color:var(--danger);font-size:0.82rem;text-align:center;">Error al cargar amigos.</p>';
    }
}

const btnNext1 = document.getElementById('btn-gift-next-1');
    const btnConfirmBuy = document.getElementById('btn-gift-confirm-buy');
    let pendingGiftEmail = '';

    if (btnNext1) {
        btnNext1.addEventListener('click', () => {
            const emailInput = document.getElementById('gift-email-input-modal');
            const errEl = document.getElementById('gift-modal-error');
            pendingGiftEmail = emailInput ? emailInput.value.trim() : '';

            if (!pendingGiftEmail) {
                if (errEl) {
                    errEl.textContent = 'Ingresa el correo del amigo.';
                    errEl.style.display = 'block';
                }
                return;
            }
            if (errEl) errEl.style.display = 'none';

            // Determine price
            let unitPrice = parseFloat(productData.price) || 0;
            let selectedDuration = '';
            if (productData.isStreaming) {
                const sSelect = document.getElementById('streaming-duration-select');
                if (sSelect && sSelect.value) {
                    selectedDuration = sSelect.value;
                    const selectedOpt = sSelect.options[sSelect.selectedIndex];
                    if (selectedOpt) {
                        const priceAttr = parseFloat(selectedOpt.getAttribute('data-price'));
                        if (!isNaN(priceAttr)) unitPrice = priceAttr;
                    }
                }
            }
            const totalPrice = isFollowersProduct() ? getProductTotal() : unitPrice * currentQty;

            document.getElementById('gift-step-1').style.display = 'none';
            document.getElementById('gift-step-2').style.display = 'block';

            document.getElementById('gift-confirm-product-name').textContent = `${currentQty}x ${productData.name}`;
            document.getElementById('gift-confirm-email').textContent = pendingGiftEmail;
            document.getElementById('gift-confirm-price').textContent = `$${totalPrice.toFixed(2)} MXN`;
        });
    }

    if (btnConfirmBuy) {
        btnConfirmBuy.addEventListener('click', async () => {
            let unitPrice = parseFloat(productData.price) || 0;
            let selectedDuration = '';
            if (productData.isStreaming) {
                const sSelect = document.getElementById('streaming-duration-select');
                if (sSelect && sSelect.value) {
                    selectedDuration = sSelect.value;
                    const selectedOpt = sSelect.options[sSelect.selectedIndex];
                    if (selectedOpt) {
                        const priceAttr = parseFloat(selectedOpt.getAttribute('data-price'));
                        if (!isNaN(priceAttr)) unitPrice = priceAttr;
                    }
                }
            }
            const totalPrice = isFollowersProduct() ? getProductTotal() : unitPrice * currentQty;
            const customerNotes = document.getElementById('customer-notes-input')?.value.trim() || '';

            // Check Balance
            if (userDocData && userDocData.balance < totalPrice) {
                window.location.href = `pago.html?from=product&amount=${totalPrice}&isGift=true&giftEmail=${encodeURIComponent(pendingGiftEmail)}&productId=${productId}&qty=${currentQty}&duration=${encodeURIComponent(selectedDuration)}&notes=${encodeURIComponent(customerNotes)}`;
                return;
            }

            // Perform transaction if enough balance
            btnConfirmBuy.disabled = true;
            btnConfirmBuy.textContent = "Procesando...";

            try {
                await runTransaction(db, async (transaction) => {
                    const userRef = doc(db, 'users', currentUser.uid);
                    const uSnap = await transaction.get(userRef);
                    if (!uSnap.exists()) throw "El usuario no existe!";
                    const currentBal = uSnap.data().balance || 0;

                    // --- REPAIR: Fetch referrer before any writes ---
                    let referrerSnap = null;
                    let referrerRef = null;
                    const referredBy = uSnap.data().referredBy;
                    if (referredBy) {
                        referrerRef = doc(db, 'users', referredBy);
                        referrerSnap = await transaction.get(referrerRef);
                    }

                    
                    if (currentBal < totalPrice) throw "Saldo insuficiente.";

                    let credsToGive = [];
                    const stockRef = doc(db, 'products_stock', productId);
                    const sSnap = await transaction.get(stockRef);
                    
                    if (sSnap.exists() && sSnap.data().status === 'disponible') {
                        let pool = (sSnap.data().credentialsPool || "").split('\n').filter(l => l.trim() !== "");
                        if (pool.length < currentQty) throw "Stock insuficiente.";
                        credsToGive = pool.splice(0, currentQty);
                        transaction.update(stockRef, { credentialsPool: pool.join('\n') });
                    }

                    const newBalance = uSnap.data().balance - totalPrice;
                    transaction.update(userRef, { balance: newBalance });
                    
                    if (referrerSnap && referrerSnap.exists()) {
                        const rData = referrerSnap.data();
                        const bonus = totalPrice * 0.03;
                        transaction.update(referrerRef, { balance: (rData.balance || 0) + bonus });
                    }
                    
                    const newOrderRef = doc(collection(db, 'orders'));
                    const orderPayload = {
                        uid: currentUser.uid,
                        userEmail: currentUser.email,
                        productId: productId,
                        productName: productData.name,
                        price: totalPrice,
                        quantity: currentQty,
                        status: (sSnap.exists() && sSnap.data().status === 'disponible') ? 'entregado' : 'pendiente',
                        isGift: true,
                        giftRecipient: pendingGiftEmail,
                        textDelivered: (sSnap.exists() && sSnap.data().status === 'disponible') ? credsToGive.join('\n') : 'Pendiente',
                        timestamp: serverTimestamp()
                    };
                    if (typeof selectedDuration !== 'undefined' && selectedDuration) {
                        orderPayload.streamingDuration = selectedDuration;
                    }
                    if (customerNotes) {
                        orderPayload.customerNotes = customerNotes;
                    }
                    transaction.set(newOrderRef, orderPayload);
                });
                
                // Send notification to recipient email
                sendNotification(null, "¡Tienes un regalo! 🎁", `Alguien te ha regalado ${productData.name}`, 'regalo', pendingGiftEmail);

                // Show Astronaut Animation
                document.getElementById('gift-step-2').style.display = 'none';
                document.getElementById('gift-step-3').style.display = 'block';

                const shareBtn = document.getElementById('share-whatsapp-btn');
                if (shareBtn) {
                    shareBtn.onclick = (e) => {
                        e.preventDefault();
                        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                        const siteUrl = `${window.location.origin}${basePath}`;
                        const message = `¡Hola! 🎁 Te acabo de regalar *${productData.name}* en GhostKey.

¡Nos esforzaremos al máximo para que lo recibas super rápido! 🚀✨

Visita GhostKey para ver tus regalos: ${siteUrl}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
                    };
                }

            } catch (e) {
                console.error(e);
                alert("Error: " + String(e));
                btnConfirmBuy.disabled = false;
                btnConfirmBuy.textContent = "Confirmar Regalo";
            }
        });
    }

    if (btnBuy) {
        btnBuy.addEventListener('click', async () => {
            if (navigator.vibrate) navigator.vibrate(200);
            if (!currentUser) {
                alert("Debes iniciar sesión para comprar.");
                return;
            }
            if (isNaN(currentQty) || currentQty <= 0 || !Number.isFinite(currentQty)) {
                alert("Cantidad inválida.");
                return;
            }
            let unitPrice = parseFloat(productData.price) || 0;
            let selectedDuration = '';
            if (productData.isStreaming) {
                const sSelect = document.getElementById('streaming-duration-select');
                if (!sSelect || !sSelect.value) {
                    alert("Por favor, selecciona una duración de suscripción.");
                    return;
                }
                selectedDuration = sSelect.value;
                const selectedOpt = sSelect.options[sSelect.selectedIndex];
                if (selectedOpt) {
                    const priceAttr = parseFloat(selectedOpt.getAttribute('data-price'));
                    if (!isNaN(priceAttr)) unitPrice = priceAttr;
                }
            }
            const totalPrice = isFollowersProduct() ? getProductTotal() : unitPrice * currentQty;
            const customerNotes = document.getElementById('customer-notes-input')?.value.trim() || '';

            // Check Balance
            if (userDocData && userDocData.balance < totalPrice) {
                window.location.href = `pago.html?from=product&amount=${totalPrice}&productId=${productId}&qty=${currentQty}&duration=${encodeURIComponent(selectedDuration)}&notes=${encodeURIComponent(customerNotes)}`;
                return;
            }

            const confirmMsg = selectedDuration ? 
                `¿Confirmar compra de ${currentQty}x ${productData.name} (${selectedDuration}) por $${totalPrice.toFixed(2)} MXN?` :
                `¿Confirmar compra de ${currentQty}x ${productData.name} por $${totalPrice.toFixed(2)} MXN?`;
                
            if (!confirm(confirmMsg)) {
                return;
            }

            btnBuy.disabled = true;
            btnBuy.textContent = "Procesando...";

            try {
                await runTransaction(db, async (transaction) => {
                    const userRef = doc(db, 'users', currentUser.uid);
                    const uSnap = await transaction.get(userRef);
                    if (!uSnap.exists()) throw "El usuario no existe!";
                    const currentBal = uSnap.data().balance || 0;

                    // --- REPAIR: Fetch referrer before any writes ---
                    let referrerSnap = null;
                    let referrerRef = null;
                    const referredBy = uSnap.data().referredBy;
                    if (referredBy) {
                        referrerRef = doc(db, 'users', referredBy);
                        referrerSnap = await transaction.get(referrerRef);
                    }

                    
                    if (currentBal < totalPrice) throw "Saldo insuficiente.";

                    let credsToGive = [];
                    const stockRef = doc(db, 'products_stock', productId);
                    const sSnap = await transaction.get(stockRef);
                    
                    if (sSnap.exists() && sSnap.data().status === 'disponible') {
                        let pool = (sSnap.data().credentialsPool || "").split('\n').filter(l => l.trim() !== "");
                        if (pool.length < currentQty) throw "Stock insuficiente.";
                        credsToGive = pool.splice(0, currentQty);
                        transaction.update(stockRef, { credentialsPool: pool.join('\n') });
                    }

                    const newBalance = uSnap.data().balance - totalPrice;
                    transaction.update(userRef, { balance: newBalance });
                    
                    if (referrerSnap && referrerSnap.exists()) {
                        const rData = referrerSnap.data();
                        const bonus = totalPrice * 0.03;
                        transaction.update(referrerRef, { balance: (rData.balance || 0) + bonus });
                    }
                    
                    const newOrderRef = doc(collection(db, 'orders'));
                    const orderPayload = {
                        uid: currentUser.uid,
                        userEmail: currentUser.email,
                        productId: productId,
                        productName: productData.name,
                        price: totalPrice,
                        quantity: currentQty,
                        status: (sSnap.exists() && sSnap.data().status === 'disponible') ? 'entregado' : 'pendiente',
                        isGift: false,
                        textDelivered: (sSnap.exists() && sSnap.data().status === 'disponible') ? credsToGive.join('\n') : 'Pendiente',
                        timestamp: serverTimestamp()
                    };
                    if (selectedDuration) {
                        orderPayload.streamingDuration = selectedDuration;
                    }
                    if (customerNotes) {
                        orderPayload.customerNotes = customerNotes;
                    }
                    transaction.set(newOrderRef, orderPayload);
                });

                showPremiumSuccess("Tus productos ya están en tu panel.", "perfil.html");
                
            } catch (e) {
                console.error(e);
                alert("Error: " + String(e));
                btnBuy.disabled = false;
                btnBuy.textContent = "Comprar Ahora";
            }
        });
    }

const addCartBtn = document.getElementById('add-cart-btn');
if (addCartBtn) {
    addCartBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert("Debes iniciar sesión para usar el carrito.");
            return;
        }
        if (isNaN(currentQty) || currentQty <= 0 || !Number.isFinite(currentQty)) {
            alert("Cantidad inválida.");
            return;
        }

        let selectedDuration = '';
        if (productData && productData.isStreaming) {
            const sSelect = document.getElementById('streaming-duration-select');
            if (!sSelect || !sSelect.value) {
                alert("Por favor, selecciona una duración de suscripción.");
                return;
            }
            selectedDuration = sSelect.value;
        }

        const customerNotes = document.getElementById('customer-notes-input')?.value.trim() || '';

        if (stockData && stockData.status === 'disponible') {
            let pool = stockData.credentialsPool || "";
            let count = pool.split('\n').filter(l => l.trim() !== "").length;
            if (currentQty > count) {
                alert("La cantidad excede el stock disponible.");
                return;
            }
        }
        try {
            const uRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(uRef);
            if (userSnap.exists()) {
                let currentCart = userSnap.data().cart || {};
                let existingObj = currentCart[productId];
                let existingQty = 0;
                if (typeof existingObj === 'number') existingQty = existingObj;
                else if (existingObj && existingObj.qty) existingQty = existingObj.qty;
                
                currentCart[productId] = {
                    qty: existingQty + currentQty,
                    duration: selectedDuration,
                    notes: customerNotes || (existingObj && existingObj.notes ? existingObj.notes : '')
                };
                await updateDoc(uRef, { cart: currentCart });
                updateCartBadge();
                alert("¡Producto añadido al carrito!");
            }
        } catch(e) {
            console.error(e);
            alert("Error al añadir al carrito.");
        }
    });
}

function checkAndDisplayStockNotice() {
    const buyNotice = document.getElementById('buy-notice');
    if (!buyNotice) return;
    if (stockData && stockData.status === 'disponible') {
        let pool = stockData.credentialsPool || "";
        let count = pool.split('\n').filter(l => l.trim() !== "").length;
        if (currentQty > count) {
            const immediate = Math.max(0, count);
            const pending = currentQty - immediate;
            buyNotice.style.display = 'block';
            buyNotice.style.background = 'rgba(234,179,8,0.12)';
            buyNotice.style.border = '1px solid var(--warning)';
            buyNotice.style.color = 'var(--warning)';
            buyNotice.style.padding = '10px 14px';
            buyNotice.style.borderRadius = '10px';
            buyNotice.style.fontSize = '0.85rem';
            buyNotice.style.marginTop = '10px';
            buyNotice.innerHTML = `<i class="fa-solid fa-clock"></i> <strong>Aviso de Entrega:</strong> ${immediate > 0 ? `Tienes ${immediate} u. disponible(s) de inmediato. ` : ''}Las ${pending} u. restante(s) se entregarán bajo pedido.`;
        } else {
            buyNotice.style.display = 'none';
        }
    } else {
        buyNotice.style.display = 'none';
    }
}

function updateQtyUI() {
    if (!productData) return;

    if (isFollowersProduct() && currentQty > 0) currentQty = Math.floor(currentQty / 100) * 100;
    const qtyDisplay = document.getElementById('qty-display');
    if (qtyDisplay) qtyDisplay.textContent = currentQty;

    if (pPrice) {
        const selection = streamSelect?.selectedOptions[0];
        const selectedPrice = selection?.value ? Number(selection.dataset.price) : NaN;
        const startingPrice = Number(streamSelect?.dataset.startingPrice);
        if (isFollowersProduct()) {
            pPrice.textContent = `$${getProductTotal().toFixed(2)} MXN`;
        } else if (Number.isFinite(selectedPrice)) {
            pPrice.textContent = `$${(selectedPrice * currentQty).toFixed(2)} MXN`;
        } else if (Number.isFinite(startingPrice)) {
            pPrice.textContent = `Desde $${(startingPrice * currentQty).toFixed(2)} MXN`;
        } else {
            pPrice.textContent = `$${getProductTotal().toFixed(2)} MXN`;
        }
    }

    checkAndDisplayStockNotice();
}

const btnMinus = document.getElementById('btn-qty-minus');
const btnPlus = document.getElementById('btn-qty-plus');

if(btnMinus) {
    btnMinus.addEventListener('click', () => {
        const minQ = Number(productData?.minQuantity) || 1;
        if (currentQty > minQ) {
            currentQty -= isFollowersProduct() ? 100 : 1;
        } else if (currentQty === minQ) {
            currentQty = 0;
        }
        updateQtyUI();
    });
}

if(btnPlus) {
    btnPlus.addEventListener('click', () => {
        const minQ = Number(productData?.minQuantity) || 1;
        if (currentQty === 0) {
            currentQty = minQ;
        } else if (currentQty < minQ) {
            currentQty = minQ;
        } else {
            currentQty += isFollowersProduct() ? 100 : 1;
        }
        updateQtyUI();
    });
}

async function loadProductReviews(pid) {
    const container = document.getElementById('product-reviews-container');
    if (!container) return;

    try {
        const q = query(collection(db, "reviews"), where("productId", "==", pid), orderBy("timestamp", "desc"));
        let snap;
        try {
            snap = await getDocs(q);
        } catch (err) {
            const fallbackQ = query(collection(db, "reviews"), where("productId", "==", pid));
            snap = await getDocs(fallbackQ);
        }

        if (snap.empty) {
            container.innerHTML = `<p style="color: var(--text-muted);">Todavía no hay reseñas para este producto.</p>`;
            return;
        }

        container.innerHTML = '';
        snap.forEach(docSnap => {
            const r = docSnap.data();
            const ratingVal = Math.min(5, Math.max(1, parseInt(r.rating) || 5));
            const starsHtml = '<i class="fa-solid fa-star"></i>'.repeat(ratingVal) + '<i class="fa-regular fa-star"></i>'.repeat(5 - ratingVal);

            const card = document.createElement('div');
            card.className = 'review-card';
            card.style.minWidth = "280px";
            card.innerHTML = `
                <div class="review-stars">${starsHtml}</div>
                <div class="review-body">
                    <p class="text">${escapeHtml(r.text || '')}</p>
                    <span class="username">@${escapeHtml(r.username || 'Usuario')}</span>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading product reviews:", err);
        container.innerHTML = `<p style="color: var(--danger);">No se pudieron cargar las reseñas.</p>`;
    }
}


shareBtn?.addEventListener('click', async () => {
    const status = document.getElementById('product-share-status');
    const url = new URL(window.location.href);
    url.searchParams.delete('action');

    try {
        await navigator.clipboard.writeText(url.href);
        if (status) status.textContent = 'Enlace copiado.';
    } catch {
        if (status) status.textContent = `Copia este enlace: ${url.href}`;
        else alert(`Copia este enlace: ${url.href}`);
    }
});

loadProductDetails();


function showPremiumSuccess(message, redirectUrl) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(10, 10, 15, 0.85)';
    modal.style.backdropFilter = 'blur(10px)';
    modal.style.zIndex = '999999';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.4s ease';

    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); padding: 40px; border-radius: 20px; text-align: center; transform: scale(0.8); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 10px 40px rgba(34, 197, 94, 0.2);">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(34, 197, 94, 0.1); border: 2px solid #22c55e; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);">
                <i class="fa-solid fa-check" style="color: #22c55e; font-size: 2.5rem;"></i>
            </div>
            <h2 style="color: white; margin-bottom: 10px; font-size: 1.5rem; font-weight: 600;">¡Compra Exitosa!</h2>
            <p style="color: rgba(255,255,255,0.7); font-size: 0.95rem; max-width: 250px; margin: 0 auto;">${message}</p>
        </div>
    `;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        modal.firstElementChild.style.transform = 'scale(1)';
    });

    setTimeout(() => {
        window.location.href = redirectUrl;
    }, 2500);
}
