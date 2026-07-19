import { auth, db } from "./firebase-config.js";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Global wishlist state for quick UI updates
let currentUserWishlist = [];

export const initWishlist = () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                currentUserWishlist = userSnap.data().wishlist || [];
                updateAllWishlistIcons();
            }
        } else {
            currentUserWishlist = [];
            updateAllWishlistIcons();
        }
    });
};

export const toggleWishlist = async (productId) => {
    const user = auth.currentUser;
    if (!user) {
        alert("Debes iniciar sesión para añadir a favoritos.");
        window.location.href = "perfil.html";
        return;
    }

    const isWished = currentUserWishlist.includes(productId);
    const userRef = doc(db, "users", user.uid);

    try {
        if (isWished) {
            // Remove
            await updateDoc(userRef, {
                wishlist: arrayRemove(productId)
            });
            currentUserWishlist = currentUserWishlist.filter(id => id !== productId);
        } else {
            // Add
            await updateDoc(userRef, {
                wishlist: arrayUnion(productId)
            });
            currentUserWishlist.push(productId);
        }
        updateAllWishlistIcons();
    } catch (error) {
        console.error("Error toggling wishlist:", error);
    }
};

const updateAllWishlistIcons = () => {
    const buttons = document.querySelectorAll('.wishlist-btn');
    buttons.forEach(btn => {
        const pid = btn.dataset.productid;
        if (currentUserWishlist.includes(pid)) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="far fa-heart"></i>';
        }
    });
};

// Make it available globally for inline onclick handlers if needed
window.toggleWishlist = toggleWishlist;

document.addEventListener("DOMContentLoaded", initWishlist);

