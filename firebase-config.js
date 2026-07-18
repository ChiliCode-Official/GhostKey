import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCq2qgvlMDwi1z0Ocjm9_m0jEIerywtNE0",
  authDomain: "digital-ecom-f1579.firebaseapp.com",
  projectId: "digital-ecom-f1579",
  storageBucket: "digital-ecom-f1579.firebasestorage.app",
  messagingSenderId: "840106564062",
  appId: "1:840106564062:web:ab0c311afbd7a20362254f",
  measurementId: "G-NE5HGR8X0K"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };

