import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUid = null;
let userData = null;

// Inject CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'friends.css';
document.head.appendChild(link);

// Inject DOM
const sidebarHtml = `
    <div class="friends-sidebar-overlay" id="friendsOverlay"></div>
    <div class="friends-sidebar" id="friendsSidebar">
        <div class="friends-header">
            <div class="friends-tabs">
                <span class="friends-tab active" id="tabFriends">Amigos <span class="friends-req-badge" id="badgeFriends" style="display:none;">0</span></span>
                <span class="friends-tab" id="tabRequests">Solicitudes <span class="friends-req-badge" id="badgeRequests" style="display:none;">0</span></span>
            </div>
            <i class="fas fa-times friends-close-btn" id="closeFriendsBtn"></i>
        </div>
        
        <div class="friends-search">
            <i class="fas fa-search"></i>
            <input type="text" id="friendSearchInput" placeholder="AÃ±adir amigo por UID o Email...">
            <button id="addFriendBtn" class="friend-action-btn" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:var(--accent-blue);"><i class="fas fa-user-plus"></i></button>
        </div>

        <div class="friends-list-container" id="friendsListContainer">
            <!-- Dynamically populated -->
            <div style="text-align:center; margin-top:20px; color:rgba(255,255,255,0.5);">Cargando...</div>
        </div>
        
        <div class="friends-list-container" id="requestsListContainer" style="display:none;">
            <!-- Dynamically populated -->
        </div>

        <div class="referral-box">
            <h4><i class="fas fa-gift"></i> Gana 3% de ComisiÃ³n</h4>
            <p>Invita a un amigo y gana crÃ©ditos de sus compras.</p>
            <button class="referral-btn" id="copyReferralBtn">Copiar Mi Link de Referido</button>
        </div>
    </div>
`;
const appContainer = document.querySelector('.app-container');
if (appContainer) {
    appContainer.insertAdjacentHTML('beforeend', sidebarHtml);
} else {
    document.body.insertAdjacentHTML('beforeend', sidebarHtml);
}

// Global Toggle Function (can be called from any button in the app)
window.toggleFriendsSidebar = () => {
    if(!currentUid) {
        alert("Debes iniciar sesiÃ³n para ver tus amigos.");
        window.location.href = 'perfil.html';
        return;
    }
    const sidebar = document.getElementById('friendsSidebar');
    const overlay = document.getElementById('friendsOverlay');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        loadFriends();
    }
};

document.getElementById('closeFriendsBtn').addEventListener('click', window.toggleFriendsSidebar);
document.getElementById('friendsOverlay').addEventListener('click', window.toggleFriendsSidebar);

// Tab switching
document.getElementById('tabFriends').addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('tabRequests').classList.remove('active');
    document.getElementById('friendsListContainer').style.display = 'block';
    document.getElementById('requestsListContainer').style.display = 'none';
});

document.getElementById('tabRequests').addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('tabFriends').classList.remove('active');
    document.getElementById('friendsListContainer').style.display = 'none';
    document.getElementById('requestsListContainer').style.display = 'block';
});

// Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUid = user.uid;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            userData.uid = user.uid;
        }
        // Load initial badges
        loadFriends();
    } else {
        currentUid = null;
        userData = null;
    }
});

// Load Friends & Requests
async function loadFriends() {
    if(!currentUid) return;
    
    try {
        // Query friendships where I am uid1 or uid2
        const q1 = query(collection(db, "friendships"), where("uid1", "==", currentUid));
        const q2 = query(collection(db, "friendships"), where("uid2", "==", currentUid));
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        let friendships = [];
        snap1.forEach(doc => friendships.push({ id: doc.id, ...doc.data() }));
        snap2.forEach(doc => friendships.push({ id: doc.id, ...doc.data() }));

        const friendsContainer = document.getElementById('friendsListContainer');
        const requestsContainer = document.getElementById('requestsListContainer');
        
        let friendsHtml = '';
        let requestsHtml = '';
        let pendingCount = 0;

        for (const f of friendships) {
            // Determine the other user's UID
            const otherUid = (f.uid1 === currentUid) ? f.uid2 : f.uid1;
            
            // Fetch other user's basic info
            const otherSnap = await getDoc(doc(db, "users", otherUid));
            if(!otherSnap.exists()) continue;
            const otherData = otherSnap.data();
            const displayName = otherData.username || otherData.email.split('@')[0];
            const avatar = "https://i.imgur.com/S00u4EI.png"; // Default avatar

            if (f.status === 'accepted') {
                friendsHtml += `
                    <div class="friend-item">
                        <div class="friend-avatar">
                            <img src="${avatar}" alt="Avatar">
                            <div class="friend-status-dot"></div>
                        </div>
                        <div class="friend-info">
                            <div class="friend-name">${displayName}</div>
                            <div class="friend-subtext">Amigo</div>
                        </div>
                    </div>
                `;
            } else if (f.status === 'pending') {
                if (f.uid2 === currentUid) {
                    // I am receiving the request
                    pendingCount++;
                    requestsHtml += `
                        <div class="friend-item">
                            <div class="friend-avatar">
                                <img src="${avatar}" alt="Avatar">
                            </div>
                            <div class="friend-info">
                                <div class="friend-name">${displayName}</div>
                                <div class="friend-subtext">Quiere ser tu amigo</div>
                            </div>
                            <button class="friend-action-btn" onclick="acceptFriend('${f.id}')" style="background:var(--accent-green);"><i class="fas fa-check"></i></button>
                        </div>
                    `;
                } else {
                    // I sent the request
                    requestsHtml += `
                        <div class="friend-item">
                            <div class="friend-avatar">
                                <img src="${avatar}" alt="Avatar" style="opacity:0.5;">
                            </div>
                            <div class="friend-info">
                                <div class="friend-name" style="color:rgba(255,255,255,0.5);">${displayName}</div>
                                <div class="friend-subtext">Solicitud enviada</div>
                            </div>
                        </div>
                    `;
                }
            }
        }

        friendsContainer.innerHTML = friendsHtml || '<div style="text-align:center; margin-top:20px; color:rgba(255,255,255,0.5);">AÃºn no tienes amigos agregados.</div>';
        requestsContainer.innerHTML = requestsHtml || '<div style="text-align:center; margin-top:20px; color:rgba(255,255,255,0.5);">No hay solicitudes pendientes.</div>';
        
        const badgeReq = document.getElementById('badgeRequests');
        if(pendingCount > 0) {
            badgeReq.style.display = 'inline-block';
            badgeReq.innerText = pendingCount;
        } else {
            badgeReq.style.display = 'none';
        }

    } catch(e) {
        console.error("Error loading friends:", e);
    }
}

// Add friend logic
document.getElementById('addFriendBtn').addEventListener('click', async () => {
    const input = document.getElementById('friendSearchInput').value.trim();
    if(!input) return;

    if(input === currentUid || input === userData.email) {
        alert("No puedes agregarte a ti mismo.");
        return;
    }

    try {
        let targetUid = input;
        
        // If it's an email, query users collection
        if(input.includes('@')) {
            const q = query(collection(db, "users"), where("email", "==", input));
            const snap = await getDocs(q);
            if(snap.empty) {
                alert("Usuario no encontrado.");
                return;
            }
            targetUid = snap.docs[0].id;
        }

        // Verify target exists
        const targetSnap = await getDoc(doc(db, "users", targetUid));
        if(!targetSnap.exists()) {
            alert("Usuario no encontrado por UID.");
            return;
        }

        // Check if already friends or pending
        const q1 = query(collection(db, "friendships"), where("uid1", "==", currentUid), where("uid2", "==", targetUid));
        const q2 = query(collection(db, "friendships"), where("uid1", "==", targetUid), where("uid2", "==", currentUid));
        const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        if(!s1.empty || !s2.empty) {
            alert("Ya tienes una solicitud o amistad con este usuario.");
            return;
        }

        // Create friend request
        const newRef = doc(collection(db, "friendships"));
        await setDoc(newRef, {
            uid1: currentUid,
            uid2: targetUid,
            status: 'pending',
            createdAt: Date.now()
        });

        document.getElementById('friendSearchInput').value = '';
        alert("Solicitud de amistad enviada.");
        loadFriends();

    } catch(e) {
        console.error(e);
        alert("Error al enviar solicitud: " + e.message);
    }
});

// Accept request (exposed to window)
window.acceptFriend = async (friendshipId) => {
    try {
        await updateDoc(doc(db, "friendships", friendshipId), {
            status: 'accepted'
        });
        alert("Â¡Solicitud aceptada!");
        loadFriends();
    } catch(e) {
        console.error(e);
        alert("Error al aceptar solicitud: " + e.message);
    }
};

// Copy Referral
document.getElementById('copyReferralBtn').addEventListener('click', () => {
    if(!currentUid) return;
    const url = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/') + `index.html?ref=${currentUid}`;
    navigator.clipboard.writeText(url).then(() => {
        alert("Â¡Enlace de referido copiado! CompÃ¡rtelo con tus amigos.");
    });
});

