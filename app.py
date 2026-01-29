 # app.py
import uuid
import re
import json
from openai  import OpenAI
import os
from flask import Flask, request, Response ,render_template , send_from_directory , jsonify
from flask_cors import CORS

# ---- Your imports ----
# from Provider import coherelab_PROVIDER
from prompt import INITIAL_SYSTEM_PROMPT, FOLLOW_UP_SYSTEM_PROMPT ,EDITOR_AI
from Login import l as login  # class name is lowercase L
from requests import Session


import requests
import json
from typing import List, Dict, Generator, Optional


class Deepinfra:
    def __init__(
        self,
        api_key: str="sk-apinow-tbfgenratedpro",
        base_url: str = "https://back.apinow.in/"
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream"
        })

        self.model_aliases = {
            "Kimi-K2-Instruct": "kimi-k2",
            "Kimi-K2-Instruct-0905": "kimi-k2-0905",
            "Qwen3-14B": "qwen14",
            "Qwen3-30B-A3B": "qwen30",
            "Qwen3-235B-A22B": "qwen235",
            "Qwen3-235B-A22B-Instruct-2507": "qwen235-inst",
            "Qwen3-Coder-30B-A3B-Instruct": "qwen-coder-30",
            "Qwen3-Coder-480B-A35B-Instruct": "qwen-coder-480",
            "Qwen3-Coder-480B-A35B-Instruct-Turbo": "qwen-coder-480-turbo",

            "DeepSeek-R1": "deepseek-r1",
            "DeepSeek-R1-Turbo": "deepseek-r1-turbo",
            "DeepSeek-R1-0528": "deepseek-r1-0528",
            "DeepSeek-R1-0528-Turbo": "deepseek-r1-0528-turbo",
            "DeepSeek-R1-Distill-Qwen-32B": "deepseek-r1-qwen",
            "DeepSeek-R1-Distill-Llama-70B": "deepseek-r1-llama",

            "DeepSeek-V3": "deepseek-v3",
            "DeepSeek-V3.1": "deepseek-v3.1",
            "DeepSeek-V3.2-Exp": "deepseek-v3.1-exp",
            "DeepSeek-V3-0324": "deepseek-v3-0324",
            "DeepSeek-V3-0324-Turbo": "deepseek-v3-0324-turbo",
            "DeepSeek-V3.1-Terminus": "deepseek-terminus",
            "DeepSeek-Prover-V2-671B": "deepseek-prover",

            "Llama-3.2-90B-Vision-Instruct": "llama90b-vis",
            "Llama-3.3-70B-Instruct": "llama3.3",
            "Llama-4-Scout-17B-16E-Instruct": "llama4-scout",
            "Llama-4-Maverick-17B-128E-Instruct-Turbo": "llama4-maverick",
            "Llama-4-Maverick-17B-128E-Instruct-FP8": "llama4-maverick-fp8",

            "Mistral-7B-Instruct-v0.3": "mistral7b",
            "Mistral-Small-3.1-24B-Instruct-2503": "mistral-small-3.1",
            "Mistral-Small-3.2-24B-Instruct-2506": "mistral-small-3.2",

            "Devstral-Small-2505": "devstral-2505",
            "Devstral-Small-2507": "devstral-2507",

            "phi-4": "phi4",
            "phi-4-reasoning-plus": "phi4-reason",
            "Phi-4-multimodal-instruct": "phi4-mm",

            "gemma-3-4b-it": "gemma4b",
            "gemma-3-12b-it": "gemma12b",
            "gemma-3-27b-it": "gemma27b",

            "Sky-T1-32B-Preview": "skyt1",
            "olmOCR-7B-0725-FP8": "olmocr",
        }

    # =======================
    # CHAT COMPLETION
    # =======================
    def create(
        self,
        model: str,
        messages: List[Dict[str, str]],
        stream: bool = False,
        # max_tokens: int = 2048,
        timeout: Optional[int] = None
    ):
        url = f"{self.base_url}/v1/chat/completions"

        payload = {
            "model": self.model_aliases[model],
            "messages": messages,
            "stream": stream,
            # "max_tokens": max_tokens
        }

        if stream:
            return self._stream_request(url, payload, timeout)
        else:
            return self._normal_request(url, payload, timeout)

    # =======================
    # NON-STREAM REQUEST
    # =======================
    def _normal_request(self, url, payload, timeout):
        response = self.session.post(
            url,
            json=payload,
            timeout=timeout
        )

        response.raise_for_status()
        return response.json()

    # =======================
    # STREAM REQUEST (SSE)
    # =======================
    def _stream_request(
        self,
        url: str,
        payload: dict,
        timeout: Optional[int]
    ) -> Generator[str, None, None]:

        response = self.session.post(
            url,
            json=payload,
            stream=True,
            timeout=timeout
        )

        response.raise_for_status()

        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue

            if line.startswith("data: "):
                data = line[len("data: "):].strip()

                if data == "[DONE]":
                    break

                try:
                    chunk = json.loads(data)
                    delta = chunk["choices"][0]["delta"]
                    content = delta.get("content")

                    if content:
                        yield content

                except Exception as e:
                    print("⚠️ Stream parse error:", e)
                    continue

deepinfra = Deepinfra

app = Flask(__name__)
CORS(app,supports_credentials=True)
user_manager = login()
api_key = "sk-apinow-tbfgenratedpro"
auth = login() # For user auth functions


def generate_api_key():
    return "sk-apinow-v1-" + str(uuid.uuid4()).replace("-", "")[:12] + "-" + uuid.uuid4().hex[:16]


def format_user(user):
    """Return EXACT format you want"""
    return {
        "id": str(user["_id"]),
        "updated_at": user.get("updated_at"),
        "full_name": user.get("full_name", ""),
        "avatar_url": user.get("avatar_url", ""),
        "email": user.get("email", ""),
        "github_node_id": user.get("github_node_id", ""),
        "backend_api_key": user.get("backend_api_key"),
        "subscription_status": user.get("subscription_status", "inactive"),
        "subscription_plan": user.get("subscription_plan"),
        "subscription_end_date": user.get("subscription_end_date"),
        "is_pro": user.get("is_pro", False),
        "RPM_limit": user.get("RPM_limit", 8),
        "repo_name": {
            "data": user.get("repo_name", [])
        },
        "total_tokens_used": user.get("total_tokens_used", 0),
        "monthly_tokens_used": user.get("monthly_tokens_used", 0),
        "last_model_used": user.get("last_model_used", [])
    }



def extract_files(response_text: str) -> dict:
    # ✅ Updated pattern:
    pattern = r"<<<<<<< UPDATE_FILE_START (.*?) >>>>>>> UPDATE_FILE_END\s*([a-zA-Z0-9_\-]*)\s*(.*?)>>>>>>> UPDATE_FILE_END"
    
    matches = re.findall(pattern, response_text, re.DOTALL )
    files = {}

    for filename, lang, content in matches:
        content = content.strip()
        files[filename.strip()] = content

    return files



# ✅ FIXED EXTRACTOR
def extract_repo_and_files(text: str):
    # Get project name
    project = re.search(
        r"<<<<<<< PROJECT_NAME_START\s*(.*?)\s*>>>>>>> PROJECT_NAME_END", text
    )
    project_name = project.group(1).strip() if project else "Unknown_Project"

    # Flexible file extraction (works even if closing ``` is missing)
    pattern = re.compile(
        r"<<<<<<< NEW_FILE_START\s*(.*?)\s*>>>>>>> NEW_FILE_END\s*```[^\n]*\n(.*?)(?=\n<<<<<<<|$)",
        re.DOTALL
    )

    files = []
    for filename, content in pattern.findall(text):
        files.append({
            "file_name": filename.strip(),
            "content": content.strip(),
            "repo_name": project_name
        })

    return files

def PUT(body, headers):
    model = body.get("model", "kwaipilot/kat-coder-pro:free")
    edit_instructions = body.get("edit_instructions")
    repo_id = body.get("repo_id")

    if not model or not edit_instructions or not repo_id:
        yield json.dumps({"ok": False, "error": "Missing required fields"}) + "\n"
        return

    # Decode Auth token → UUID
    auth = headers.get("authorization", "")
    try:
        userid = auth.replace("Bearer ", "")
    except:
        yield json.dumps({"ok": False, "error": "Invalid token"}) + "\n"
        return

    user = login().find_user_by_apikey(userid)
    if not user:
        yield json.dumps({"ok": False, "error": "User not found"}) + "\n"
        return

    # ✅ FIXED: Use correct repo lookup method
    repo_info = login().find_repo_by_id(userid, repo_id)
    if not repo_info:
        yield json.dumps({"ok": False, "error": "Repository not found"}) + "\n"
        return

    repo_data = repo_info["repo_data"]
    repo_name = repo_info["repo_name"]
    projcet_name = f"<<<<<<< PROJECT_NAME_START\n{repo_name}\n>>>>>>> PROJECT_NAME_END\n"
    files_data = repo_data.get("file", {})

    # Build text from existing files
    existing_file = ""
    for file_name, content in files_data.items():
        existing_file += f"File Name: {file_name}\nContent:\n{content}\n\n"

    try:
        c = OpenAI(
            base_url="https://Techbitforge-m.hf.space/v1",
            api_key=api_key
            )

        res = c.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": EDITOR_AI},
                {"role": "user", "content": "make a website"},
                {"role": "assistant", "content": "project name is this " + projcet_name + "project file and content is this:" + existing_file},
                {"role": "user", "content": "from in this website make change like this " + edit_instructions + " the code best as possible and give clear code and don't add any comment"}
            ],
            stream=True,
        )

        full_output = ""
        for chunk in res:
            chunk_text = getattr(chunk.choices[0].delta, "content", "")
            if chunk_text:
                full_output += chunk_text
                yield chunk_text
        
        # ✅ Extract updated files
        extracted_files = extract_files(full_output)
        if not extracted_files:
            yield "\n" + json.dumps({"ok": False, "error": "No updated files detected"}) + "\n"
            return
        
        # ✅ Update repo files in memory
        for file_name, content in extracted_files.items():
            files_data[file_name] = content

        # ✅ Save the updated repo back to database
        updated_repo_data = {
            "repo_name": repo_name,
            "repo_data": {
                "file": files_data
            }
        }

        try:
            # Use your login() class method to update existing repo
            login().update_repo(userid, repo_id, updated_repo_data)
        except Exception as e:
            yield "\n" + json.dumps({"ok": False, "error": f"Repo update failed: {str(e)}"}) + "\n"
            return

        yield "\n" + json.dumps({
            "ok": True,
            "message": "Edit completed successfully and repo updated",
            "updated_files": list(extracted_files.keys())
        }) + "\n"

    except Exception as e:
        yield "\n" + json.dumps({"ok": False, "error": str(e)}) + "\n" 


deepinfra = deepinfra()

def POST(body, headers):
    try:
        model = body.get("model", "DeepSeek-V3-0324")
        prompt = body.get("prompt")

        if not prompt:
            yield f"data: {json.dumps({'ok': False, 'error': 'Missing prompt'})}\n\n"
            return

        auth = headers.get("authorization", "")
        if not auth.startswith("Bearer "):
            yield f"data: {json.dumps({'ok': False, 'error': 'Invalid token'})}\n\n"
            return

        userid = auth.replace("Bearer ", "").strip()
        user = login().find_user_by_apikey(userid)

        if not user:
            yield f"data: {json.dumps({'ok': False, 'error': 'User not found'})}\n\n"
            return

        messages = [
            {
                "role": "system",
                "content": INITIAL_SYSTEM_PROMPT + FOLLOW_UP_SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": prompt
            }
        ]

        stream = deepinfra.create(
            model=model,
            messages=messages,
            stream=True
        )

        full_output = ""

        for token in stream:
            full_output += token
            yield token

        extracted = extract_repo_and_files(full_output)

        if not extracted:
            yield f"data: {json.dumps({'ok': False, 'error': 'No repo files detected'})}\n\n"
            return

        repo_name = extracted[0]["repo_name"]
        login().make_repo(repo_name, userid, extracted)

        yield f"data: {json.dumps({'ok': True, 'type': 'done', 'repo': repo_name})}\n\n"

    except Exception as e:
        # print(e) 
        yield f"data: {json.dumps({'ok': False, 'error': str(e), 'server_error': True})}\n\n"


# --------- ROUTE ---------
@app.route("/ask", methods=["POST","PUT"])
def generate():
    if request.method == "POST":
        return Response(
        POST(request.json or {}, request.headers),
        mimetype="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
    if request.method == "PUT":
        return Response(
            PUT(request.json, request.headers),
            mimetype="application/json"
        )


# -------------------------------------------------
# ✅ REGISTER USER
# -------------------------------------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.json

    full_name = data.get("full_name")
    email = data.get("email")
    avatar_url = data.get("avatar_url")
    github_node_id = data.get("github_node_id")

    if not full_name or not email:
        return jsonify({"error": "full_name and email are required"}), 400

    # CHECK IF EMAIL EXISTS
    existing = auth.find_user_by_email(email)
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    # REGISTER USER
    user_id = auth.register_user(full_name, email, avatar_url, github_node_id)
    user = auth.find_user_by_id(user_id)

    return jsonify({
        "message": "User registered successfully",
        "data": [user]
    }), 200


# -------------------------------------------------
# ✅ LOGIN USER (no password)
# -------------------------------------------------
@app.route("/login", methods=["POST"])
def login_route():
    data = request.json
    email = data.get("email")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    # FIND USER
    user = auth.find_user_by_email(email)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Return user + API key
    return jsonify({
        "message": "Login successful",
        "data": [user]
    }), 200


# -------------------------------------------------
# ✅ GET USER BY API KEY
# -------------------------------------------------
@app.route("/get_user", methods=["GET"])
def get_user():
    """Fetch user details using backend_api_key from Authorization header"""

    api_key = request.headers.get("Authorization")

    if not api_key:
        return jsonify({"error": "Missing Authorization header"}), 400

    # Expected: Bearer <token>
    if api_key.startswith("Bearer "):
        api_key = api_key.replace("Bearer ", "").strip()

    # Lookup user
    user = auth.find_user_by_apikey(api_key)
    if not user:
        return jsonify({"error": "Invalid API key"}), 404

    return jsonify({
        "message": "User fetched successfully",
        "data": [user]
    }), 200


@app.route('/get_repo', methods=['POST'])
def get_repo():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400

    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    try:
        auth = login()
        user = auth.find_user_by_id(user_id)
    except Exception as e:
        return jsonify({"error": f"Internal error: {str(e)}"}), 500

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Extract repo safely
    repos = user.get("repo_name", [])

    # If repo_name is structured as { "data": [...] }
    if isinstance(repos, dict):
        repos = repos.get("data", [])

    # Ensure list-type output
    if repos is None:
        repos = []

    return jsonify({
        "message": "Repositories fetched successfully",
        "data": repos
    }), 200



@app.route('/Code_studio', methods=['GET'])
def code_studio():
    return render_template("CODE_STUDIO.html")

@app.route('/Code_studio/<USERNAME>/<Repoid>', methods=['POST', "GET"])
def code_studio_repo(USERNAME, Repoid):
    if request.method == 'POST':
        USERNAME = USERNAME.replace("%20", " ")
        Repoid = Repoid.replace("%20", " ")

        if not USERNAME or not Repoid:
            return jsonify({"error": "Missing USERNAME or Repodid"}), 400
        
        user_id = request.headers.get("Userid")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        
        try:
            user = login().find_user_by_id(user_id)
            if user.get("full_name") != USERNAME:
                return jsonify({"error": "Unauthorized"}), 401
            if not user:
                return jsonify({"error": "User not found"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        repo_info = login().find_repo_by_id(user_id, Repoid)
        if not repo_info:
            return jsonify({"error": "Repository not found"}), 404

        return jsonify(repo_info['repo_data']), 200

    else:
        return render_template("repo.html")


@app.route('/Code_studio/new', methods=['GET'])
def code_studio_new():
    return render_template("New.html")

# --------- SERVE FRONTEND ---------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/Templates")
def Templates():
    return render_template("comingsoon.html")

@app.route("/About_us")
def aboutus():
    return send_from_directory(os.path.join(app.root_path, 'templates'), 'aboutus.html')

@app.route("/pricing")
def pricing():
    return send_from_directory(os.path.join(app.root_path, 'templates'), 'pricing.html')

# ✅ CSS
@app.route('/92030904.css')
def stylescss():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'style.css')

# ✅ JS
@app.route('/9203945.js')
def navbarjs():
    return send_from_directory(os.path.join(app.root_path, 'static', 'components'), 'navbar.js')

@app.route('/92038405.js')
def footerjs():
    return send_from_directory(os.path.join(app.root_path, 'static', 'components'), 'footer.js')

@app.route('/92384050.js')
def scriptjs():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'script.js')


@app.route('/9309456.js')
def user():
    return send_from_directory(os.path.join(app.root_path, 'static','components'), 'user.js')

# ✅ Logo
@app.route('/9020930.png')
def logo():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'LOGO.png')

@app.route("/909909009.js")
def serve_watermaker():
    return send_from_directory(os.path.join(app.root_path, 'static', 'components'), "watermark.js")

@app.route("/9834056.js")
def pauth():
    return send_from_directory(os.path.join(app.root_path, 'static', 'components'), "auth.js")

@app.route("/91029333.js")
def new():
    return send_from_directory(os.path.join(app.root_path, 'static', 'components'), "new.js")


@app.route("/90909090.js")
def repo():
    return send_from_directory(os.path.join(app.root_path, 'static', 'components'), "repo.js")


@app.route("/9023883.js")
def singout():
    return send_from_directory(os.path.join(app.root_path, 'static', 'components'), "singout.js")

@app.route("/9023883.js")
def codes():
    return send_from_directory(os.path.join(app.root_path, 'static', 'components'), "code_stuio.js")


@app.route("/signup")
def signup_page():
    """Serve signup page"""
    return render_template("signup.html")


@app.route("/signin")
def signin_page():
    """Serve signup page"""
    return render_template("signup.html")

import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 1000))
    app.run(host="0.0.0.0", port=port,debug=False)
