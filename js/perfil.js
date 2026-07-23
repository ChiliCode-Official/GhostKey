import { auth, db, provider } from './firebase-config.js';
import { onAuthStateChanged, signOut, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authGuard.style.display = 'none';
        profileContent.style.display = 'block';
        
        // Render basic info on GhostCard
        if (cardName) cardName.textContent = user.displayName || user.email;
        if (cardUid) cardUid.textContent = user.uid;
        userAvatars.forEach(img => {
            img.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=A182E8&color=fff`;
        });

        // Check Admin Role
        if (user.email === ADMIN_EMAIL) {
            adminView.style.display = 'block';
            clientView.style.display = 'none';
            loadAdminData();
        } else {
            adminView.style.display = 'none';
            clientView.style.display = 'block';
            loadClientData(user.uid);
        }
    } else {
        currentUser = null;
        authGuard.style.display = 'block';
        profileContent.style.display = 'none';
    }
});

btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
});

btnLoginGuard.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch(err) {
        console.error(err);
    }
});

// --- Client Logic ---
async function loadClientData(uid) {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            userBalance.textContent = data.balance ? data.balance.toFixed(2) : '0.00';
            
            // Load Orders
            const qOrders = query(collection(db, "orders"), where("uid", "==", uid));
            const ordersSnap = await getDocs(qOrders);
            const tbody = document.getElementById('client-orders-body');
            tbody.innerHTML = '';
            ordersSnap.forEach(d => {
                const o = d.data();
                const dDate = o.timestamp ? o.timestamp.toDate().toLocaleDateString() : 'Reciente';
                const statusClass = o.status === 'pendiente' ? 'status-pending' : 'status-confirmed';
                tbody.innerHTML += `
                    <tr>
                        <td>${dDate}</td>
                        <td>${o.productName}</td>
                        <td><span class="status-badge ${statusClass}">${o.status.toUpperCase()}</span></td>
                        <td>${o.textDelivered || 'Procesando...'}</td>
                    </tr>
                `;
            });
            // Wishlist logic could be added here
        }
    } catch(err) {
        console.error("Error loading client data:", err);
    }
}

window.processRecharge = async function() {
    const inputAmount = document.getElementById('custom-recharge').value;
    const amount = parseFloat(inputAmount);
    
    if (isNaN(amount) || amount <= 0) {
        alert("Ingresa un monto válido.");
        return;
    }
    
    if (!currentUser) return;

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
        window.open(waUrl, '_blank');
        
        closeRechargeModal();
        alert("Solicitud creada. Tu saldo se reflejará una vez confirmado.");
        loadClientData(currentUser.uid); // Refresh
    } catch(err) {
        console.error(err);
        alert("Error al procesar la recarga.");
    }
};

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
    tbodyRecharges.innerHTML = '';
    rechargesSnap.forEach(d => {
        const r = d.data();
        tbodyRecharges.innerHTML += `
            <tr>
                <td>${r.userEmail}</td>
                <td>$${r.amount}</td>
                <td>
                    <button class="btn-primary" style="padding: 5px 10px; background: var(--success);" onclick="approveRecharge('${d.id}', '${r.uid}', ${r.amount})">Aprobar</button>
                </td>
            </tr>
        `;
    });

    // 3. Products List
    const qProducts = await getDocs(collection(db, "products"));
    const tbodyStock = document.getElementById('admin-stock-body');
    tbodyStock.innerHTML = '';
    const stockDocs = await getDocs(collection(db, "products_stock"));
    const stockMap = {};
    stockDocs.forEach(sd => { stockMap[sd.id] = sd.data(); });

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
        alert("Recarga aprobada");
        loadAdminData();
    } catch(e) {
        console.error(e);
        alert("Error al aprobar");
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
            name, price, category, image: img, description: desc, isFeatured
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
        await updateDoc(doc(db, 'products', prodId), {
            name, price, category, image: img, description: desc, isFeatured
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
