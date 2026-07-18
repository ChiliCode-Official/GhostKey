import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUid = null;
let userData = null;

// Inject DOM (New UI)
const sidebarHtml = `
    <aside class="sidebar right-sidebar" id="friendsSidebar">
        <div class="right-sidebar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <div class="tabs" style="display:flex; gap:15px; font-weight:600; font-size:0.9rem;">
                <span class="tab active" id="tabFriends" style="cursor:pointer; color:var(--text-primary);">Friends <span class="friends-req-badge" id="badgeFriends" style="display:none;">0</span></span>
                <span class="tab" id="tabRequests" style="cursor:pointer; color:var(--text-secondary);">Requests <span class="badge-red friends-req-badge" id="badgeRequests" style="background:rgba(244,63,94,0.2); color:#f43f5e; padding:2px 6px; border-radius:10px; font-size:0.75rem; display:none;">0</span></span>
            </div>
            <i class="fas fa-info-circle icon-mute" style="color:var(--text-secondary); cursor:pointer;"></i>
        </div>
        
        <div class="search-friend-bar" style="display:flex; align-items:center; gap:10px; margin-bottom: 30px;">
            <div style="flex:1; background:rgba(255,255,255,0.05); border-radius:10px; padding:8px 12px; display:flex; align-items:center; gap:10px;">
                <i class="fas fa-search" style="color:var(--text-secondary); font-size:0.8rem;"></i>
                <input type="text" id="friendSearchInput" placeholder="Search for a friend" style="background:transparent; border:none; color:white; font-size:0.85rem; outline:none; width:100%;">
            </div>
            <div style="width:32px; height:32px; background:rgba(255,255,255,0.05); border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer;" id="addFriendBtn">
                <i class="fas fa-user-plus" style="color:var(--text-secondary); font-size:0.8rem;"></i>
            </div>
        </div>

        <div class="sidebar-section-title" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <span>Friends</span>
            <span style="background:rgba(255,255,255,0.05); width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem;">2</span>
        </div>
        
        <div class="friends-category">
            <div class="friends-list" id="friendsListContainer">
                <div style="text-align:center; margin-top:20px; color:rgba(255,255,255,0.5);">Cargando...</div>
            </div>
        </div>
        
        <div class="friends-category" id="requestsListContainer" style="display:none;">
            <div class="friends-list"></div>
        </div>

        <div class="referral-box" style="margin-top:auto; padding:15px; background:rgba(255,255,255,0.02); border-radius:12px; text-align:center; border-top:1px solid rgba(255,255,255,0.05);">
            <h4 style="margin:0 0 10px 0; font-size:0.9rem; color:#a78bfa;"><i class="fas fa-gift"></i> Gana 3% de Comisi&oacute;n</h4>
            <p style="margin:0 0 15px 0; font-size:0.8rem; color:var(--text-secondary);">Invita a un amigo y gana cr&eacute;ditos de sus compras.</p>
            <button class="btn btn-blue" id="copyReferralBtn" style="width:100%; font-size:0.8rem;">Copiar Mi Link de Referido</button>
        </div>
    </aside>
`;

const appContainer = document.querySelector('.app-container');
if (appContainer) {
    document.querySelectorAll('.sidebar.right-sidebar').forEach(e => e.remove());
    appContainer.insertAdjacentHTML('beforeend', sidebarHtml);
}

// Tab switching
document.getElementById('tabFriends').addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('tabRequests').classList.remove('active');
    document.getElementById('friendsListContainer').parentElement.style.display = 'block';
    document.getElementById('requestsListContainer').style.display = 'none';
});

document.getElementById('tabRequests').addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('tabFriends').classList.remove('active');
    document.getElementById('friendsListContainer').parentElement.style.display = 'none';
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
            const otherUid = (f.uid1 === currentUid) ? f.uid2 : f.uid1;
            const otherSnap = await getDoc(doc(db, "users", otherUid));
            if(!otherSnap.exists()) continue;
            const otherData = otherSnap.data();
            const displayName = otherData.username || otherData.email.split('@')[0];
            const avatar = "https://i.pravatar.cc/100?u=" + otherUid;

            if (f.status === 'accepted') {
                friendsHtml += `
                    <div class="friend-item" style="display:flex; align-items:center; gap:12px; margin-bottom:15px; padding: 5px;">
                        <img src="${avatar}" alt="Avatar" class="friend-avatar" style="width:32px; height:32px; border-radius:50%;">
                        <div class="friend-info" style="flex:1; display:flex; flex-direction:column; line-height:1.3;">
                            <span class="friend-name" style="font-weight:600; font-size:0.85rem;">${displayName}</span>
                            <span class="friend-playing" style="color:var(--text-secondary); font-size:0.75rem;">Play Fortnite</span>
                        </div>
                        <img src="https://i.imgur.com/3XpcBuu.png" alt="Game" class="friend-game-icon" style="width:20px; height:20px; border-radius:4px; object-fit:cover;">
                    </div>
                `;
            } else if (f.status === 'pending') {
                if (f.uid2 === currentUid) {
                    pendingCount++;
                    requestsHtml += `
                        <div class="friend-item" style="display:flex; align-items:center; gap:12px; margin-bottom:15px; padding: 5px;">
                            <img src="${avatar}" alt="Avatar" class="friend-avatar" style="width:32px; height:32px; border-radius:50%;">
                            <div class="friend-info" style="flex:1; display:flex; flex-direction:column; line-height:1.3;">
                                <span class="friend-name" style="font-weight:600; font-size:0.85rem;">${displayName}</span>
                                <span class="friend-playing" style="color:var(--text-secondary); font-size:0.75rem;">Quiere ser tu amigo</span>
                            </div>
                            <i class="fas fa-check" onclick="acceptFriend('${f.id}')" style="color:#4ade80; cursor:pointer; font-size:1rem; background:rgba(74,222,128,0.1); padding:6px; border-radius:50%;"></i>
                        </div>
                    `;
                } else {
                    requestsHtml += `
                        <div class="friend-item" style="display:flex; align-items:center; gap:12px; margin-bottom:15px; padding: 5px; opacity:0.5;">
                            <img src="${avatar}" alt="Avatar" class="friend-avatar" style="width:32px; height:32px; border-radius:50%;">
                            <div class="friend-info" style="flex:1; display:flex; flex-direction:column; line-height:1.3;">
                                <span class="friend-name" style="font-weight:600; font-size:0.85rem;">${displayName}</span>
                                <span class="friend-playing" style="color:var(--text-secondary); font-size:0.75rem;">Solicitud enviada</span>
                            </div>
                        </div>
                    `;
                }
            }
        }

        friendsContainer.innerHTML = friendsHtml || '<div style="text-align:center; margin-top:20px; color:rgba(255,255,255,0.5); font-size:0.8rem;">A&uacute;n no tienes amigos.</div>';
        requestsContainer.innerHTML = requestsHtml || '<div style="text-align:center; margin-top:20px; color:rgba(255,255,255,0.5); font-size:0.8rem;">No hay solicitudes.</div>';
        
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
        
        if(input.includes('@')) {
            const q = query(collection(db, "users"), where("email", "==", input));
            const snap = await getDocs(q);
            if(snap.empty) {
                alert("Usuario no encontrado.");
                return;
            }
            targetUid = snap.docs[0].id;
        }

        const targetSnap = await getDoc(doc(db, "users", targetUid));
        if(!targetSnap.exists()) {
            alert("Usuario no encontrado por UID.");
            return;
        }

        const q1 = query(collection(db, "friendships"), where("uid1", "==", currentUid), where("uid2", "==", targetUid));
        const q2 = query(collection(db, "friendships"), where("uid1", "==", targetUid), where("uid2", "==", currentUid));
        const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        if(!s1.empty || !s2.empty) {
            alert("Ya tienes una solicitud o amistad con este usuario.");
            return;
        }

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
        alert("¡Solicitud aceptada!");
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
        alert("¡Enlace de referido copiado! Compártelo con tus amigos.");
    });
});
