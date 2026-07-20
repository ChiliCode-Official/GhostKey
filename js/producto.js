import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const btnBuy = document.getElementById('btn-buy');
const buyError = document.getElementById('buy-error');

const giftCheckbox = document.getElementById('is-gift-checkbox');
const giftInputs = document.getElementById('gift-inputs');
const giftEmail = document.getElementById('gift-email');

let productData = null;
let stockData = null;
let currentUser = null;
let userDocData = null;

giftCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        giftInputs.classList.add('active');
    } else {
        giftInputs.classList.remove('active');
    }
});

async function loadProductDetails() {
    if (!productId) {
        pTitle.textContent = "Producto no encontrado";
        return;
    }
    try {
        const pSnap = await getDoc(doc(db, 'products', productId));
        if (pSnap.exists()) {
            productData = { id: pSnap.id, ...pSnap.data() };
            pTitle.textContent = productData.name;
            pDesc.textContent = productData.description;
            pPrice.textContent = `$${productData.price}`;
            pImage.src = productData.image || 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&w=800';
            
            const sSnap = await getDoc(doc(db, 'products_stock', productId));
            if (sSnap.exists()) {
                stockData = sSnap.data();
                if (stockData.status === 'disponible') {
                    let pool = stockData.credentialsPool || "";
                    let count = pool.split('\n').filter(l => l.trim() !== "").length;
                    if(count > 0) {
                        pBadge.textContent = `En stock (${count})`;
                        pBadge.style.background = 'var(--success)';
                    } else {
                        pBadge.textContent = `Agotado`;
                        pBadge.style.background = 'var(--danger)';
                        btnBuy.disabled = true;
                    }
                } else if (stockData.status === 'bajo_pedido') {
                    pBadge.textContent = `Bajo pedido`;
                    pBadge.style.background = 'var(--warning)';
                } else {
                    pBadge.textContent = `Agotado`;
                    pBadge.style.background = 'var(--danger)';
                    btnBuy.disabled = true;
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authMsg.style.display = 'none';
        
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                userDocData = userSnap.data();
                userBalanceDisplay.textContent = `$${userDocData.balance.toFixed(2)}`;
                buyControls.style.display = 'flex';
                
                if (userDocData.balance < productData?.price) {
                    buyError.textContent = "Saldo insuficiente. Recarga en tu perfil.";
                    buyError.style.display = 'block';
                    btnBuy.disabled = true;
                }
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        authMsg.style.display = 'block';
        buyControls.style.display = 'none';
        currentUser = null;
    }
});

btnBuy.addEventListener('click', async () => {
    if (!currentUser || !productData || !stockData || !userDocData) return;
    
    const isGift = giftCheckbox.checked;
    const gEmail = giftEmail.value.trim();
    if (isGift && !gEmail) {
        buyError.textContent = "Ingresa el correo del amigo.";
        buyError.style.display = 'block';
        return;
    }

    btnBuy.disabled = true;
    btnBuy.textContent = "Procesando...";

    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', currentUser.uid);
            const uSnap = await transaction.get(userRef);
            if (!uSnap.exists()) throw "Usuario no existe!";
            const currentBal = uSnap.data().balance;

            if (currentBal < productData.price) {
                throw "Saldo insuficiente.";
            }

            let textDel = "";
            let oStatus = "confirmado";
            const stockRef = doc(db, 'products_stock', productId);
            const sSnap = await transaction.get(stockRef);
            
            if (sSnap.data().status === 'disponible') {
                let pool = sSnap.data().credentialsPool.split('\n').filter(l => l.trim() !== "");
                if (pool.length === 0) throw "Producto agotado repentinamente.";
                textDel = pool.shift(); // Take first credential
                transaction.update(stockRef, { credentialsPool: pool.join('\n') });
            } else if (sSnap.data().status === 'bajo_pedido') {
                oStatus = "pendiente";
                textDel = "El administrador procesará tu entrega pronto.";
            } else {
                throw "Producto no disponible.";
            }

            // Deduct balance
            transaction.update(userRef, { balance: currentBal - productData.price });
            
            // Referral Logic (3%)
            const referredBy = uSnap.data().referredBy;
            if (referredBy) {
                // Not doing inside this transaction to avoid complex locks, but in a real prod we'd do it or via cloud functions.
                // For this Vanilla JS demo, we'll try to update it inside if we query it, but we can't query inside transaction easily without ref.
                // Let's assume we know the referer UID or skip for now inside transaction.
            }

            // Create Order
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

        alert("Compra exitosa!");
        window.location.href = "perfil.html";
        
    } catch (e) {
        console.error(e);
        buyError.textContent = e;
        buyError.style.display = 'block';
        btnBuy.disabled = false;
        btnBuy.textContent = "Comprar ahora";
    }
});

loadProductDetails();
