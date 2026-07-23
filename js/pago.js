import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;
let userData = null;

// URL Params
const urlParams = new URLSearchParams(window.location.search);
const from = urlParams.get('from'); // 'cart', 'profile', 'product'
const targetAmount = parseFloat(urlParams.get('amount')) || 0;
const productId = urlParams.get('productId');
const qty = parseInt(urlParams.get('qty')) || 1;
const isGift = urlParams.get('isGift') === 'true';
const giftEmail = urlParams.get('giftEmail');

// UI Elements
const pagoContent = document.getElementById('pago-content');
const authMsg = document.getElementById('auth-state-message');
const dynamicArea = document.getElementById('dynamic-payment-area');
const actionArea = document.getElementById('action-area');
const titleEl = document.getElementById('pago-title');
const subEl = document.getElementById('pago-subtitle');
const errorEl = document.getElementById('pago-error');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authMsg.style.display = 'none';
        pagoContent.style.display = 'grid';
        
        try {
            const userRef = doc(db, 'users', user.uid);
            const uSnap = await getDoc(userRef);
            if (uSnap.exists()) {
                userData = uSnap.data();
                initializePaymentLogic();
            } else {
                showError("No se encontró la información del usuario.");
            }
        } catch(e) {
            console.error(e);
            showError("Error al cargar datos del usuario.");
        }
    } else {
        authMsg.style.display = 'block';
        pagoContent.style.display = 'none';
    }
});

function showError(msg) {
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }
}

function initializePaymentLogic() {
    const currentBalance = userData.balance || 0;
    const isPurchase = (from === 'cart' || from === 'product');
    
    // DECISION TREE
    if (isPurchase && currentBalance >= targetAmount && targetAmount > 0) {
        // MODE: CONFIRM PURCHASE WITH BALANCE
        setupPurchaseMode(currentBalance, targetAmount);
    } else {
        // MODE: RECHARGE BALANCE
        setupRechargeMode(currentBalance, targetAmount);
    }
}

function setupPurchaseMode(balance, amount) {
    titleEl.innerHTML = '<i class="fa-solid fa-bag-shopping"></i> Confirmar Compra';
    subEl.textContent = 'Tienes saldo suficiente para esta operación.';
    
    const remaining = balance - amount;
    
    dynamicArea.innerHTML = `
        <div class="confirm-box">
            <h3 style="font-size: 1.5rem; margin-bottom: 10px;">Resumen</h3>
            <p>Saldo Actual: <strong style="color: var(--accent-primary);">$${balance.toFixed(2)}</strong></p>
            <p>Total a Pagar: <strong style="color: var(--danger);">-$${amount.toFixed(2)}</strong></p>
            <hr style="border: 0; border-top: 1px solid var(--glass-border); margin: 10px 0;">
            <p>Saldo Restante: <strong>$${remaining.toFixed(2)}</strong></p>
            <p style="margin-top: 1rem; font-weight: bold; color: var(--accent-primary);">¿Estás seguro que confirmas tu compra?</p>
        </div>
    `;
    
    actionArea.innerHTML = `
        <button id="btn-confirm-purchase" class="btn-primary" style="width:100%; padding: 14px; font-size: 1.1rem;">
            <i class="fa-solid fa-check"></i> Confirmar y Comprar
        </button>
        <button id="btn-cancel" class="btn-secondary" style="width:100%; padding: 14px; margin-top: 10px;">
            Cancelar
        </button>
    `;
    
    document.getElementById('btn-cancel').onclick = () => window.history.back();
    document.getElementById('btn-confirm-purchase').onclick = processPurchase;
}

function setupRechargeMode(balance, suggestedAmount) {
    titleEl.innerHTML = '<i class="fa-solid fa-wallet"></i> Recargar Saldo';
    if (from === 'cart' || from === 'product') {
        subEl.innerHTML = `<span style="color:var(--warning);"><i class="fa-solid fa-triangle-exclamation"></i> Saldo insuficiente para tu compra.</span> Necesitas recargar.`;
    } else {
        subEl.textContent = 'Selecciona o ingresa la cantidad a recargar.';
    }
    
    const defaultVal = suggestedAmount > 0 ? suggestedAmount : '';
    
    dynamicArea.innerHTML = `
        <div class="recharge-options" id="recharge-btns">
            <div class="r-opt" data-val="100">$100</div>
            <div class="r-opt" data-val="200">$200</div>
            <div class="r-opt" data-val="500">$500</div>
            <div class="r-opt" data-val="1200">$1200</div>
        </div>
        <div style="margin-top: 15px;">
            <label style="font-size: 0.9rem; color: var(--text-muted);">Monto a recargar ($ MXN)</label>
            <input type="number" id="custom-recharge-amount" class="brutalist-input" placeholder="Min. 15 MXN" style="width: 100%; margin-top: 5px;" min="15" value="${defaultVal}">
        </div>
    `;
    
    actionArea.innerHTML = `
        <button id="btn-process-recharge" class="btn-primary" style="width:100%; padding: 14px; font-size: 1.1rem;">
            <i class="fa-brands fa-whatsapp"></i> Generar Ticket
        </button>
    `;
    
    // Select logic
    const inputAmount = document.getElementById('custom-recharge-amount');
    const rOpts = document.querySelectorAll('.r-opt');
    
    rOpts.forEach(btn => {
        btn.onclick = () => {
            rOpts.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            inputAmount.value = btn.getAttribute('data-val');
        };
    });
    
    document.getElementById('btn-process-recharge').onclick = processRecharge;
}

async function processRecharge() {
    const input = document.getElementById('custom-recharge-amount');
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount < 15) {
        showError("El monto mínimo de recarga es de $15 MXN.");
        return;
    }
    
    const btn = document.getElementById('btn-process-recharge');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
    
    try {
        await addDoc(collection(db, 'balance_requests'), {
            uid: currentUser.uid,
            userEmail: currentUser.email,
            amount: amount,
            status: "pendiente",
            timestamp: serverTimestamp()
        });
        
        const waMessage = `Hola, quiero recargar $${amount} MXN a mi cuenta (${currentUser.email}).`;
        const waUrl = `https://wa.me/5211234567890?text=${encodeURIComponent(waMessage)}`;
        
        alert("Solicitud de recarga creada. Serás redirigido a WhatsApp. Una vez confirmada, podrás completar tu compra.");
        window.open(waUrl, '_blank');
        window.location.href = "perfil.html";
        
    } catch (e) {
        console.error(e);
        showError("Error al generar recarga.");
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Generar Ticket';
    }
}

async function processPurchase() {
    const btn = document.getElementById('btn-confirm-purchase');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    errorEl.style.display = 'none';

    try {
        if (from === 'cart') {
            await processCartPurchase();
        } else if (from === 'product') {
            await processSinglePurchase();
        } else {
            throw new Error("Origen de compra inválido.");
        }
    } catch (e) {
        console.error(e);
        showError(e.message || String(e));
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar y Comprar';
    }
}

async function processCartPurchase() {
    const cartObj = userData.cart || {};
    const cartItems = Object.keys(cartObj);
    if (cartItems.length === 0) throw new Error("El carrito está vacío.");

    let finalTotal = 0;
    
    await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', currentUser.uid);
        const uSnap = await transaction.get(userRef);
        const currentBal = uSnap.data().balance || 0;
        
        let calculatedTotal = 0;
        const productsData = [];

        // Fetch all product data and stock in transaction
        for (const pid of cartItems) {
            const pQty = cartObj[pid] || 1;
            const pRef = doc(db, 'products', pid);
            const pSnap = await transaction.get(pRef);
            if (pSnap.exists()) {
                const p = pSnap.data();
                calculatedTotal += (p.price * pQty);
                productsData.push({ id: pid, qty: pQty, ...p });
            }
        }
        
        if (currentBal < calculatedTotal) throw new Error("Saldo insuficiente (el carrito pudo haber cambiado de precio).");
        finalTotal = calculatedTotal;

        // Process each product
        for (const prod of productsData) {
            const stockRef = doc(db, 'products_stock', prod.id);
            const sSnap = await transaction.get(stockRef);
            
            let credsToGive = [];
            let oStatus = "confirmado";
            
            if (sSnap.exists() && sSnap.data().status === 'disponible') {
                let pool = (sSnap.data().credentialsPool || "").split('\n').filter(l => l.trim() !== "");
                if (pool.length >= prod.qty) {
                    credsToGive = pool.splice(0, prod.qty);
                    transaction.update(stockRef, { credentialsPool: pool.join('\n') });
                } else {
                    oStatus = "pendiente";
                    credsToGive = ["Se agotó el stock. El administrador procesará tu entrega pronto."];
                }
            } else if (sSnap.exists() && sSnap.data().status === 'bajo_pedido') {
                oStatus = "pendiente";
                credsToGive = ["El administrador procesará tu entrega pronto."];
            } else {
                oStatus = "pendiente";
                credsToGive = ["Entrega pendiente de verificación."];
            }

            const newOrderRef = doc(collection(db, 'orders'));
            transaction.set(newOrderRef, {
                uid: currentUser.uid,
                userEmail: currentUser.email,
                productId: prod.id,
                productName: prod.name,
                price: prod.price * prod.qty,
                quantity: prod.qty,
                method: 'creditos',
                status: oStatus,
                textDelivered: credsToGive.join('\n'),
                isGift: false,
                timestamp: serverTimestamp()
            });
        }

        // Deduct balance and clear cart
        transaction.update(userRef, { 
            balance: currentBal - calculatedTotal,
            cart: {}
        });
    });

    alert(`¡Compra del carrito realizada con éxito! Se descontaron $${finalTotal.toFixed(2)}.`);
    window.location.href = "perfil.html";
}

async function processSinglePurchase() {
    if (!productId) throw new Error("Producto inválido.");
    
    let productName = "Producto";
    
    await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', currentUser.uid);
        const uSnap = await transaction.get(userRef);
        const currentBal = uSnap.data().balance || 0;
        
        const pRef = doc(db, 'products', productId);
        const pSnap = await transaction.get(pRef);
        if (!pSnap.exists()) throw new Error("Producto no encontrado.");
        
        const pData = pSnap.data();
        productName = pData.name;
        const actualPrice = pData.price * qty;
        
        if (currentBal < actualPrice) throw new Error("Saldo insuficiente.");

        const stockRef = doc(db, 'products_stock', productId);
        const sSnap = await transaction.get(stockRef);
        
        let credsToGive = [];
        let oStatus = "confirmado";
        
        if (sSnap.exists() && sSnap.data().status === 'disponible') {
            let pool = (sSnap.data().credentialsPool || "").split('\n').filter(l => l.trim() !== "");
            if (pool.length >= qty) {
                credsToGive = pool.splice(0, qty);
                transaction.update(stockRef, { credentialsPool: pool.join('\n') });
            } else {
                oStatus = "pendiente";
                credsToGive = ["Se agotó el stock instantáneo. Espera confirmación del admin."];
            }
        } else if (sSnap.exists() && sSnap.data().status === 'bajo_pedido') {
            oStatus = "pendiente";
            credsToGive = ["El administrador procesará tu entrega pronto."];
        } else {
            oStatus = "pendiente";
            credsToGive = ["Entrega pendiente."];
        }

        transaction.update(userRef, { balance: currentBal - actualPrice });
        
        const newOrderRef = doc(collection(db, 'orders'));
        transaction.set(newOrderRef, {
            uid: currentUser.uid,
            userEmail: currentUser.email,
            productId: productId,
            productName: pData.name,
            price: actualPrice,
            quantity: qty,
            method: 'creditos',
            status: oStatus,
            textDelivered: credsToGive.join('\n'),
            isGift: isGift,
            giftEmail: isGift ? giftEmail : null,
            timestamp: serverTimestamp()
        });
    });

    if (isGift) {
        showAstronautModal(productName, giftEmail);
    } else {
        alert("¡Compra realizada con éxito!");
        window.location.href = "perfil.html";
    }
}

function showAstronautModal(productName, email) {
    const modal = document.getElementById('gift-confirmation-modal');
    const nameEl = document.getElementById('gift-friend-name');
    const shareBtn = document.getElementById('share-whatsapp-btn');
    
    if(nameEl) nameEl.textContent = email;
    
    if (shareBtn) {
        shareBtn.onclick = (e) => {
            e.preventDefault();
            const message = `¡Hola! 🎁 Te acabo de regalar *${productName}* en GhostKey.\n\n¡Nos esforzaremos al máximo para que lo recibas super rápido! 🚀✨\n\nVisita GhostKey para ver tus regalos: ${window.location.origin}`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
        };
    }
    
    if(modal) {
        modal.classList.add('active');
        document.getElementById('pago-content').style.display = 'none'; // hide payment area
    }
}
