// ---------------------- GLOBAL STATE ----------------------
let editor;
let currentFile = "index.html";
let projectFiles = { "index.html": "" };
let fileTabs = {};

const API_KEY = localStorage.getItem("api_key"); 
// Make sure backend returns backend_api_key => save it in localStorage after login/register.


// ---------------------- EDITOR INIT ----------------------
function initEditor() {
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/html");

    editor.setOptions({
        fontSize: "14px",
        showPrintMargin: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true
    });

    if (!projectFiles["index.html"].trim()) {
        projectFiles["index.html"] = defaultTemplate();
    }

    editor.setValue(projectFiles["index.html"]);
    editor.session.on("change", updatePreview);

    createFileTabsBar();
    createFileTab("index.html", projectFiles["index.html"]);
    switchFile("index.html");
}


// ---------------------- DEFAULT HTML TEMPLATE ----------------------
// function defaultTemplate() {
    // return `
    // <!DOCTYPE html>
// <html lang="en">
// <head>
//     <title>Neon App</title>
//     <meta charset="UTF-8" />
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">

//     <script src="https://cdn.tailwindcss.com"></script>

//     <script>
//         tailwind.config = {
//             theme: {
//                 extend: {
//                     colors: {
//                         light: {
//                             bg: '#f9fafb',
//                             card: '#ffffff',
//                         }
//                     }
//                 }
//             }
//         }
//     </script>
// </head>

// <body class="flex justify-center items-center h-screen bg-light-bg text-gray-900 text-center overflow-hidden">

//     <!-- Soft gradient background -->
//     <div class="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-purple-400/20 to-pink-400/20 blur-3xl"></div>

//     <div class="relative z-10">
//         <!-- Badge -->
//         <span class="inline-block text-xs px-3 py-1 mb-4
//             border border-cyan-500/40
//             bg-cyan-500/10
//             text-cyan-600
//             rounded-full">
//             ⚡ Ready to code
//         </span>

//         <!-- Title -->
//         <h1 class="text-5xl md:text-6xl font-extrabold mt-4
//             bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500
//             bg-clip-text text-transparent">
//             Code Studio
//         </h1>

//         <!-- Subtitle -->
//         <p class="mt-3 text-gray-500 text-lg">
//             Ask the AI to build something.
//         </p>
//     </div>

// </body>
// </html>


// `;
// }


// ---------------------- FILE TAB BAR ----------------------
function createFileTabsBar() {
    let container = document.getElementById("fileTabs");

    if (!container) {
        const bar = document.createElement("div");
        bar.id = "fileTabs";
        bar.className =
            "bg-gray-800 border-b border-gray-700 flex gap-2 px-4 py-2 overflow-x-auto";
        document.querySelector(".flex-1.flex.flex-col").prepend(bar);
    }
}


// ---------------------- CREATE FILE TAB ----------------------
function createFileTab(fileName, content) {
    const container = document.getElementById("fileTabs");

    if (!fileTabs[fileName]) {
        const tab = document.createElement("button");
        tab.className =
            "tab px-3 py-1 rounded bg-gray-700 text-sm text-white hover:bg-gray-600 transition";
        tab.textContent = fileName;
        tab.onclick = () => switchFile(fileName);

        container.appendChild(tab);
        fileTabs[fileName] = tab;
    }

    projectFiles[fileName] = content;

    if (currentFile === fileName) {
        editor.setValue(projectFiles[fileName], -1);
        updatePreview();
    }
}


// ---------------------- SWITCH FILE ----------------------
function switchFile(fileName) {
    currentFile = fileName;

    const ext = fileName.split(".").pop();
    editor.session.setMode(`ace/mode/${ext}`);
    editor.setValue(projectFiles[fileName]);

    highlightActiveTab(fileName);
    updatePreview();
}


// ---------------------- ACTIVE TAB UI ----------------------
function highlightActiveTab(target) {
    Object.keys(fileTabs).forEach(name => {
        fileTabs[name].classList.toggle("bg-blue-600", name === target);
        fileTabs[name].classList.toggle("bg-gray-700", name !== target);
    });
}


// ---------------------- LIVE PREVIEW ----------------------
function updatePreview() {
    projectFiles[currentFile] = editor.getValue();

    if (projectFiles["index.html"]) {
        document.getElementById("preview").srcdoc =
            projectFiles["index.html"];
    }
}


// ------------------------------------------------------------
// ---------------------- CHAT SYSTEM -------------------------
// ------------------------------------------------------------
document.getElementById("sendBtn").addEventListener("click", sendMessage);
document.getElementById("chatInput").addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});


async function sendMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message) return;

    const chatMessages = document.getElementById("chatMessages");

    // USER MESSAGE
    const userMsg = document.createElement("div");
    userMsg.className = "bg-blue-600 rounded-lg p-3 ml-8 text-white";
    userMsg.innerHTML = `<p class="text-sm">${message}</p>`;
    chatMessages.appendChild(userMsg);

    input.value = "";

    // AI MESSAGE
    const aiMsg = document.createElement("div");
    aiMsg.className = "bg-gray-700 rounded-lg p-3 mr-8 text-white whitespace-pre-wrap";
    aiMsg.textContent = "Generating response...";
    chatMessages.appendChild(aiMsg);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch("/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + API_KEY
            },
            body: JSON.stringify({ prompt: message })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        aiMsg.textContent = "";
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            fullText += chunk;
            aiMsg.textContent += chunk;

            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        parseAIResponse(fullText);

    } catch (err) {
        aiMsg.textContent = "⚠️ Error: " + err.message;
    }
}


// ---------------------- PARSE RETURNED FILES ----------------------
function parseAIResponse(text) {
    const filePattern =
        /<<<<<<< NEW_FILE_START (.*?) >>>>>>> NEW_FILE_END[\s\S]*?```[a-zA-Z]*\n([\s\S]*?)```/g;

    let match;
    let foundFiles = [];

    while ((match = filePattern.exec(text)) !== null) {
        foundFiles.push({
            name: match[1].trim(),
            content: match[2].trim()
        });
    }

    if (foundFiles.length) {
        const chatMessages = document.getElementById("chatMessages");

        chatMessages.innerHTML += `
            <div class="bg-green-700 rounded-lg p-3 mr-8 text-sm mt-2">
                Files created: ${foundFiles.map(f => f.name).join(", ")}
            </div>`;

        foundFiles.forEach(f => {
            createFileTab(f.name, f.content);
        });

        if (projectFiles["index.html"]) {
            document.getElementById("preview").srcdoc = projectFiles["index.html"];
        }
    }
}


// ---------------------- DOWNLOAD ZIP ----------------------
document.getElementById("btn2").addEventListener("click", () => {
    const zip = new JSZip();

    for (const [fileName, content] of Object.entries(projectFiles)) {
        zip.file(fileName, content);
    }

    zip.generateAsync({ type: "blob" }).then(blob => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "project.zip";
        link.click();
    });
});


// ---------------------- INIT ----------------------
window.addEventListener("load", () => {
    initEditor();
    updatePreview();
});
