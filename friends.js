import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUid = null;
let userData = null;

// UI is now injected by navigation.js into the left sidebar.

// Initialize event listeners after sidebar is loaded
window.addEventListener('sidebarLoaded', () => {
    const tabFriends = document.getElementById('tabFriends');
    const tabRequests = document.getElementById('tabRequests');
    const addFriendBtn = document.getElementById('addFriendBtn');
    const copyReferralBtn = document.getElementById('copyReferralBtn');

    if (tabFriends) {
        tabFriends.addEventListener('click', (e) => {
            e.target.classList.add('active');
            if(tabRequests) tabRequests.classList.remove('active');
            const flc = document.getElementById('friendsListContainer');
            if(flc) flc.parentElement.style.display = 'block';
            const rlc = document.getElementById('requestsListContainer');
            if(rlc) rlc.style.display = 'none';
        });
    }

    if (tabRequests) {
        tabRequests.addEventListener('click', (e) => {
            e.target.classList.add('active');
            if(tabFriends) tabFriends.classList.remove('active');
            const flc = document.getElementById('friendsListContainer');
            if(flc) flc.parentElement.style.display = 'none';
            const rlc = document.getElementById('requestsListContainer');
            if(rlc) rlc.style.display = 'block';
        });
    }

    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', async () => {
            const input = document.getElementById('friendSearchInput').value.trim();
            if(!input) return;

            if (!currentUid || !userData) {
                alert("Debes iniciar sesión para agregar amigos.");
                return;
            }

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
    }

    if (copyReferralBtn) {
        copyReferralBtn.addEventListener('click', () => {
            if(!currentUid) return;
            const url = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/') + `index.html?ref=${currentUid}`;
            navigator.clipboard.writeText(url).then(() => {
                alert("¡Enlace de referido copiado! Compártelo con tus amigos.");
            });
        });
    }
});

// Auth State
onAuthStateChanged(auth, async (user) => {
    const friendsContainer = document.getElementById('friendsListContainer');
    const requestsContainer = document.getElementById('requestsListContainer');

    if (user) {
        currentUid = user.uid;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            userData.uid = user.uid;
        }
        
        // Update Global Avatar
        document.querySelectorAll('#globalUserAvatar').forEach(el => {
            el.src = user.photoURL || 'https://i.imgur.com/S00u4EI.png';
        });

        loadFriends();
    } else {
        currentUid = null;
        userData = null;
        
        document.querySelectorAll('#globalUserAvatar').forEach(el => {
            el.src = 'https://i.imgur.com/S00u4EI.png';
        });

        if (friendsContainer) {
            friendsContainer.innerHTML = `
                <div style="text-align:center; margin-top:20px; padding: 20px; color:var(--text-secondary); font-size:0.85rem;">
                    <i class="fas fa-sign-in-alt" style="font-size:2rem; margin-bottom:12px; color:var(--accent-yellow);"></i>
                    <p style="margin-bottom:15px;">Inicia sesión para ver y agregar amigos.</p>
                    <button class="btn btn-blue" onclick="pageTransitionTo('perfil.html')" style="font-size:0.8rem; padding:8px 16px; width: 100%;">Iniciar Sesión</button>
                </div>
            `;
        }
        if (requestsContainer) {
            requestsContainer.innerHTML = '';
        }
        const badgeReq = document.getElementById('badgeRequests');
        if (badgeReq) badgeReq.style.display = 'none';
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

// Copied from within the sidebarLoaded listener above (lines 263-270 were the original ones). Wait, I already moved the addFriend and copyReferral event listeners inside the sidebarLoaded event. I should delete the old ones down here.

// Expose toggle sidebar globally
window.toggleFriendsSidebar = () => {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.toggle('left-sidebar-mobile-active');
    }
};
