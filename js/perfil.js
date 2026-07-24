import { auth, db, provider } from './firebase-config.js';
import {
    onAuthStateChanged,
    signOut,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    doc,
    getDoc,
    collection,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    increment,
    serverTimestamp,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const ADMIN_EMAIL = 'lrodricg30@gmail.com';
let currentUser = null;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// UI Elements
const authGuard = document.getElementById('auth-guard');
const profileContent = document.getElementById('profile-content');
const clientView = document.getElementById('client-view');
const adminView = document.getElementById('admin-view');
const btnLogout = document.getElementById('logout-btn');
const btnLoginGuard = document.getElementById('login-btn-guard');

const cardUid = document.getElementById('card-uid');
const cardName = document.getElementById('card-name');
const userBalance = document.getElementById('user-balance');
const userAvatars = document.querySelectorAll('.user-avatar');

setPersistence(auth, browserLocalPersistence).catch(console.error);

// Check redirect login results
getRedirectResult(auth).then(async (result) => {
    if (result && result.user) {
        const user = result.user;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                email: user.email,
                balance: 0,
                wishlist: [],
                cart: {},
                referralCode: user.uid.substring(0, 8).toUpperCase(),
                referredBy: null
            });
        }
        if (authGuard) authGuard.style.display = 'none';
        if (profileContent) profileContent.style.display = 'block';
        if (btnLogout) btnLogout.style.display = 'inline-block';
        loadClientData(user.uid);
    }
}).catch(console.error);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if (authGuard) authGuard.style.display = 'none';
        if (profileContent) profileContent.style.display = 'block';
        if (btnLogout) btnLogout.style.display = 'inline-block';
        
        // Render basic info on GhostCard
        if (cardName) cardName.textContent = user.displayName || user.email;
        if (cardUid) cardUid.textContent = user.uid;
        userAvatars.forEach(img => {
            img.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'User')}&background=A182E8&color=fff`;
        });

        // Check Admin Role
        if (user.email === ADMIN_EMAIL) {
            if (adminView) adminView.style.display = 'block';
            if (clientView) clientView.style.display = 'none';
            loadAdminData();
        } else {
            if (adminView) adminView.style.display = 'none';
            if (clientView) clientView.style.display = 'block';
            loadClientData(user.uid);
        }
    } else {
        currentUser = null;
        if (authGuard) authGuard.style.display = 'block';
        if (profileContent) profileContent.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'none';
    }
});

btnLogout?.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
});

btnLoginGuard?.addEventListener('click', async () => {
    const termsCheck = document.getElementById('terms-checkbox');
    if (termsCheck && !termsCheck.checked) {
        alert("Debes aceptar los términos y condiciones para continuar.");
        return;
    }
    try {
        let user = null;
        try {
            const result = await signInWithPopup(auth, provider);
            user = result.user;
        } catch (popupErr) {
            console.warn("Popup login blocked or failed, attempting redirect login...", popupErr);
            await signInWithRedirect(auth, provider);
            return;
        }

        if (user) {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: user.email,
                    balance: 0,
                    wishlist: [],
                    cart: {},
                    referralCode: user.uid.substring(0, 8).toUpperCase(),
                    referredBy: null
                });
            }
            if (authGuard) authGuard.style.display = 'none';
            if (profileContent) profileContent.style.display = 'block';
            if (btnLogout) btnLogout.style.display = 'inline-block';
            loadClientData(user.uid);
        }
    } catch(err) {
        console.error("Login Error:", err);
        alert("Error al iniciar sesión: " + (err.message || err.code || err));
    }
});

// --- Client Logic ---
async function loadClientData(uid) {
    try {
        const userRef = doc(db, 'users', uid);
        let userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                email: (currentUser && currentUser.email) || '',
                balance: 0,
                wishlist: [],
                cart: {},
                referralCode: uid.substring(0, 8).toUpperCase(),
                referredBy: null
            });
            userSnap = await getDoc(userRef);
        }

        if (userSnap.exists()) {
            const data = userSnap.data();
            if (userBalance) userBalance.textContent = (data.balance !== undefined && data.balance !== null) ? Number(data.balance).toFixed(2) : '0.00';
            
            // Load Orders
            const qOrders = query(collection(db, "orders"), where("uid", "==", uid));
            const ordersSnap = await getDocs(qOrders);
            const tbody = document.getElementById('client-orders-body');
            const noticeBox = document.getElementById('pending-orders-notice');
            const deliveredSection = document.getElementById('delivered-section');
            const deliveredContainer = document.getElementById('delivered-products-container');

            let hasPending = false;
            let hasDelivered = false;

            if (tbody) tbody.innerHTML = '';
            if (deliveredContainer) deliveredContainer.innerHTML = '';

            for (const d of ordersSnap.docs) {
                const o = d.data();
                if (o.status === 'pendiente') hasPending = true;

                let dDate = 'Reciente';
                if (o.timestamp) {
                    try {
                        if (typeof o.timestamp.toDate === 'function') {
                            dDate = o.timestamp.toDate().toLocaleDateString();
                        } else if (o.timestamp.seconds) {
                            dDate = new Date(o.timestamp.seconds * 1000).toLocaleDateString();
                        } else {
                            dDate = new Date(o.timestamp).toLocaleDateString();
                        }
                    } catch(e) {
                        dDate = 'Reciente';
                    }
                }
                const statusClass = o.status === 'pendiente' ? 'status-pending' : 'status-confirmed';

                // Append to Table
                if (tbody) {
                    tbody.innerHTML += `
                        <tr>
                            <td>${dDate}</td>
                            <td>${escapeHtml(o.productName || 'Producto')}</td>
                            <td><span class="status-badge ${statusClass}">${(o.status || 'PENDIENTE').toUpperCase()}</span></td>
                            <td>${escapeHtml(o.textDelivered || 'Procesando...')}</td>
                        </tr>
                    `;
                }

                // If confirmed/delivered, build Delivered Card
                if (o.status === 'confirmado' && deliveredContainer) {
                    hasDelivered = true;

                    // Fetch product image if available
                    let prodImg = 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&w=300';
                    if (o.productId) {
                        try {
                            const pDoc = await getDoc(doc(db, 'products', o.productId));
                            if (pDoc.exists() && pDoc.data().image) {
                                prodImg = pDoc.data().image;
                            }
                        } catch(e) { /* use fallback */ }
                    }

                    const card = document.createElement('div');
                    card.className = 'delivered-card';
                    card.innerHTML = `
                        <p class="delivered-tag">ENTREGADO</p>
                        <div class="delivered-wrapper">
                            <div class="delivered-card-image">
                                <img src="${prodImg}" alt="${escapeHtml(o.productName || 'Producto')}">
                            </div>
                            <div class="delivered-content">
                                <p class="delivered-title">${escapeHtml(o.productName || 'Producto')}</p>
                                <p class="delivered-title delivered-price">$${o.price || 0}</p>
                            </div>
                            <button class="delivered-card-btn" data-credential="${escapeHtml(o.textDelivered || '')}">
                                <i class="fa-solid fa-key"></i> OBTENER
                            </button>
                        </div>
                    `;
                    deliveredContainer.appendChild(card);
                }
            }

            // Click listener for OBTENER buttons
            document.querySelectorAll('.delivered-card-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const text = btn.dataset.credential;
                    if (text) {
                        navigator.clipboard.writeText(text).then(() => {
                            alert(`¡Tu producto entregado!\n\nCredencial/Código:\n${text}\n\n(Copiado al portapapeles)`);
                        }).catch(() => {
                            alert(`Credencial/Código:\n${text}`);
                        });
                    } else {
                        alert("El administrador está procesando tu entrega.");
                    }
                });
            });

            if (noticeBox) {
                noticeBox.style.display = hasPending ? 'block' : 'none';
            }
            if (deliveredSection) {
                deliveredSection.style.display = hasDelivered ? 'block' : 'none';
            }

            // Load Wishlist tab
            const wishlistContainer = document.getElementById('wishlist-container');
            if (wishlistContainer) {
                const wishlistIds = data.wishlist || [];
                wishlistContainer.innerHTML = '';
                if (wishlistIds.length === 0) {
                    wishlistContainer.innerHTML = `<p style="color:var(--text-muted); padding:1rem;">No tienes productos en tu wishlist.</p>`;
                } else {
                    for (const pid of wishlistIds) {
                        try {
                            const pSnap = await getDoc(doc(db, 'products', pid));
                            if (pSnap.exists()) {
                                const p = pSnap.data();
                                const card = document.createElement('a');
                                card.href = `producto.html?id=${pid}`;
                                card.className = 'card';
                                card.style.minWidth = '220px';
                                card.innerHTML = `
                                    <div class="card__shine"></div>
                                    <div class="card__glow"></div>
                                    <div class="card__content">
                                        <div class="card__image" style="background-image: url('${p.image || 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&w=400'}');"></div>
                                        <div class="card__text">
                                            <p class="card__title">${escapeHtml(p.name)}</p>
                                        </div>
                                        <div class="card__footer">
                                            <div class="card__price">$${p.price}</div>
                                        </div>
                                    </div>
                                `;
                                wishlistContainer.appendChild(card);
                            }
                        } catch(e) { console.error("Error loading wishlist item:", e); }
                    }
                }
            }
        }
    } catch(err) {
        console.error("Error loading client data:", err);
    }
}

// --- Admin Logic ---
async function loadAdminData() {
    console.log("Cargando datos de Admin...");
    
    // 1. Pending Orders (Bajo pedido)
    const qOrders = query(collection(db, "orders"), where("status", "==", "pendiente"));
    const ordersSnap = await getDocs(qOrders);
    const tbodyOrders = document.getElementById('admin-orders-body');
    tbodyOrders.innerHTML = '';
    ordersSnap.forEach(d => {
        const o = d.data();
        tbodyOrders.innerHTML += `
            <tr>
                <td>${o.userEmail}</td>
                <td>${o.productName}</td>
                <td>
                    <input type="text" id="deliver-${d.id}" placeholder="Código/Credencial" style="width:150px;">
                    <button class="btn-primary" onclick="deliverOrder('${d.id}')" style="padding: 5px 10px;">Entregar</button>
                </td>
            </tr>
        `;
    });

    // 2. Pending Recharges
    const qRecharges = query(collection(db, "balance_requests"), where("status", "==", "pendiente"));
    const rechargesSnap = await getDocs(qRecharges);
    const tbodyRecharges = document.getElementById('admin-recharge-body');
    if (tbodyRecharges) {
        tbodyRecharges.innerHTML = '';
        if (rechargesSnap.empty) {
            tbodyRecharges.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No hay solicitudes de recarga pendientes.</td></tr>`;
        } else {
            rechargesSnap.forEach(d => {
                const r = d.data();
                const rDate = r.timestamp ? (r.timestamp.toDate ? r.timestamp.toDate().toLocaleDateString() : 'Reciente') : 'Reciente';
                const methodLabel = r.method || 'Transferencia';
                tbodyRecharges.innerHTML += `
                    <tr>
                        <td>${escapeHtml(r.userEmail || 'Usuario')}</td>
                        <td><span class="status-badge" style="background:rgba(161,130,232,0.15); color:var(--accent-primary); border:1px solid var(--glass-border);">${escapeHtml(methodLabel)}</span></td>
                        <td><strong style="color:var(--success);">$${(r.amount || 0).toFixed(2)}</strong></td>
                        <td><small style="color:var(--text-muted);">${rDate}</small></td>
                        <td>
                            <div style="display:flex; gap:6px;">
                                <button class="btn-primary" style="padding: 6px 12px; background: var(--success); font-size:0.82rem;" onclick="approveRecharge('${d.id}', '${r.uid}', ${r.amount})" title="Sí recibí el pago">
                                    <i class="fa-solid fa-check"></i> Sí recibí el pago
                                </button>
                                <button class="btn-secondary" style="padding: 6px 12px; color: var(--danger); border-color:var(--danger); font-size:0.82rem;" onclick="rejectRecharge('${d.id}')" title="Negar pago">
                                    <i class="fa-solid fa-xmark"></i> Negar pago
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
    }

    // 3. Products List
    const tbodyStock = document.getElementById('admin-stock-body');
    if (tbodyStock) {
        tbodyStock.innerHTML = '';
        try {
            const qProducts = await getDocs(collection(db, "products"));
            const stockDocs = await getDocs(collection(db, "products_stock"));
            const stockMap = {};
            stockDocs.forEach(sd => { stockMap[sd.id] = sd.data(); });

            if (qProducts.empty) {
                tbodyStock.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            No hay productos registrados en el inventario. Agrega uno arriba.
                        </td>
                    </tr>
                `;
            } else {
                qProducts.forEach(d => {
                    const p = d.data();
                    const s = stockMap[d.id] || { status: 'desconocido', credentialsPool: '' };
                    const poolLines = (s.credentialsPool || "").split('\n').filter(l => l.trim() !== "").length;
                    const stockInfo = s.status === 'disponible' ? `Disponible (${poolLines} en pool)` : s.status;
                    const statusClass = s.status === 'disponible' ? 'status-confirmed' : (s.status === 'bajo_pedido' ? 'status-pending' : 'status-danger');

                    tbodyStock.innerHTML += `
                        <tr>
                            <td>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <img src="${p.image || 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&w=100'}" style="width:36px; height:36px; border-radius:6px; object-fit:cover;">
                                    <strong>${escapeHtml(p.name || 'Sin nombre')}</strong>
                                </div>
                            </td>
                            <td>${escapeHtml(p.category || 'N/A')}</td>
                            <td>$${p.price || 0}</td>
                            <td><small style="color:var(--text-muted); display:block; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(p.description || 'Sin descripción')}</small></td>
                            <td><span class="status-badge ${statusClass}">${stockInfo}</span></td>
                            <td>
                                <div style="display:flex; gap:6px;">
                                    <button class="btn-secondary" style="padding:4px 8px; font-size:0.8rem;" onclick="openEditModal('${d.id}')" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                                    <button class="btn-secondary" style="padding:4px 8px; font-size:0.8rem; color:var(--danger);" onclick="deleteProduct('${d.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch(e) {
            console.error("Error loading admin products stock:", e);
            tbodyStock.innerHTML = `<tr><td colspan="6" style="color:var(--danger); text-align:center;">Error al cargar inventario: ${e.message}</td></tr>`;
        }
    }

    // 4. Users List
    const tbodyUsers = document.getElementById('admin-users-body');
    if (tbodyUsers) {
        tbodyUsers.innerHTML = '';
        try {
            const qUsers = await getDocs(collection(db, "users"));
            qUsers.forEach(uDoc => {
                const uData = uDoc.data();
                tbodyUsers.innerHTML += `
                    <tr>
                        <td>${escapeHtml(uData.email || 'Sin correo')}</td>
                        <td><small style="color:var(--text-muted);">${escapeHtml(uDoc.id)}</small></td>
                        <td>$${(uData.balance || 0).toFixed(2)}</td>
                    </tr>
                `;
            });
        } catch(e) {
            console.error("Error loading admin users:", e);
        }
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

window.approveRecharge = async function(reqId, uid, amount) {
    if(!confirm(`¿Aprobar $${amount} para este usuario?`)) return;
    try {
        await updateDoc(doc(db, 'users', uid), {
            balance: increment(amount)
        });
        await updateDoc(doc(db, 'balance_requests', reqId), {
            status: "aprobado"
        });
        alert("Recarga aprobada exitosamente.");
        loadAdminData();
    } catch(e) {
        console.error(e);
        alert("Error al aprobar recarga.");
    }
};

window.rejectRecharge = async function(reqId) {
    if(!confirm("¿Deseas negar/rechazar este pago de recarga?")) return;
    try {
        await updateDoc(doc(db, 'balance_requests', reqId), {
            status: "rechazado"
        });
        alert("Solicitud rechazada.");
        loadAdminData();
    } catch(e) {
        console.error(e);
        alert("Error al rechazar solicitud.");
    }
};

window.deliverOrder = async function(orderId) {
    const textVal = document.getElementById(`deliver-${orderId}`).value;
    if(!textVal) { alert("Ingresa la credencial a entregar."); return; }
    
    try {
        await updateDoc(doc(db, 'orders', orderId), {
            status: 'confirmado',
            textDelivered: textVal
        });
        alert("Pedido entregado.");
        loadAdminData();
    } catch(e) {
        console.error(e);
        alert("Error al entregar.");
    }
};

window.createProduct = async function() {
    const name = document.getElementById('new-prod-name').value.trim();
    const price = parseFloat(document.getElementById('new-prod-price').value);
    const minQtyInput = document.getElementById('new-prod-min-quantity');
    const minQuantity = minQtyInput ? parseInt(minQtyInput.value) || 1 : 1;
    const category = document.getElementById('new-prod-category').value;
    const img = document.getElementById('new-prod-img').value.trim();
    const desc = document.getElementById('new-prod-desc').value.trim();
    const status = document.getElementById('new-prod-status').value;
    const isFeatured = document.getElementById('new-prod-featured').checked;
    const pool = document.getElementById('new-prod-pool').value;

    if (!name || isNaN(price)) {
        alert("Nombre y Precio son obligatorios.");
        return;
    }

    try {
        const pRef = doc(collection(db, "products"));
        await setDoc(pRef, {
            name, price, minQuantity, category, image: img, description: desc, isFeatured
        });

        await setDoc(doc(db, "products_stock", pRef.id), {
            status, credentialsPool: pool
        });

        alert("Producto creado exitosamente.");
        document.getElementById('new-prod-name').value = '';
        document.getElementById('new-prod-price').value = '';
        document.getElementById('new-prod-img').value = '';
        document.getElementById('new-prod-desc').value = '';
        document.getElementById('new-prod-pool').value = '';
        document.getElementById('new-prod-featured').checked = false;

        loadAdminData();
    } catch(e) {
        console.error("Error creando producto:", e);
        alert("Error creando producto.");
    }
};

window.openEditModal = async function(prodId) {
    try {
        const pSnap = await getDoc(doc(db, 'products', prodId));
        if (!pSnap.exists()) return;
        const p = pSnap.data();

        const sSnap = await getDoc(doc(db, 'products_stock', prodId));
        const s = sSnap.exists() ? sSnap.data() : { status: 'disponible', credentialsPool: '' };

        document.getElementById('edit-prod-id').value = prodId;
        document.getElementById('edit-prod-name').value = p.name || '';
        document.getElementById('edit-prod-price').value = p.price || 0;
        const minQ = document.getElementById('edit-prod-min-quantity');
        if(minQ) minQ.value = p.minQuantity || 1;
        document.getElementById('edit-prod-category').value = p.category || 'juegos';
        document.getElementById('edit-prod-img').value = p.image || '';
        document.getElementById('edit-prod-desc').value = p.description || '';
        document.getElementById('edit-prod-status').value = s.status || 'disponible';
        document.getElementById('edit-prod-featured').checked = !!p.isFeatured;
        document.getElementById('edit-prod-pool').value = s.credentialsPool || '';

        document.getElementById('edit-product-modal').classList.add('active');
    } catch(err) {
        console.error("Error opening edit modal:", err);
    }
};

window.closeEditModal = function() {
    const modal = document.getElementById('edit-product-modal');
    if (modal) modal.classList.remove('active');
};

window.saveEditedProduct = async function() {
    const prodId = document.getElementById('edit-prod-id').value;
    if (!prodId) return;

    const name = document.getElementById('edit-prod-name').value.trim();
    const price = parseFloat(document.getElementById('edit-prod-price').value);
    const minQtyInput = document.getElementById('edit-prod-min-quantity');
    const minQuantity = minQtyInput ? parseInt(minQtyInput.value) || 1 : 1;
    const category = document.getElementById('edit-prod-category').value;
    const img = document.getElementById('edit-prod-img').value.trim();
    const desc = document.getElementById('edit-prod-desc').value.trim();
    const status = document.getElementById('edit-prod-status').value;
    const isFeatured = document.getElementById('edit-prod-featured').checked;
    const pool = document.getElementById('edit-prod-pool').value;

    if (!name || isNaN(price)) {
        alert("Nombre y Precio son obligatorios.");
        return;
    }

    try {
        await updateDoc(doc(db, "products", prodId), {
            name, price, minQuantity, category, image: img, description: desc, isFeatured
        });

        await setDoc(doc(db, 'products_stock', prodId), {
            status, credentialsPool: pool
        }, { merge: true });

        closeEditModal();
        alert("Producto actualizado correctamente.");
        loadAdminData();
    } catch(err) {
        console.error("Error updating product:", err);
        alert("Error al actualizar producto.");
    }
};

window.deleteProduct = async function(prodId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto del inventario?")) return;
    try {
        await deleteDoc(doc(db, 'products', prodId));
        await deleteDoc(doc(db, 'products_stock', prodId));
        alert("Producto eliminado.");
        loadAdminData();
    } catch(err) {
        console.error("Error deleting product:", err);
    }
};
