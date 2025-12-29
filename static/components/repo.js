
    // repo-loader-with-ace-init.js
// Full standalone JS (no HTML) to:
// 1) Ensure ACE is available (use existing editor, or load ACE from CDN).
// 2) Initialize ACE if needed (on element with id="editor").
// 3) Fetch repo from /Code_studio/:USERNAME/:Repoid and populate a clickable file list.
// 4) Robust handling when editor isn't ready, file content missing, or binary files encountered.
//
// Usage: include this script anywhere after <body> (it will wait for DOMContentLoaded).
// Assumptions: page has #editor and #currentFilename elements (if not, the script will create #editor).

(function () {
  "use strict";

  // ---------- Config ----------
  const ACE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.2/ace.js";
  const EDITOR_WAIT_TIMEOUT = 7000; // ms to wait for ace/editor
  const EDITOR_POLL_INTERVAL = 100; // ms

  // ---------- Helpers ----------
  function log(...args) { console.info("[repo-loader]", ...args); }
  function warn(...args) { console.warn("[repo-loader]", ...args); }
  function error(...args) { console.error("[repo-loader]", ...args); }

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      const v = attrs[k];
      if (k === "class") el.className = v;
      else if (k === "style") {
        if (typeof v === "string") el.setAttribute("style", v);
        else if (v && typeof v === "object") Object.assign(el.style, v);
      } else if (v !== null && v !== undefined) {
        el.setAttribute(k, v);
      }
    }
    (children || []).forEach(c => {
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  function cssEscape(s) {
    try { return CSS.escape(s); } catch (e) { return s.replace(/(["'\\])/g, "\\$1"); }
  }

  function waitFor(selector, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const start = Date.now();
      const iv = setInterval(() => {
        const found = document.querySelector(selector);
        if (found) { clearInterval(iv); return resolve(found); }
        if (Date.now() - start > timeout) { clearInterval(iv); return reject(new Error("Timeout waiting for " + selector)); }
      }, 80);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // avoid duplicate loads
      if (document.querySelector(`script[src="${src}"]`)) {
        return resolve();
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = (e) => reject(new Error("Failed to load script " + src));
      document.head.appendChild(s);
    });
  }

  // simple file mode guess for ACE
  function guessAceMode(filename) {
    const ext = (filename.split(".").pop() || "").toLowerCase();
    const map = {
      js: "ace/mode/javascript", mjs: "ace/mode/javascript", cjs: "ace/mode/javascript",
      ts: "ace/mode/typescript",
      html: "ace/mode/html", htm: "ace/mode/html",
      css: "ace/mode/css",
      json: "ace/mode/json",
      py: "ace/mode/python",
      java: "ace/mode/java",
      md: "ace/mode/markdown",
      xml: "ace/mode/xml",
      sh: "ace/mode/sh",
      txt: "ace/mode/text"
    };
    return map[ext] || "ace/mode/text";
  }

  function looksBinary(content) {
    if (typeof content !== "string") return true;
    const sample = content.slice(0, 256);
    let nonPrintable = 0;
    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i);
      if (code === 65533) nonPrintable++;
      if (code > 126 && code < 160) nonPrintable++;
    }
    return nonPrintable > 6;
  }

  // ---------- ACE init/wait ----------
  async function ensureAceEditor() {
    // wait for #editor element or create it
    let editorEl;
    try {
      editorEl = await waitFor("#editor", 1000);
    } catch (e) {
      // If there's no #editor, create a minimal one and append to body
      log("#editor not found - creating a fallback editor container");
      editorEl = createEl("div", { id: "editor" });
      Object.assign(editorEl.style, { width: "100%", height: "100%", minHeight: "200px", background: "#1e1e1e" });
      document.body.appendChild(editorEl);
    }

    // If a global editor instance already exists and looks valid, return it
    if (typeof window.editor !== "undefined" && window.editor && typeof window.editor.setValue === "function") {
      log("Using existing global editor instance");
      return window.editor;
    }

    // Ensure ace library is present. If not, load it.
    if (typeof window.ace === "undefined") {
      log("ACE not found - loading from CDN:", ACE_CDN);
      try {
        await loadScript(ACE_CDN);
      } catch (e) {
        error("Failed to load ACE:", e);
        throw e;
      }
      // give the ace script a tick to initialize
      await new Promise(r => setTimeout(r, 50));
    }

    // Now initialize editor
    try {
      window.editor = window.ace.edit("editor");
      window.editor.setTheme("ace/theme/dracula");
      // default to HTML mode (the loader will try to set specific modes per-file)
      try { window.editor.session.setMode("ace/mode/html"); } catch (e) { /* ignore */ }
      window.editor.setOptions({ fontSize: "12pt", showPrintMargin: false });
      log("ACE editor initialized");
      return window.editor;
    } catch (e) {
      error("Failed to initialize ACE editor:", e);
      throw e;
    }
  }

  // ---------- File list UI ----------
  function ensureFileListUI() {
    let container = document.getElementById("fileListContainer");
    if (container) return { container, list: container.querySelector("#fileList"), search: container.querySelector("#fileSearch"), downloadBtn: container.querySelector("#downloadAllBtn") };

    // Try to append into #chatPanel if present, otherwise to body
    const attachTo = document.getElementById("chatPanel") || document.body;
    container = createEl("div", { id: "fileListContainer", class: "repo-filelist" });
    Object.assign(container.style, {
      padding: "10px", margin: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.03)", maxHeight: "44vh", overflowY: "auto", width: "100%"
    });

    const search = createEl("input", { id: "fileSearch", placeholder: "Filter files..." });
    Object.assign(search.style, { width: "100%", padding: "8px", marginBottom: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.03)", background: "transparent", color: "inherit" });
    container.appendChild(search);

    const list = createEl("ul", { id: "fileList" });
    Object.assign(list.style, { listStyle: "none", padding: "0", margin: "0", gap: "6px" });
    container.appendChild(list);

    const footer = createEl("div", { id: "fileListFooter" });
    Object.assign(footer.style, { marginTop: "8px", display: "flex", justifyContent: "space-between" });
    const downloadBtn = createEl("button", { id: "downloadAllBtn", title: "Download all as ZIP" }, ["Download ZIP"]);
    Object.assign(downloadBtn.style, { padding: "6px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" });
    footer.appendChild(downloadBtn);
    container.appendChild(footer);

    attachTo.appendChild(container);
    return { container, list, search, downloadBtn };
  }

  // ---------- Repo fetch & load ----------
  async function fetchRepo(USERNAME, Repoid, USERID) {
    const endpoint = `/Code_studio/${USERNAME}/${Repoid}`;
    const headers = { "Content-Type": "application/json" };
    if (USERID) headers["Userid"] = USERID;
    const resp = await fetch(endpoint, { method: "POST", headers });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const body = await resp.json();
    return body;
  }

  // ---------- Main ----------
  document.addEventListener("DOMContentLoaded", async () => {
    log("repo-loader starting...");

    // tolerant path parsing
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const USERNAME = pathParts[1] || pathParts[2] || "";
    const Repoid = pathParts[2] || pathParts[3] || "";
    const USERID = localStorage.getItem("UID") || null;

    // ensure UI elements
    const currentFilenameEl = document.getElementById("currentFilename") || createEl("span", { id: "currentFilename" }, [""]);
    if (!document.getElementById("currentFilename")) {
      // try to put it somewhere sensible (top of body)
      const header = createEl("div", { style: "position:fixed; top:8px; left:8px; z-index:9999; background:rgba(0,0,0,0.6); padding:6px 10px; border-radius:6px; color:#cff;" }, [currentFilenameEl]);
      document.body.appendChild(header);
    }

    // Ensure ACE editor instance (this will create/load ACE if necessary)
    let aceEditor;
    try {
      aceEditor = await ensureAceEditor();
    } catch (e) {
      alert("Editor instance not found. Ensure ACE can be loaded. See console for details.");
      error(e);
      return;
    }

    // Build file list UI
    const ui = ensureFileListUI();
    const fileListEl = ui.list;
    const searchInput = ui.search;
    const downloadAllBtn = ui.downloadBtn;

    // Fetch repo
    let repoData;
    try {
      repoData = await fetchRepo(USERNAME, Repoid, USERID);
      log("Repo data:", repoData);
    } catch (e) {
      error("Error fetching repository:", e);
      alert("Error fetching repository: " + (e.message || e));
      return;
    }

    if (!repoData || !repoData.file || typeof repoData.file !== "object") {
      error("Backend returned no 'file' object:", repoData);
      alert("Backend returned no 'file' object. Check server response in console.");
      return;
    }

    const fileMap = Object.assign({}, repoData.file);
    const filenames = Object.keys(fileMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    if (filenames.length === 0) {
      fileListEl.appendChild(createEl("li", {}, ["No files in repository."]));
      return;
    }

    // populate list
    fileListEl.innerHTML = "";
    filenames.forEach(fname => {
      const li = createEl("li", { "data-fname": fname });
      Object.assign(li.style, { padding: "6px 8px", borderRadius: "6px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" });

      const left = createEl("div", {}, [ createEl("div", { style: "font-size:13px; word-break:break-word;" }, [fname]) ]);
      const right = createEl("div", {}, [ createEl("small", { style: "opacity:0.6; font-size:11px" }, ["view"]) ]);

      li.appendChild(left); li.appendChild(right);

      li.addEventListener("click", () => loadFileIntoEditor(fname, li));
      li.addEventListener("dblclick", (e) => { e.stopPropagation(); openRaw(fname, fileMap[fname]); });

      li.addEventListener("mouseenter", () => li.style.background = "rgba(255,255,255,0.02)");
      li.addEventListener("mouseleave", () => li.style.background = "transparent");

      fileListEl.appendChild(li);
    });

    // default load first file
    setTimeout(() => {
      if (filenames.length) {
        const first = filenames[0];
        const firstLi = fileListEl.querySelector('li[data-fname]');
        loadFileIntoEditor(first, firstLi);
      }
    }, 40);

    // search/filter
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const q = (e.target.value || "").toLowerCase().trim();
        fileListEl.querySelectorAll("li").forEach(li => {
          const fname = (li.dataset.fname || "").toLowerCase();
          li.style.display = fname.includes(q) ? "flex" : "none";
        });
      });
    }

    // download all (if JSZip loaded, will zip; otherwise open raw in new tabs)
    downloadAllBtn.addEventListener("click", async () => {
      if (typeof JSZip === "undefined") {
        if (!confirm("JSZip not available. Open each file in new tab to save?")) return;
        for (const f of filenames) openRaw(f, fileMap[f]);
        return;
      }
      try {
        const zip = new JSZip();
        filenames.forEach(f => zip.file(f, fileMap[f] ?? ""));
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (document.title || "repo") + ".zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } catch (e) { error("ZIP failed:", e); alert("Failed to generate ZIP. See console."); }
    });

    // expose for debugging
    window.__repoFiles = fileMap;
    window.__repoFilenames = filenames;

    // ---------- helpers used above ----------
    function openRaw(fname, content) {
      if (content === undefined) { alert("No content for " + fname); return; }
      // if looks binary, warn and open raw
      if (looksBinary(content)) {
        if (!confirm("File appears binary/unpreviewable. Open raw in new tab?")) return;
      }
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }

    async function loadFileIntoEditor(filename, listItemEl) {
      if (!filename) return;
      // highlight
      try {
        fileListEl.querySelectorAll("li").forEach(li => li.classList.remove("selected-file"));
        if (listItemEl) listItemEl.classList.add("selected-file");
        else {
          const sel = fileListEl.querySelector(`li[data-fname="${cssEscape(filename)}"]`);
          if (sel) sel.classList.add("selected-file");
        }
      } catch (e) { /* ignore */ }

      currentFilenameEl.textContent = filename + " — loading...";
      const content = fileMap[filename];
      log("Loading file:", filename, "type:", typeof content, "len:", typeof content === "string" ? content.length : "n/a");

      if (content === undefined) {
        currentFilenameEl.textContent = filename + " — (no content)";
        alert("File content undefined for: " + filename + ". Check server JSON in console.");
        return;
      }
      if (content === null || (typeof content === "string" && content.length === 0)) {
        currentFilenameEl.textContent = filename + " — (empty file)";
        try {
          aceEditor.session.setMode(guessAceMode(filename));
          aceEditor.setValue("", -1);
        } catch (e) { warn("editor set empty failed:", e); }
        return;
      }
      if (looksBinary(content)) {
        currentFilenameEl.textContent = filename + " — (binary)";
        if (confirm("This looks binary/unpreviewable. Open raw in new tab?")) openRaw(filename, content);
        return;
      }

      // try set editor mode + content
      try {
        aceEditor.session.setMode(guessAceMode(filename));
      } catch (e) { /* ignore mode errors */ }
      try {
        aceEditor.setValue(content, -1);
        currentFilenameEl.textContent = filename;
      } catch (err) {
        error("Failed to set editor content for", filename, err);
        currentFilenameEl.textContent = filename + " — (load failed)";
        alert("Failed to load file into editor. See console for details.");
      }
    }

    // add small selected-file CSS for list
    try {
      const s = document.createElement("style");
      s.innerHTML = `
        #fileList li.selected-file { background: linear-gradient(90deg, rgba(6,182,212,0.06), rgba(59,130,246,0.03)); border: 1px solid rgba(6,182,212,0.08); }
        #fileList li { transition: background 120ms ease; }
      `;
      document.head.appendChild(s);
    } catch (e) { /* ignore */ }

  }); // DOMContentLoaded end

})();