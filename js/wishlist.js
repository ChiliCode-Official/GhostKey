import { db, auth } from './firebase-config.js';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Exported function to toggle wishlist
export async function toggleWishlist(productId, btnElement) {
    if (!auth.currentUser) {
        alert("Debes iniciar sesión para añadir a favoritos.");
        return;
    }

    const uid = auth.currentUser.uid;
    const userRef = doc(db, 'users', uid);
    
    try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

        let wishlist = userSnap.data().wishlist || [];
        const isFaved = wishlist.includes(productId);

        // UI Optimistic Update
        if (isFaved) {
            btnElement.classList.remove('active');
            btnElement.style.color = "white";
        } else {
            btnElement.classList.add('active');
            btnElement.style.color = "var(--danger)";
        }

        // DB Update
        if (isFaved) {
            await updateDoc(userRef, {
                wishlist: arrayRemove(productId)
            });
        } else {
            await updateDoc(userRef, {
                wishlist: arrayUnion(productId)
            });
        }

    } catch (e) {
        console.error("Error toggling wishlist", e);
        // Revert UI if error
        alert("Hubo un error al actualizar tus favoritos.");
    }
}

// Function to initialize buttons after render
export function initWishlistButtons(userWishlist = []) {
    const btns = document.querySelectorAll('.wishlist-btn');
    btns.forEach(btn => {
        const pId = btn.dataset.id;
        
        // Initial state
        if (userWishlist.includes(pId)) {
            btn.classList.add('active');
            btn.style.color = "var(--danger)";
        }

        // Avoid multiple listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault(); // prevent triggering parent <a> link
            toggleWishlist(pId, newBtn);
        });
    });
}
