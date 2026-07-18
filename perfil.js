import { app, auth, db, googleProvider } from "./firebase-config.js";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const authSection = document.getElementById('authSection');
const userDashboard = document.getElementById('userDashboard');
const adminDashboard = document.getElementById('adminDashboard');

const googleLoginBtn = document.getElementById('googleLoginBtn');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

let currentUser = null;
let isAdmin = false;

// Real-time Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        isAdmin = (user.email === 'admin@digitalfootprint.com');
        
        authSection.style.display = 'none';
        
        if (isAdmin) {
            adminDashboard.style.display = 'block';
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
        alert("Error al iniciar sesión con Google.");
    }
};

adminLoginBtn.onclick = async () => {
    const u = document.getElementById('adminUser').value;
    const p = document.getElementById('adminPass').value;
    
    if (u === 'Admin' && p === 'Goldito1') {
        const adminEmail = 'admin@digitalfootprint.com';
        try {
            await signInWithEmailAndPassword(auth, adminEmail, p);
        } catch(e) {
            try {
                // Si no existe, lo creamos la primera vez
                await createUserWithEmailAndPassword(auth, adminEmail, p);
            } catch(createErr) {
                console.error("Auth Error", createErr);
                alert("Error de autenticación.");
            }
        }
    } else {
        alert("Credenciales incorrectas.");
    }
};

logoutBtn.onclick = () => signOut(auth);
adminLogoutBtn.onclick = () => signOut(auth);

// User Data Loading
async function loadUserData() {
    document.getElementById('userUidDisplay').innerText = currentUser.uid;
    
    // Balance
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        document.getElementById('userBalance').innerText = `$${userSnap.data().balance.toFixed(2)} MXN`;
    }

    // Orders
    const q = query(collection(db, "orders"), where("uid", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    const tbody = document.querySelector('#userOrdersTable tbody');
    tbody.innerHTML = '';
    
    if (querySnapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="4">No tienes pedidos aún.</td></tr>';
        return;
    }

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

// Admin Data Loading
async function loadAdminData() {
    loadAdminOrders();
    loadAdminInventory();
}

async function loadAdminOrders() {
    const querySnapshot = await getDocs(collection(db, "orders"));
    const tbody = document.getElementById('adminOrdersTable');
    tbody.innerHTML = '';
    
    querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if(data.status !== 'pendiente') return; // Only show pending

        tbody.innerHTML += `
            <tr>
                <td>${data.userEmail}</td>
                <td>${data.productName}</td>
                <td>${data.method === 'balance' ? 'Saldo' : 'Transferencia'}</td>
                <td>
                    <button class="action-btn" onclick="window.confirmOrder('${docSnap.id}', '${data.productId}')">Confirmar y Entregar</button>
                </td>
            </tr>
        `;
    });
}

// Ensure products is available globally from products.js
async function loadAdminInventory() {
    const tbody = document.getElementById('adminInventoryTable');
    tbody.innerHTML = '';

    for (const prod of products) {
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
                
                // Update stock pool
                await updateDoc(stockRef, {
                    credentialsPool: lines.join('\\n'),
                    status: lines.length === 0 ? 'agotado' : stockSnap.data().status
                });
            }
        }
        
        // Update Order
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
