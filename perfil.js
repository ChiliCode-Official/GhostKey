import { app, auth, db, googleProvider } from "./firebase-config.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const authSection = document.getElementById('authSection');
const userDashboard = document.getElementById('userDashboard');
const adminDashboard = document.getElementById('adminDashboard');

const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

let currentUser = null;
let isAdmin = false;
let allProducts = [];

// Real-time Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // ADMIN EMAIL SET AS REQUESTED
        // WARNING: Frontend validation can be bypassed. Ensure you implement Firestore Security Rules.
        isAdmin = (user.email === 'lrodricg30@gmail.com');
        
        authSection.style.display = 'none';
        
        if (isAdmin) {
            adminDashboard.style.display = 'block';
            await loadAdminProducts();
            loadAdminData();
        } else {
            userDashboard.style.display = 'block';
            loadUserData();
        }
    } else {
        currentUser = null;
        isAdmin = false;
        authSection.style.display = 'block';
        userDashboard.style.display = 'none';
        adminDashboard.style.display = 'none';
    }
});

// Auth Functions
googleLoginBtn.onclick = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        // Check if user doc exists, if not create
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            const referralUid = localStorage.getItem('referralUid');
            const newUserData = {
                email: user.email,
                username: user.displayName || user.email.split('@')[0],
                balance: 0,
                createdAt: new Date().toISOString()
            };
            if (referralUid) {
                newUserData.referredBy = referralUid;
            }
            await setDoc(userRef, newUserData);
        }
    } catch(e) {
        console.error("Google Login Error", e);
        alert("Error al iniciar sesión con Google. (Recuerda que debes usar Live Server o GitHub Pages).");
    }
};

logoutBtn.onclick = () => signOut(auth);
adminLogoutBtn.onclick = () => signOut(auth);

// Load Products from Firebase
async function loadAdminProducts() {
    try {
        const freshSnap = await getDocs(collection(db, "products"));
        allProducts = [];
        freshSnap.forEach(docSnap => {
            allProducts.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort by numeric id if possible
        allProducts.sort((a,b) => parseInt(a.id) - parseInt(b.id));
    } catch(e) {
        console.error("Error al cargar productos:", e);
        alert("⚠️ No se pudieron cargar los productos en el panel.");
    }
}

// User Data Loading
async function loadUserData() {
    document.getElementById('userUidDisplay').innerText = currentUser.uid;
    
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    let userData = null;
    if (userSnap.exists()) {
        userData = userSnap.data();
        document.getElementById('userBalance').innerText = `$${userData.balance.toFixed(2)} MXN`;
    }

    const q = query(collection(db, "orders"), where("uid", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    const tbody = document.querySelector('#userOrdersTable tbody');
    tbody.innerHTML = '';
    
    if (querySnapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 30px; color:var(--text-secondary);">No tienes pedidos registrados aún.</td></tr>';
    } else {
        // Sort orders in memory (descending by timestamp)
        let userOrders = [];
        querySnapshot.forEach(docSnap => userOrders.push({ id: docSnap.id, ...docSnap.data() }));
        userOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        userOrders.forEach(data => {
            let statusBadge = '';
            let deliveryContent = '';

            if (data.status === 'pendiente') {
                statusBadge = '<span class="status-pill pending"><i class="fas fa-clock"></i> Pendiente</span>';
                deliveryContent = '<span style="color:var(--text-secondary); font-size:0.85rem; font-style:italic;">Preparando tu entrega...</span>';
            } else if (data.status === 'confirmado') {
                statusBadge = '<span class="status-pill delivered"><i class="fas fa-check-circle"></i> Entregado</span>';
                const escText = (data.textDelivered || '').replace(/'/g, "\\'");
                
                let giftHtml = '';
                if (data.giftMessage) {
                    giftHtml = `<div style="margin-top:8px; font-size:0.8rem; color:var(--accent-yellow); background:rgba(255,215,0,0.1); padding:8px; border-radius:6px; border:1px dashed var(--accent-yellow);">
                        <i class="fas fa-gift"></i> <strong>Mensaje de regalo:</strong> "${data.giftMessage}"
                    </div>`;
                }

                deliveryContent = `
                    <div class="credential-box">
                        <span style="font-weight:600; font-size:0.9rem; word-break:break-all;">${data.textDelivered}</span>
                        <button class="copy-btn" onclick="copyToClipboard('${escText}', this)"><i class="far fa-copy"></i> Copiar</button>
                    </div>
                    ${giftHtml}
                `;
            }
            
            tbody.innerHTML += `
                <tr>
                    <td style="font-family:monospace; font-size:0.8rem; color:rgba(255,255,255,0.4);">${data.id.substring(0,8)}...</td>
                    <td style="font-weight:600;">${data.productName}</td>
                    <td>${statusBadge}</td>
                    <td>${deliveryContent}</td>
                </tr>
            `;
        });
    }

    // Render Wishlist
    const wishlistGrid = document.getElementById('userWishlistGrid');
    if (wishlistGrid) {
        wishlistGrid.innerHTML = '';
        const wishlistIds = userData?.wishlist || [];
        if (wishlistIds.length === 0) {
            wishlistGrid.innerHTML = '<p style="color:var(--text-secondary); padding: 10px 0;">No tienes productos agregados a tu lista de deseos.</p>';
        } else {
            const productsSnap = await getDocs(collection(db, "products"));
            let productsMap = {};
            productsSnap.forEach(d => { productsMap[d.id] = {id: d.id, ...d.data()} });
            
            wishlistIds.forEach(pid => {
                const p = productsMap[pid];
                if (p) {
                    wishlistGrid.innerHTML += `
                        <div class="product-card" onclick="window.location.href='producto.html?id=${p.id}'" style="cursor:pointer; display:flex; flex-direction:column;">
                            <div class="product-image-container" style="height:140px;">
                                <img src="${p.image}" alt="${p.name}">
                            </div>
                            <div class="product-info" style="padding:16px;">
                                <h4 class="product-title" style="font-size:0.95rem; margin-bottom:8px;">${p.name}</h4>
                                <div class="product-footer">
                                    <span class="price">$${p.price.toFixed(2)} MXN</span>
                                    <button class="wishlist-btn active" data-productid="${p.id}" onclick="event.stopPropagation(); toggleWishlist('${p.id}'); this.closest('.product-card').remove();" style="background:none; border:none; color:var(--accent-red); cursor:pointer; font-size:1.2rem; transition:color 0.3s; z-index:10;"><i class="fas fa-heart"></i></button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
        }
    }
    
    // Render Recharges History
    await loadUserRecharges();
}

// Admin Data Loading
async function loadAdminData() {
    loadAdminOrders();
    loadAdminInventory();
    loadAdminCatalog();
    loadAdminPaymentMethods();
    loadAdminRecharges();
    updateAdminStats();
}

async function updateAdminStats() {
    try {
        const ordersSnap = await getDocs(collection(db, "orders"));
        const productsSnap = await getDocs(collection(db, "products"));
        
        let pending = 0;
        ordersSnap.forEach(d => {
            if(d.data().status === 'pendiente') pending++;
        });

        document.getElementById('statOrdersCount').innerText = ordersSnap.size;
        document.getElementById('statPendingCount').innerText = pending;
        document.getElementById('statProductsCount').innerText = productsSnap.size;
    } catch(e) {
        console.error("Stats error:", e);
    }
}

async function loadAdminOrders() {
    const querySnapshot = await getDocs(collection(db, "orders"));
    const tbody = document.getElementById('adminOrdersTable');
    tbody.innerHTML = '';
    
    let ordersList = [];
    querySnapshot.forEach(docSnap => ordersList.push({ id: docSnap.id, ...docSnap.data() }));
    ordersList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (ordersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-secondary);">No hay pedidos registrados.</td></tr>';
        return;
    }

    ordersList.forEach(data => {
        let statusBadge = '';
        let actionBtn = '';
        if (data.status === 'pendiente') {
            statusBadge = '<span class="status-pill pending"><i class="fas fa-clock"></i> Pendiente</span>';
            actionBtn = `<button class="admin-btn-action" onclick="openDeliveryModal('${data.id}', '${data.productId}')"><i class="fas fa-paper-plane"></i> Entregar</button>`;
        } else {
            statusBadge = '<span class="status-pill delivered"><i class="fas fa-check-circle"></i> Entregado</span>';
            actionBtn = `<span style="font-size:0.85rem; color:var(--text-secondary); font-weight:600;"><i class="fas fa-check"></i> Completado</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td style="font-family:monospace; font-size:0.8rem; color:rgba(255,255,255,0.4);">${data.id.substring(0,8)}...</td>
                <td style="font-weight:600;">${data.userEmail}</td>
                <td style="font-weight:600;">${data.productName}</td>
                <td style="text-transform: capitalize; color: var(--accent-yellow); font-weight:600;">$${data.price.toFixed(2)} (${data.method})</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

// Sleek Modal delivery popups
window.openDeliveryModal = async (orderId, productId) => {
    document.getElementById('modalOrderId').value = orderId;
    document.getElementById('modalProductId').value = productId;
    
    // Check if there are keys in the credentials pool
    let prefilledKey = "";
    try {
        const stockDoc = await getDoc(doc(db, "products_stock", productId));
        if (stockDoc.exists()) {
            const pool = stockDoc.data().credentialsPool || "";
            const lines = pool.split('\n').filter(l => l.trim() !== '');
            if (lines.length > 0) {
                prefilledKey = lines[0]; // Propose the first available key
            }
        }
    } catch(e) {
        console.error(e);
    }
    
    document.getElementById('modalDeliveryText').value = prefilledKey;
    document.getElementById('deliveryModal').classList.add('active');
};

window.closeDeliveryModal = () => {
    document.getElementById('deliveryModal').classList.remove('active');
};

window.confirmDeliveryAction = async () => {
    const orderId = document.getElementById('modalOrderId').value;
    const productId = document.getElementById('modalProductId').value;
    const textToDeliver = document.getElementById('modalDeliveryText').value.trim();

    if(!textToDeliver) {
        alert("Escribe una clave o credencial para entregar.");
        return;
    }

    try {
        const stockRef = doc(db, "products_stock", productId);
        const stockSnap = await getDoc(stockRef);
        
        if (stockSnap.exists()) {
            const pool = stockSnap.data().credentialsPool || "";
            let lines = pool.split('\n').filter(l => l.trim() !== '');
            
            // If the delivered text matches the proposed first key, remove it from the pool
            if (lines.length > 0 && lines[0] === textToDeliver) {
                lines.shift();
                await updateDoc(stockRef, {
                    credentialsPool: lines.join('\n'),
                    status: lines.length === 0 ? 'agotado' : stockSnap.data().status
                });
            }
        }
        
        // Update order in Firestore
        const orderRef = doc(db, "orders", orderId);
        const orderSnap = await getDoc(orderRef);
        
        await updateDoc(orderRef, {
            status: 'confirmado',
            textDelivered: textToDeliver
        });
        
        // --- Referral Commission Logic ---
        if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            // Determine the true buyer (if gifted, giftedBy paid for it)
            const trueBuyerUid = orderData.giftedBy ? orderData.giftedBy : orderData.uid;
            
            // Fetch true buyer to check if they were referred
            const buyerRef = doc(db, "users", trueBuyerUid);
            const buyerSnap = await getDoc(buyerRef);
            
            if (buyerSnap.exists() && buyerSnap.data().referredBy) {
                const referrerUid = buyerSnap.data().referredBy;
                const referrerRef = doc(db, "users", referrerUid);
                const referrerSnap = await getDoc(referrerRef);
                
                if (referrerSnap.exists()) {
                    // Calculate 3% of the price (we need product price, which we have in orderData.price)
                    const commission = (orderData.price || 0) * 0.03;
                    if (commission > 0) {
                        const newBalance = (referrerSnap.data().balance || 0) + commission;
                        await updateDoc(referrerRef, { balance: newBalance });
                        console.log(`Comisión de $${commission} MXN otorgada a ${referrerUid}`);
                    }
                }
            }
        }
        // ---------------------------------
        
        window.closeDeliveryModal();
        alert("Pedido completado y entregado con éxito.");
        loadAdminOrders();
        loadAdminInventory();
        updateAdminStats();
    } catch(e) {
        console.error(e);
        alert("Error al entregar el pedido.");
    }
};

async function loadAdminInventory() {
    const tbody = document.getElementById('adminInventoryTable');
    tbody.innerHTML = '';

    if (allProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-secondary);">No hay productos en el catálogo.</td></tr>';
        return;
    }

    for (const prod of allProducts) {
        const stockRef = doc(db, "products_stock", prod.id);
        const stockSnap = await getDoc(stockRef);
        let stockData = stockSnap.exists() ? stockSnap.data() : { status: 'disponible', credentialsPool: '' };
        
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:600;">${prod.name}</td>
                <td>
                    <select id="status_${prod.id}" class="admin-input-styled" style="width: auto; padding: 8px 12px;">
                        <option value="disponible" ${stockData.status==='disponible'?'selected':''}>En Stock / Disponible</option>
                        <option value="bajo_pedido" ${stockData.status==='bajo_pedido'?'selected':''}>Bajo Pedido</option>
                        <option value="agotado" ${stockData.status==='agotado'?'selected':''}>Agotado</option>
                    </select>
                </td>
                <td>
                    <textarea id="pool_${prod.id}" class="admin-input-styled" style="height: 60px; font-family: monospace; font-size: 0.85rem; padding: 8px 12px;" placeholder="Pega una credencial por línea...">${stockData.credentialsPool || ''}</textarea>
                </td>
                <td>
                    <button class="admin-btn-action" onclick="window.saveInventory('${prod.id}')"><i class="fas fa-save"></i> Guardar</button>
                </td>
            </tr>
        `;
    }
}

// CATALOG CRUD FUNCTIONS
async function loadAdminCatalog() {
    const tbody = document.getElementById('adminCatalogTable');
    tbody.innerHTML = '';

    if (allProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-secondary);">No hay productos en el catálogo.</td></tr>';
        return;
    }

    for (const prod of allProducts) {
        tbody.innerHTML += `
            <tr>
                <td><img src="${prod.image}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border:1px solid rgba(255,255,255,0.05);"></td>
                <td style="font-weight:600;">${prod.name}</td>
                <td style="font-weight:700; color:var(--text-primary);">$${prod.price.toFixed(2)} MXN</td>
                <td><span class="status-pill pending" style="background: rgba(122,61,214,0.1); color: var(--text-primary); border: 1px solid rgba(122,61,214,0.3); font-size:0.7rem;">${prod.category}</span></td>
                <td>
                    <button class="admin-btn-action secondary" style="padding: 8px 12px;" onclick="window.editProduct('${prod.id}')"><i class="fas fa-edit"></i></button>
                    <button class="admin-btn-action danger" style="padding: 8px 12px;" onclick="window.deleteProduct('${prod.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }
}

window.saveProduct = async () => {
    const id = document.getElementById('editProdId').value;
    const name = document.getElementById('newProdName').value.trim();
    const desc = document.getElementById('newProdDesc').value.trim();
    const price = parseFloat(document.getElementById('newProdPrice').value);
    const category = document.getElementById('newProdCategory').value;
    const image = document.getElementById('newProdImage').value.trim();

    if(!name || isNaN(price) || !image) {
        alert("Llena los campos obligatorios (Nombre, Precio, Imagen)");
        return;
    }

    try {
        if(id) {
            // Edit
            await updateDoc(doc(db, "products", id), { name, description: desc, price, category, image });
            alert("Producto actualizado con éxito");
        } else {
            // Create
            const newId = Date.now().toString();
            await setDoc(doc(db, "products", newId), { id: parseInt(newId), name, description: desc, price, category, image });
            alert("Producto creado con éxito");
        }
        window.resetProductForm();
        await loadAdminProducts(); // Reloads allProducts array
        loadAdminCatalog();
        loadAdminInventory();
        updateAdminStats();
    } catch (e) {
        console.error(e);
        alert("Error al guardar producto");
    }
};

window.editProduct = (id) => {
    const p = allProducts.find(x => String(x.id) === String(id));
    if(!p) {
        console.error("Product not found:", id, allProducts);
        return;
    }
    document.getElementById('editProdId').value = p.id;
    document.getElementById('newProdName').value = p.name;
    document.getElementById('newProdDesc').value = p.description;
    document.getElementById('newProdPrice').value = p.price;
    document.getElementById('newProdCategory').value = p.category;
    document.getElementById('newProdImage').value = p.image;
    
    document.getElementById('formCatalogTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Producto';
    document.getElementById('saveProdBtn').innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Producto';
    document.getElementById('cancelProdBtn').style.display = "inline-flex";
    
    // Scroll to form
    document.getElementById('tab-products').scrollIntoView({ behavior: "smooth" });
};

window.resetProductForm = () => {
    document.getElementById('editProdId').value = "";
    document.getElementById('newProdName').value = "";
    document.getElementById('newProdDesc').value = "";
    document.getElementById('newProdPrice').value = "";
    document.getElementById('newProdCategory').value = "vbucks";
    document.getElementById('newProdImage').value = "";
    
    document.getElementById('formCatalogTitle').innerHTML = '<i class="fas fa-plus"></i> Crear Nuevo Producto';
    document.getElementById('saveProdBtn').innerHTML = '<i class="fas fa-check"></i> Guardar Producto';
    document.getElementById('cancelProdBtn').style.display = "none";
};

window.deleteProduct = async (id) => {
    if(confirm("¿Seguro que quieres eliminar este producto?")) {
        try {
            await deleteDoc(doc(db, "products", id));
            await deleteDoc(doc(db, "products_stock", id));
            alert("Producto eliminado con éxito");
            await loadAdminProducts();
            loadAdminCatalog();
            loadAdminInventory();
            updateAdminStats();
        } catch(e) {
            console.error(e);
            alert("Error al eliminar el producto");
        }
    }
};

window.saveInventory = async (productId) => {
    const status = document.getElementById(`status_${productId}`).value;
    const pool = document.getElementById(`pool_${productId}`).value;
    
    try {
        await setDoc(doc(db, "products_stock", productId), {
            productId: productId,
            status: status,
            credentialsPool: pool
        }, { merge: true });
        alert("Stock actualizado con éxito.");
        updateAdminStats();
    } catch(e) {
        console.error(e);
        alert("Error al guardar el stock.");
    }
};

window.searchUser = async () => {
    const email = document.getElementById('searchUserEmail').value.trim();
    if(!email) {
        alert("Ingresa un email para buscar.");
        return;
    }
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    
    const tbody = document.getElementById('adminUsersTable');
    tbody.innerHTML = '';
    
    if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-secondary);">Usuario no encontrado.</td></tr>';
        return;
    }

    snap.forEach(docSnap => {
        const data = docSnap.data();
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:600;">${data.email}</td>
                <td style="font-family:monospace; font-size: 0.8rem; color:rgba(255,255,255,0.5);">${docSnap.id}</td>
                <td style="font-weight:700; color:var(--accent-yellow);">$${data.balance.toFixed(2)} MXN</td>
                <td>
                    <div style="display:flex; gap: 8px; align-items:center;">
                        <input type="number" id="addBalance_${docSnap.id}" class="admin-input-styled" style="width: 100px; padding: 8px;" placeholder="Monto">
                        <button class="admin-btn-action" style="padding: 8px 16px;" onclick="window.addBalance('${docSnap.id}', ${data.balance})"><i class="fas fa-plus"></i> Añadir</button>
                    </div>
                </td>
            </tr>
        `;
    });
};

window.addBalance = async (uid, currentBalance) => {
    const amount = parseFloat(document.getElementById(`addBalance_${uid}`).value);
    if(isNaN(amount) || amount <= 0) {
        alert("Ingresa una cantidad válida a sumar.");
        return;
    }
    
    try {
        await updateDoc(doc(db, "users", uid), {
            balance: currentBalance + amount
        });
        alert("Saldo añadido exitosamente.");
        window.searchUser(); // refresh search table
    } catch(e) {
        console.error(e);
        alert("Error al añadir saldo.");
    }
};

// --- PAYMENT METHODS CRUD ---
let allPaymentMethods = [];

async function loadAdminPaymentMethods() {
    const tbody = document.getElementById('adminPaymentMethodsTable');
    if(!tbody) return;
    tbody.innerHTML = '';
    allPaymentMethods = [];

    const snap = await getDocs(collection(db, "payment_methods"));
    snap.forEach(docSnap => {
        allPaymentMethods.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (allPaymentMethods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-secondary);">No hay métodos de pago registrados.</td></tr>';
        return;
    }

    allPaymentMethods.forEach(method => {
        const statusIcon = method.active ? '<span class="status-pill delivered"><i class="fas fa-check"></i> Activo</span>' : '<span class="status-pill pending" style="background:rgba(244,63,94,0.1); color:var(--accent-red); border-color:rgba(244,63,94,0.3);"><i class="fas fa-times"></i> Inactivo</span>';
        tbody.innerHTML += `
            <tr>
                <td>${statusIcon}</td>
                <td style="font-weight:600;">${method.bank}</td>
                <td style="font-family:monospace; font-size:0.85rem;">${method.account}</td>
                <td style="font-weight:600;">${method.name}</td>
                <td>
                    <button class="admin-btn-action secondary" style="padding: 8px 12px;" onclick="window.editPaymentMethod('${method.id}')"><i class="fas fa-edit"></i></button>
                    <button class="admin-btn-action danger" style="padding: 8px 12px;" onclick="window.deletePaymentMethod('${method.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

window.savePaymentMethod = async () => {
    const id = document.getElementById('editPayMethodId').value;
    const bank = document.getElementById('newPayMethodBank').value.trim();
    const name = document.getElementById('newPayMethodName').value.trim();
    const account = document.getElementById('newPayMethodAccount').value.trim();
    const concept = document.getElementById('newPayMethodConcept').value.trim();
    const active = document.getElementById('newPayMethodActive').checked;

    if(!bank || !name || !account) {
        alert("Llena los campos obligatorios (Banco, Nombre, Cuenta)");
        return;
    }

    try {
        if(id) {
            await updateDoc(doc(db, "payment_methods", id), { bank, name, account, concept, active });
            alert("Método de pago actualizado");
        } else {
            const newId = Date.now().toString();
            await setDoc(doc(db, "payment_methods", newId), { bank, name, account, concept, active, createdAt: Date.now() });
            alert("Método de pago guardado");
        }
        window.resetPaymentMethodForm();
        loadAdminPaymentMethods();
    } catch (e) {
        console.error(e);
        alert("Error al guardar método de pago");
    }
};

window.editPaymentMethod = (id) => {
    const m = allPaymentMethods.find(x => x.id === id);
    if(!m) return;
    document.getElementById('editPayMethodId').value = m.id;
    document.getElementById('newPayMethodBank').value = m.bank || '';
    document.getElementById('newPayMethodName').value = m.name || '';
    document.getElementById('newPayMethodAccount').value = m.account || '';
    document.getElementById('newPayMethodConcept').value = m.concept || '';
    document.getElementById('newPayMethodActive').checked = m.active !== false;
    
    document.getElementById('formPayTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Método de Pago';
    document.getElementById('savePayMethodBtn').innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Método';
    document.getElementById('cancelPayMethodBtn').style.display = "inline-flex";
    document.getElementById('tab-paymentMethods').scrollIntoView({ behavior: "smooth" });
};

window.resetPaymentMethodForm = () => {
    document.getElementById('editPayMethodId').value = "";
    document.getElementById('newPayMethodBank').value = "";
    document.getElementById('newPayMethodName').value = "";
    document.getElementById('newPayMethodAccount').value = "";
    document.getElementById('newPayMethodConcept').value = "";
    document.getElementById('newPayMethodActive').checked = true;
    
    document.getElementById('formPayTitle').innerHTML = '<i class="fas fa-plus"></i> Crear Método de Pago';
    document.getElementById('savePayMethodBtn').innerHTML = '<i class="fas fa-check"></i> Guardar Método';
    document.getElementById('cancelPayMethodBtn').style.display = "none";
};

window.deletePaymentMethod = async (id) => {
    if(confirm("¿Seguro que quieres eliminar este método de pago?")) {
        try {
            await deleteDoc(doc(db, "payment_methods", id));
            alert("Método de pago eliminado");
            loadAdminPaymentMethods();
        } catch(e) {
            console.error(e);
            alert("Error al eliminar");
        }
    }
};
};

// --- RECHARGES LOGIC ---
async function loadUserRecharges() {
    const tbody = document.getElementById('userRechargesTable').querySelector('tbody');
    if (!tbody) return;
    
    const q = query(collection(db, "recharge_requests"), where("uid", "==", currentUser.uid));
    const snap = await getDocs(q);
    
    let recharges = [];
    snap.forEach(doc => recharges.push({ id: doc.id, ...doc.data() }));
    recharges.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    tbody.innerHTML = '';
    
    if (recharges.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color:var(--text-secondary);">No tienes solicitudes de saldo.</td></tr>';
        return;
    }
    
    recharges.forEach(req => {
        let statusHtml = '';
        if (req.status === 'pending') statusHtml = '<span class="status-pill pending"><i class="fas fa-clock"></i> Pendiente</span>';
        else if (req.status === 'approved') statusHtml = '<span class="status-pill delivered"><i class="fas fa-check"></i> Aprobado</span>';
        else if (req.status === 'rejected') statusHtml = '<span class="status-pill pending" style="background:rgba(244,63,94,0.1); color:var(--accent-red); border-color:rgba(244,63,94,0.3);"><i class="fas fa-times"></i> Rechazado</span>';
        
        const date = new Date(req.timestamp).toLocaleDateString();
        
        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td style="font-weight: bold;">$${req.amount.toFixed(2)} MXN</td>
                <td>${statusHtml}</td>
            </tr>
        `;
    });
}

async function loadAdminRecharges() {
    const tbody = document.getElementById('adminRechargesTable');
    if (!tbody) return;
    
    const snap = await getDocs(collection(db, "recharge_requests"));
    
    let recharges = [];
    snap.forEach(doc => recharges.push({ id: doc.id, ...doc.data() }));
    recharges.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    tbody.innerHTML = '';
    
    if (recharges.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:var(--text-secondary);">No hay solicitudes de saldo.</td></tr>';
        return;
    }
    
    recharges.forEach(req => {
        let statusHtml = '';
        let actionBtns = '';
        
        if (req.status === 'pending') {
            statusHtml = '<span class="status-pill pending"><i class="fas fa-clock"></i> Pendiente</span>';
            actionBtns = `
                <button class="admin-btn-action" style="padding: 6px 10px;" onclick="window.approveRecharge('${req.id}', '${req.uid}', ${req.amount})"><i class="fas fa-check"></i></button>
                <button class="admin-btn-action danger" style="padding: 6px 10px;" onclick="window.rejectRecharge('${req.id}')"><i class="fas fa-times"></i></button>
            `;
        } else if (req.status === 'approved') {
            statusHtml = '<span class="status-pill delivered"><i class="fas fa-check"></i> Aprobado</span>';
            actionBtns = '<span style="color:var(--text-secondary);"><i class="fas fa-check"></i></span>';
        } else if (req.status === 'rejected') {
            statusHtml = '<span class="status-pill pending" style="background:rgba(244,63,94,0.1); color:var(--accent-red); border-color:rgba(244,63,94,0.3);"><i class="fas fa-times"></i> Rechazado</span>';
            actionBtns = '<span style="color:var(--text-secondary);"><i class="fas fa-times"></i></span>';
        }
        
        const date = new Date(req.timestamp).toLocaleDateString();
        
        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${req.username || req.email}</td>
                <td style="font-size:0.85rem; color:var(--text-secondary);">${req.email}</td>
                <td style="font-weight: bold; color: var(--accent-yellow);">$${req.amount.toFixed(2)} MXN</td>
                <td>${statusHtml}</td>
                <td style="display: flex; gap: 8px;">${actionBtns}</td>
            </tr>
        `;
    });
}

window.approveRecharge = async (reqId, uid, amount) => {
    if(!confirm(\`¿Aprobar recarga de $${amount} MXN?\`)) return;
    
    try {
        // Update request status
        await updateDoc(doc(db, "recharge_requests", reqId), { status: 'approved' });
        
        // Update user balance
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const currentBalance = userSnap.data().balance || 0;
            await updateDoc(userRef, { balance: currentBalance + amount });
        }
        
        alert("Recarga aprobada y saldo actualizado.");
        loadAdminRecharges();
    } catch (e) {
        console.error(e);
        alert("Error al aprobar recarga.");
    }
};

window.rejectRecharge = async (reqId) => {
    if(!confirm("¿Rechazar esta solicitud?")) return;
    
    try {
        await updateDoc(doc(db, "recharge_requests", reqId), { status: 'rejected' });
        alert("Solicitud rechazada.");
        loadAdminRecharges();
    } catch (e) {
        console.error(e);
        alert("Error al rechazar recarga.");
    }
};
