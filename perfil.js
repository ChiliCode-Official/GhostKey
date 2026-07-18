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
        isAdmin = (user.email === 'lrodricg30@gmail.com');
        
        authSection.style.display = 'none';
        
        if (isAdmin) {
            adminDashboard.style.display = 'block';
            await checkAndSeedProducts();
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
            await setDoc(userRef, {
                email: user.email,
                balance: 0,
                createdAt: new Date().toISOString()
            });
        }
    } catch(e) {
        console.error("Google Login Error", e);
        alert("Error al iniciar sesión con Google. (Recuerda que debes usar Live Server o GitHub Pages).");
    }
};

document.getElementById('adminUser').style.display = 'none';
document.getElementById('adminPass').style.display = 'none';
document.getElementById('adminLoginBtn').style.display = 'none';
document.querySelector('.admin-login-box h4').style.display = 'none';

logoutBtn.onclick = () => signOut(auth);
adminLogoutBtn.onclick = () => signOut(auth);

// --- SEEDING FUNCTION ---
async function checkAndSeedProducts() {
    try {
        if (typeof products !== 'undefined') {
            let seededAny = false;
            for (const p of products) {
                const docRef = doc(db, "products", String(p.id));
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    await setDoc(docRef, p);
                    seededAny = true;
                }
            }
            if(seededAny) console.log("Seeding complete.");
        }
        
        // Load products array from Firestore for Admin usage
        const freshSnap = await getDocs(collection(db, "products"));
        allProducts = [];
        freshSnap.forEach(docSnap => {
            allProducts.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort by numeric id if possible
        allProducts.sort((a,b) => parseInt(a.id) - parseInt(b.id));
    } catch(e) {
        console.error("Error al cargar/sembrar productos:", e);
        alert("⚠️ No se pudieron cargar los productos. Asegúrate de haber actualizado las Reglas de Firebase (Rules) como te indiqué. Si no lo haces, Firebase bloquea el acceso.");
        // Fallback a los locales para que el panel no quede en blanco
        if (typeof products !== 'undefined') {
            allProducts = [...products];
        }
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
        tbody.innerHTML = '<tr><td colspan="4">No tienes pedidos aún.</td></tr>';
    } else {
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            let statusBadge = '';
            if (data.status === 'pendiente') statusBadge = '<span style="color: #ffb703;">Pendiente</span>';
            if (data.status === 'confirmado') statusBadge = '<span style="color: #00ff00;">Entregado</span>';
            
            tbody.innerHTML += `
                <tr>
                    <td style="font-size: 0.8em; color: rgba(255,255,255,0.5);">${docSnap.id.substring(0,8)}...</td>
                    <td>${data.productName}</td>
                    <td>${statusBadge}</td>
                    <td style="font-family: monospace; color: #5113fa;">${data.textDelivered || 'Procesando...'}</td>
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
            wishlistGrid.innerHTML = '<p style="color:var(--text-secondary);">No tienes productos en tu lista de deseos.</p>';
        } else {
            const productsSnap = await getDocs(collection(db, "products"));
            let productsMap = {};
            productsSnap.forEach(d => { productsMap[d.id] = {id: d.id, ...d.data()} });
            
            wishlistIds.forEach(pid => {
                const p = productsMap[pid];
                if (p) {
                    wishlistGrid.innerHTML += `
                        <div class="product-card" onclick="window.location.href='producto.html?id=${p.id}'" style="cursor:pointer; display:flex; flex-direction:column;">
                            <div class="product-image-container" style="height:120px;">
                                <img src="${p.image}" alt="${p.name}">
                            </div>
                            <div class="product-info" style="padding:12px;">
                                <h4 class="product-title" style="font-size:0.9rem; margin-bottom:8px;">${p.name}</h4>
                                <div class="product-footer">
                                    <span class="price">$${p.price.toFixed(2)}</span>
                                    <button class="wishlist-btn active" data-productid="${p.id}" onclick="event.stopPropagation(); toggleWishlist('${p.id}'); this.closest('.product-card').remove();" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.2rem; transition:color 0.3s; z-index:10;"><i class="fas fa-heart"></i></button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
        }
    }
}

// Admin Data Loading
async function loadAdminData() {
    loadAdminOrders();
    loadAdminInventory();
    loadAdminCatalog();
    loadAdminPaymentMethods();
}

async function loadAdminOrders() {
    // Sort by timestamp descending
    const q = query(collection(db, "orders")); // In a real app we'd orderBy("timestamp", "desc")
    const querySnapshot = await getDocs(q);
    const tbody = document.getElementById('adminOrdersTable');
    tbody.innerHTML = '';
    
    // Sort in memory to avoid missing index error
    let ordersList = [];
    querySnapshot.forEach(docSnap => ordersList.push({ id: docSnap.id, ...docSnap.data() }));
    ordersList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    ordersList.forEach(data => {
        let statusBadge = '';
        let actionBtn = '';
        if (data.status === 'pendiente') {
            statusBadge = '<span style="color: #ffb703; font-weight:bold;">Pendiente</span>';
            actionBtn = `<button class="action-btn" onclick="window.confirmOrder('${data.id}', '${data.productId}')">Entregar</button>`;
        } else {
            statusBadge = '<span style="color: #00ff00; font-weight:bold;">Confirmado</span>';
            actionBtn = `<span style="font-size:0.8rem; color:var(--text-secondary);">Completado</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td style="font-size:0.8rem; color:rgba(255,255,255,0.6);">${data.id.substring(0,8)}...</td>
                <td>${data.userEmail}</td>
                <td>${data.productName}</td>
                <td style="text-transform: capitalize;">${data.method}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

async function loadAdminInventory() {
    const tbody = document.getElementById('adminInventoryTable');
    tbody.innerHTML = '';

    for (const prod of allProducts) {
        const stockRef = doc(db, "products_stock", prod.id);
        const stockSnap = await getDoc(stockRef);
        let stockData = stockSnap.exists() ? stockSnap.data() : { status: 'disponible', credentialsPool: '' };
        
        tbody.innerHTML += `
            <tr>
                <td>${prod.name}</td>
                <td>
                    <select id="status_${prod.id}" class="admin-input" style="width: auto;">
                        <option value="disponible" ${stockData.status==='disponible'?'selected':''}>Disponible</option>
                        <option value="bajo_pedido" ${stockData.status==='bajo_pedido'?'selected':''}>Bajo Pedido</option>
                        <option value="agotado" ${stockData.status==='agotado'?'selected':''}>Agotado</option>
                    </select>
                </td>
                <td>
                    <textarea id="pool_${prod.id}" class="admin-input">${stockData.credentialsPool || ''}</textarea>
                </td>
                <td>
                    <button class="action-btn" onclick="window.saveInventory('${prod.id}')">Guardar</button>
                </td>
            </tr>
        `;
    }
}

// CATALOG CRUD FUNCTIONS
async function loadAdminCatalog() {
    const tbody = document.getElementById('adminCatalogTable');
    tbody.innerHTML = '';

    for (const prod of allProducts) {
        tbody.innerHTML += `
            <tr>
                <td><img src="${prod.image}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;"></td>
                <td>${prod.name}</td>
                <td>$${prod.price.toFixed(2)}</td>
                <td><span style="font-size:0.8rem; text-transform:uppercase; color: #ffb703;">${prod.category}</span></td>
                <td>
                    <button class="action-btn" style="background: #2a2a35;" onclick="window.editProduct('${prod.id}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn reject" onclick="window.deleteProduct('${prod.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }
}

window.saveProduct = async () => {
    const id = document.getElementById('editProdId').value;
    const name = document.getElementById('newProdName').value;
    const desc = document.getElementById('newProdDesc').value;
    const price = parseFloat(document.getElementById('newProdPrice').value);
    const category = document.getElementById('newProdCategory').value;
    const image = document.getElementById('newProdImage').value;

    if(!name || isNaN(price) || !image) {
        alert("Llena los campos obligatorios (Nombre, Precio, Imagen)");
        return;
    }

    try {
        if(id) {
            // Edit
            await updateDoc(doc(db, "products", id), { name, description: desc, price, category, image });
            alert("Producto actualizado");
        } else {
            // Create
            const newId = Date.now().toString();
            await setDoc(doc(db, "products", newId), { id: parseInt(newId), name, description: desc, price, category, image });
            alert("Producto creado");
        }
        window.resetProductForm();
        await checkAndSeedProducts(); // Reloads allProducts array
        loadAdminCatalog();
        loadAdminInventory();
    } catch (e) {
        console.error(e);
        alert("Error al guardar producto");
    }
}

window.editProduct = (id) => {
    const p = allProducts.find(x => x.id === id);
    if(!p) return;
    document.getElementById('editProdId').value = p.id;
    document.getElementById('newProdName').value = p.name;
    document.getElementById('newProdDesc').value = p.description;
    document.getElementById('newProdPrice').value = p.price;
    document.getElementById('newProdCategory').value = p.category;
    document.getElementById('newProdImage').value = p.image;
    
    document.querySelector('#tab-products h3').textContent = "Editar Producto";
    document.getElementById('saveProdBtn').textContent = "Actualizar Producto";
    document.getElementById('cancelProdBtn').style.display = "block";
    
    // Scroll to top of tab
    document.getElementById('tab-products').scrollIntoView({ behavior: "smooth" });
}

window.resetProductForm = () => {
    document.getElementById('editProdId').value = "";
    document.getElementById('newProdName').value = "";
    document.getElementById('newProdDesc').value = "";
    document.getElementById('newProdPrice').value = "";
    document.getElementById('newProdCategory').value = "vbucks";
    document.getElementById('newProdImage').value = "";
    
    document.querySelector('#tab-products h3').textContent = "Agregar Nuevo Producto";
    document.getElementById('saveProdBtn').textContent = "Guardar Producto";
    document.getElementById('cancelProdBtn').style.display = "none";
}

window.deleteProduct = async (id) => {
    if(confirm("¿Seguro que quieres eliminar este producto?")) {
        try {
            await deleteDoc(doc(db, "products", id));
            // Optional: delete stock doc as well
            await deleteDoc(doc(db, "products_stock", id));
            alert("Producto eliminado");
            await checkAndSeedProducts();
            loadAdminCatalog();
            loadAdminInventory();
        } catch(e) {
            console.error(e);
            alert("Error al eliminar");
        }
    }
}


window.saveInventory = async (productId) => {
    const status = document.getElementById(`status_${productId}`).value;
    const pool = document.getElementById(`pool_${productId}`).value;
    
    try {
        await setDoc(doc(db, "products_stock", productId), {
            productId: productId,
            status: status,
            credentialsPool: pool
        }, { merge: true });
        alert("Stock actualizado.");
    } catch(e) {
        console.error(e);
        alert("Error al guardar.");
    }
}

window.searchUser = async () => {
    const email = document.getElementById('searchUserEmail').value;
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    
    const tbody = document.getElementById('adminUsersTable');
    tbody.innerHTML = '';
    
    if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="4">Usuario no encontrado.</td></tr>';
        return;
    }

    snap.forEach(docSnap => {
        const data = docSnap.data();
        tbody.innerHTML += `
            <tr>
                <td>${data.email}</td>
                <td style="font-size: 0.8em;">${docSnap.id}</td>
                <td>$${data.balance.toFixed(2)}</td>
                <td>
                    <input type="number" id="addBalance_${docSnap.id}" class="admin-input" style="width: 80px;" placeholder="Cant.">
                    <button class="action-btn" onclick="window.addBalance('${docSnap.id}', ${data.balance})">Sumar</button>
                </td>
            </tr>
        `;
    });
}

window.addBalance = async (uid, currentBalance) => {
    const amount = parseFloat(document.getElementById(`addBalance_${uid}`).value);
    if(isNaN(amount) || amount <= 0) return;
    
    try {
        await updateDoc(doc(db, "users", uid), {
            balance: currentBalance + amount
        });
        alert("Saldo añadido exitosamente.");
        window.searchUser(); // refresh
    } catch(e) {
        console.error(e);
        alert("Error.");
    }
}

window.confirmOrder = async (orderId, productId) => {
    try {
        const stockRef = doc(db, "products_stock", productId);
        const stockSnap = await getDoc(stockRef);
        
        let textToDeliver = "Entrega manual contacta soporte.";
        
        if (stockSnap.exists()) {
            const pool = stockSnap.data().credentialsPool || "";
            const lines = pool.split('\\n').filter(l => l.trim() !== '');
            
            if (lines.length > 0) {
                textToDeliver = lines[0]; // Take first credential
                lines.shift(); // Remove it
                
                await updateDoc(stockRef, {
                    credentialsPool: lines.join('\\n'),
                    status: lines.length === 0 ? 'agotado' : stockSnap.data().status
                });
            }
        }
        
        await updateDoc(doc(db, "orders", orderId), {
            status: 'confirmado',
            textDelivered: textToDeliver
        });
        
        alert("Pedido confirmado y entregado.");
        loadAdminOrders();
        loadAdminInventory();
    } catch(e) {
        console.error(e);
        alert("Error al confirmar.");
    }
}

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

    allPaymentMethods.forEach(method => {
        const statusIcon = method.active ? '<i class="fas fa-check-circle" style="color:#00ff00;"></i>' : '<i class="fas fa-times-circle" style="color:#ff3366;"></i>';
        tbody.innerHTML += `
            <tr>
                <td>${statusIcon}</td>
                <td>${method.bank}</td>
                <td>${method.account}</td>
                <td>${method.name}</td>
                <td>
                    <button class="action-btn" style="background: #2a2a35;" onclick="window.editPaymentMethod('${method.id}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn reject" onclick="window.deletePaymentMethod('${method.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

window.savePaymentMethod = async () => {
    const id = document.getElementById('editPayMethodId').value;
    const bank = document.getElementById('newPayMethodBank').value;
    const name = document.getElementById('newPayMethodName').value;
    const account = document.getElementById('newPayMethodAccount').value;
    const concept = document.getElementById('newPayMethodConcept').value;
    const active = document.getElementById('newPayMethodActive').checked;

    if(!bank || !name || !account) {
        alert("Llena los campos obligatorios (Banco, Nombre, Cuenta)");
        return;
    }

    try {
        if(id) {
            await updateDoc(doc(db, "payment_methods", id), { bank, name, account, concept, active });
        } else {
            const newId = Date.now().toString();
            await setDoc(doc(db, "payment_methods", newId), { bank, name, account, concept, active, createdAt: Date.now() });
        }
        window.resetPaymentMethodForm();
        loadAdminPaymentMethods();
    } catch (e) {
        console.error(e);
        alert("Error al guardar método de pago");
    }
}

window.editPaymentMethod = (id) => {
    const m = allPaymentMethods.find(x => x.id === id);
    if(!m) return;
    document.getElementById('editPayMethodId').value = m.id;
    document.getElementById('newPayMethodBank').value = m.bank || '';
    document.getElementById('newPayMethodName').value = m.name || '';
    document.getElementById('newPayMethodAccount').value = m.account || '';
    document.getElementById('newPayMethodConcept').value = m.concept || '';
    document.getElementById('newPayMethodActive').checked = m.active !== false;
    
    document.querySelector('#tab-paymentMethods h3').textContent = "Editar Método de Pago";
    document.getElementById('savePayMethodBtn').textContent = "Actualizar Método";
    document.getElementById('cancelPayMethodBtn').style.display = "block";
    document.getElementById('tab-paymentMethods').scrollIntoView({ behavior: "smooth" });
}

window.resetPaymentMethodForm = () => {
    document.getElementById('editPayMethodId').value = "";
    document.getElementById('newPayMethodBank').value = "";
    document.getElementById('newPayMethodName').value = "";
    document.getElementById('newPayMethodAccount').value = "";
    document.getElementById('newPayMethodConcept').value = "";
    document.getElementById('newPayMethodActive').checked = true;
    
    document.querySelector('#tab-paymentMethods h3').textContent = "Agregar Método de Pago";
    document.getElementById('savePayMethodBtn').textContent = "Guardar Método";
    document.getElementById('cancelPayMethodBtn').style.display = "none";
}

window.deletePaymentMethod = async (id) => {
    if(confirm("¿Seguro que quieres eliminar este método de pago?")) {
        try {
            await deleteDoc(doc(db, "payment_methods", id));
            loadAdminPaymentMethods();
        } catch(e) {
            console.error(e);
            alert("Error al eliminar");
        }
    }
}
