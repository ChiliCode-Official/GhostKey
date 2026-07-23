import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

if (btnGift) {
    btnGift.addEventListener('click', () => {
        isGiftMode = !isGiftMode;
        btnGift.classList.toggle('is-active', isGiftMode);
        if (giftInputs) giftInputs.style.display = isGiftMode ? 'block' : 'none';
        if (!isGiftMode && giftEmail) {
            giftEmail.value = '';
        }
    });
}

async function loadProductDetails() {
    if (!productId) {
        if (pTitle) pTitle.textContent = "Producto no especificado";
        if (pDesc) pDesc.textContent = "Selecciona un producto desde el catálogo para ver sus detalles.";
        return;
    }
    try {
        const pSnap = await getDoc(doc(db, 'products', productId));
        if (pSnap.exists()) {
            productData = { id: pSnap.id, ...pSnap.data() };
            if (pTitle) pTitle.textContent = productData.name || 'Producto';
            if (pDesc) pDesc.textContent = productData.description || 'Sin descripción disponible para este producto.';
            if (pPrice) pPrice.textContent = `$${productData.price || 0}`;
            if (pImage) pImage.src = productData.image || 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&w=800';
            
            const sSnap = await getDoc(doc(db, 'products_stock', productId));
            if (sSnap.exists()) {
                stockData = sSnap.data();
                if (pBadge) {
                    if (stockData.status === 'disponible') {
                        let pool = stockData.credentialsPool || "";
                        let count = pool.split('\n').filter(l => l.trim() !== "").length;
                        if(count > 0) {
                            pBadge.textContent = `En stock (${count})`;
                            pBadge.style.background = 'var(--success)';
                        } else {
                            pBadge.textContent = `Agotado`;
                            pBadge.style.background = 'var(--danger)';
                            if (btnBuy) btnBuy.disabled = true;
                            if (btnGift) btnGift.disabled = true;
                        }
                    } else if (stockData.status === 'bajo_pedido') {
                        pBadge.textContent = `Bajo pedido`;
                        pBadge.style.background = 'var(--warning)';
                    } else {
                        pBadge.textContent = `Agotado`;
                        pBadge.style.background = 'var(--danger)';
                        if (btnBuy) btnBuy.disabled = true;
                        if (btnGift) btnGift.disabled = true;
                    }
                }
            } else {
                if (pBadge) {
                    pBadge.textContent = `En stock`;
                    pBadge.style.background = 'var(--success)';
                }
            }
        } else {
            if (pTitle) pTitle.textContent = "Producto no encontrado";
            if (pDesc) pDesc.textContent = "El producto solicitado no existe o fue eliminado del inventario.";
        }
    } catch (e) {
        console.error("Error loading product details:", e);
        if (pTitle) pTitle.textContent = "Error al cargar";
        if (pDesc) pDesc.textContent = "Hubo un error al cargar la información del producto.";
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if (authMsg) authMsg.style.display = 'none';
        
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                userDocData = userSnap.data();
                if (userBalanceDisplay) {
                    userBalanceDisplay.textContent = `$${(userDocData.balance || 0).toFixed(2)}`;
                }
                if (buyControls) buyControls.style.display = 'flex';

                if (productData && userDocData.balance < productData.price) {
                    if (buyError) {
                        buyError.textContent = "Saldo insuficiente. Recarga en tu perfil.";
                        buyError.style.display = 'block';
                    }
                    if (btnBuy) btnBuy.disabled = true;
                }
            }
        } catch (e) {
            console.error("Error checking user balance:", e);
        }
    } else {
        if (authMsg) authMsg.style.display = 'block';
        if (buyControls) buyControls.style.display = 'none';
        currentUser = null;
    }
});

if (btnBuy) {
    btnBuy.addEventListener('click', async () => {
        if (!currentUser) {
            alert("Debes iniciar sesión para comprar.");
            return;
        }
        if (!productData) return;

        const isGift = isGiftMode;
        const gEmail = giftEmail ? giftEmail.value.trim() : '';
        if (isGift && !gEmail) {
            if (buyError) {
                buyError.textContent = "Ingresa el correo de tu amigo.";
                buyError.style.display = 'block';
            }
            return;
        }

        btnBuy.disabled = true;

        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', currentUser.uid);
                const uSnap = await transaction.get(userRef);
                if (!uSnap.exists()) throw "El usuario no existe!";
                const currentBal = uSnap.data().balance || 0;

                if (currentBal < productData.price) {
                    throw "Saldo insuficiente en tu cuenta.";
                }

                let textDel = "";
                let oStatus = "confirmado";
                const stockRef = doc(db, 'products_stock', productId);
                const sSnap = await transaction.get(stockRef);
                
                if (sSnap.exists() && sSnap.data().status === 'disponible') {
                    let pool = (sSnap.data().credentialsPool || "").split('\n').filter(l => l.trim() !== "");
                    if (pool.length === 0) throw "Producto agotado repentinamente.";
                    textDel = pool.shift();
                    transaction.update(stockRef, { credentialsPool: pool.join('\n') });
                } else if (sSnap.exists() && sSnap.data().status === 'bajo_pedido') {
                    oStatus = "pendiente";
                    textDel = "El administrador procesará tu entrega pronto.";
                } else if (!sSnap.exists()) {
                    textDel = "Entrega pendiente de verificación.";
                    oStatus = "pendiente";
                } else {
                    throw "Producto no disponible.";
                }

                transaction.update(userRef, { balance: currentBal - productData.price });
                
                const newOrderRef = doc(collection(db, 'orders'));
                transaction.set(newOrderRef, {
                    uid: currentUser.uid,
                    userEmail: currentUser.email,
                    productId: productId,
                    productName: productData.name,
                    price: productData.price,
                    method: 'creditos',
                    status: oStatus,
                    textDelivered: textDel,
                    isGift: isGift,
                    giftEmail: isGift ? gEmail : null,
                    timestamp: serverTimestamp()
                });
            });

            if (isGift) {
                const giftModal = document.getElementById('gift-confirmation-modal');
                const friendNameEl = document.getElementById('gift-friend-name');
                const giftMsgEl = document.getElementById('gift-modal-message');
                const shareBtn = document.getElementById('share-whatsapp-btn');

                if (friendNameEl) friendNameEl.textContent = gEmail;
                if (giftMsgEl) giftMsgEl.textContent = `¡Nos esforzaremos lo necesario para entregar tu regalo (${productData.name}) a ${gEmail} con la mayor rapidez posible!`;

                if (shareBtn) {
                    shareBtn.onclick = () => {
                        const message = `¡Hola! 🎁 Te acabo de regalar *${productData.name}* en GhostKey.\n\n¡Nos esforzaremos al máximo para que lo recibas super rápido! 🚀✨\n\nVisita GhostKey para ver tus regalos: ${window.location.origin}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
                    };
                }

                if (giftModal) {
                    giftModal.classList.add('active');
                } else {
                    alert(`¡Regalo enviado a ${gEmail}! Nos esforzaremos por entregarlo con la mayor rapidez.`);
                    window.location.href = "perfil.html";
                }
            } else {
                alert("¡Compra realizada con éxito!");
                window.location.href = "perfil.html";
            }
            
        } catch (e) {
            console.error(e);
            if (buyError) {
                buyError.textContent = String(e);
                buyError.style.display = 'block';
            }
            btnBuy.disabled = false;
        }
    });
}

loadProductDetails();
