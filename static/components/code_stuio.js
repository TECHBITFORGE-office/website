// -------------------------
// APINOW – WEB CODER FRONTEND CONNECTED TO BACKEND
// -------------------------

const API_BASE = "/"; // change if deployed

// Global state
const AppState = {
    user: null,
    token: null,
    projects: [],
    currentRepo: null,
};

// -------------------------
// INIT APP
// -------------------------
document.addEventListener("DOMContentLoaded", async () => {
    await loadUser();
    await loadProjects();
    setupEventListeners();
});

// -------------------------
// LOAD USER FROM BACKEND
// -------------------------
async function loadUser() {
    const savedToken = localStorage.getItem("USER_TOKEN");
    if (!savedToken) return;

    try {
        const res = await fetch(`${API_BASE}/get_user`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + savedToken
            }
        });

        const data = await res.json();
        if (data.data && data.data[0]) {
            AppState.user = data.data[0];
            AppState.token = savedToken;
        }
    } catch (e) {
        console.error("User load failed:", e);
    }
}

// -------------------------
// LOAD PROJECTS FROM USER DATA
// -------------------------
async function loadProjects() {
    if (!AppState.user) return;

    AppState.projects = AppState.user.repo_name?.data || [];
    renderProjects();
}

// -------------------------
// RENDER PROJECT CARDS
// -------------------------
function renderProjects() {
    const grid = document.querySelector("#projects .grid");
    if (!grid) return;

    grid.innerHTML = "";

    AppState.projects.forEach(repo => {
        grid.innerHTML += `
            <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-primary transition-all duration-300 hover:scale-105">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold">${repo}</h3>
                    <span class="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">Active</span>
                </div>
                <p class="text-gray-400 text-sm mb-4">AI generated project</p>
                <div class="flex items-center justify-between text-sm text-gray-500">
                    <span>Stored in cloud</span>
                    <div class="flex gap-2">
                        <button onclick="openProject('${repo}')" class="hover:text-primary"><i data-feather="edit-2"></i></button>
                        <button onclick="downloadProject('${repo}')" class="hover:text-secondary"><i data-feather="download"></i></button>
                    </div>
                </div>
            </div>
        `;
    });

    feather.replace();
}

// -------------------------
// CREATE NEW PROJECT → CALL /ask POST
// -------------------------
function createNewProject() {
    const prompt = prompt("Describe your project:");

    if (!prompt) return;

    startNewProject(prompt);
}

async function startNewProject(promptText) {
    if (!AppState.token) {
        alert("Please login first!");
        return;
    }

    const streamRes = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "USERID": "Bearer " + AppState.token
        },
        body: JSON.stringify({
            model: "kwaipilot/kat-coder-pro:free",
            prompt: promptText
        })
    });

    const reader = streamRes.body.getReader();
    let resultText = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        resultText += new TextDecoder().decode(value);
    }

    try {
        const json = JSON.parse(resultText.trim().split("\n").slice(-1)[0]);
        if (json.ok) {
            location.reload();
        }
    } catch (e) {
        console.log("Stream:", resultText);
    }
}

// -------------------------
// OPEN PROJECT (GO TO EDITOR)
// -------------------------
function openProject(repoName) {
    window.location.href = `/Code_studio?repo=${repoName}`;
}

// -------------------------
// DOWNLOAD PROJECT
// -------------------------
function downloadProject(repoName) {
    alert("Download function will ZIP files from backend soon. Repo: " + repoName);
}

// -------------------------
// UPDATE PROJECT → CALL /ask PUT
// -------------------------
async function updateProject(repoName, instructions) {
    if (!AppState.token) {
        alert("Please login first!");
        return;
    }

    const streamRes = await fetch(`${API_BASE}/ask`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "USERID": "Bearer " + AppState.token
        },
        body: JSON.stringify({
            model: "kwaipilot/kat-coder-pro:free",
            edit_instructions: instructions,
            repo_id: repoName
        })
    });

    const reader = streamRes.body.getReader();
    let result = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += new TextDecoder().decode(value);
    }

    console.log("PUT Response:", result);
}

// -------------------------
// SETUP BUTTON EVENTS
// -------------------------
function setupEventListeners() {
    const btn = document.querySelector('[data-new-project]');
    if (btn) {
        btn.onclick = createNewProject;
    }
}
