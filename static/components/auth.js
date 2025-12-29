// ---------------------------------------------------------
//  IMPORT FIREBASE
// ---------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ---------------------------------------------------------
//  FIREBASE CONFIG
// ---------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAMcBJyGbiQ0T2VJFGRH6qF4d8qg_oNn0c",
  authDomain: "apinow-7e2e3.firebaseapp.com",
  projectId: "apinow-7e2e3",
  storageBucket: "apinow-7e2e3.firebasestorage.app",
  messagingSenderId: "566344679958",
  appId: "1:566344679958:web:ecf6007dae76b9fd49eb37",
  measurementId: "G-8CSLXMGH63"
};

// ---------------------------------------------------------
//  INIT FIREBASE
// ---------------------------------------------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ---------------------------------------------------------
//  BACKEND ROUTES
// ---------------------------------------------------------
const REGISTER_URL = "/register";
const LOGIN_URL = "/login";

// ---------------------------------------------------------
//  REDIRECT FUNCTION
// ---------------------------------------------------------
function redirectToCode_studio() {
  window.location.href = "/Code_studio";
}

// ---------------------------------------------------------
//  MAIN FUNCTION – Send Firebase User → Backend
// ---------------------------------------------------------
async function sendToBackend(user) {
  // User payload for backend
  const payload = {
    full_name: user.displayName || "Unknown User",
    email: user.email,
    avatar_url: user.photoURL || "",
    github_node_id: user.uid
  };

  // ---- 1️⃣ TRY LOGIN ----
  const loginRes = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email })
  });

  const loginData = await loginRes.json();

  if (loginRes.ok) {
    console.log("🔓 Login Success:", loginData);

    const account = loginData.data[0];
    localStorage.setItem("api_key", account.backend_api_key);
    localStorage.setItem("UID", account.id);
    localStorage.setItem("USERNAME", account.full_name);
    localStorage.setItem("avatar_url", account.avatar_url);
    redirectToCode_studio();
    return;
  }

  // ---- 2️⃣ USER NOT FOUND → REGISTER ----
  console.log("🟡 User not found. Registering...");

  const regRes = await fetch(REGISTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const regData = await regRes.json();

  if (!regRes.ok) {
    alert("❌ Registration Failed: " + regData.error);
    return;
  }

  console.log("🟢 Registration Success:", regData);

  // Data after registration
  const newUser = regData.data[0];
  localStorage.setItem("api_key", newUser.backend_api_key);
  localStorage.setItem("UID", newUser.id);
  localStorage.setItem("USERNAME", newUser.full_name);

  redirectToCode_studio();
}

// ---------------------------------------------------------
//  LOGIN BUTTON HANDLERS
// ---------------------------------------------------------
document.getElementById("google-login").addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await sendToBackend(result.user);
  } catch (err) {
    alert("Google Login Error: " + err.message);
  }
});

document.getElementById("github-login").addEventListener("click", async () => {
  try {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await sendToBackend(result.user);
  } catch (err) {
    alert("GitHub Login Error: " + err.message);
  }
});

document.getElementById("microsoft-login").addEventListener("click", async () => {
  try {
    const provider = new OAuthProvider("microsoft.com");
    const result = await signInWithPopup(auth, provider);
    await sendToBackend(result.user);
  } catch (err) {
    alert("Microsoft Login Error: " + err.message);
  }
});

// ---------------------------------------------------------
//  AUTO-LOGIN IF ALREADY AUTHENTICATED
// ---------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user && localStorage.getItem("api_key")) {
    console.log("🔁 Already signed in:", user.email);
    redirectToCode_studio();
  }
});
