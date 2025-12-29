import json
import uuid
import os
from datetime import datetime, timezone
import os
from typing import Optional, Dict, Any, List

getcwd = os.getcwd()


# ---------------- LOGIN CLASS ----------------
class l:
    def __init__(self, filename=os.path.join(getcwd,"users.json")):
        self.filename = filename
        try:
            with open(self.filename, "r") as f:
                json.load(f)
        except:
            with open(self.filename, "w") as f:
                json.dump({"data": []}, f, indent=4)

    def _load_data(self):
        try:
            with open(self.filename, "r") as f:
                return json.load(f)
        except:
            return {"data": []}

    def _save_data(self, data):
        with open(self.filename, "w") as f:
            json.dump(data, f, indent=4)

    def _now(self):
        return datetime.now(timezone.utc).isoformat()
    # -------- USER FIND (API KEY AUTH) --------
    def find_user_by_apikey(self, apikey):
        data = self._load_data()
        return next((u for u in data["data"] if u["backend_api_key"] == apikey), None)

    # ---------- USER CREATION ----------
    def register_user(
        self,
        full_name: str,
        email: str,
        avatar_url: Optional[str] = None,
        github_node_id: Optional[str] = None,
    ) -> Optional[str]:

        data = self._load_data()

        if any(user["email"].lower() == email.lower() for user in data["data"]):
            print("❌ Email already registered.")
            return None

        user_id = str(uuid.uuid4())
        backend_api_key = f"sk-apinow-v1-{str(uuid.uuid4())[:3]}-{uuid.uuid4().hex}"

        new_user = {
            "id": user_id,
            "updated_at": self._now(),
            "full_name": full_name,
            "avatar_url": avatar_url or "",
            "email": email,
            "github_node_id": github_node_id or "",
            "backend_api_key": backend_api_key,
            "subscription_status": "inactive",
            "subscription_plan": None,
            "subscription_end_date": None,
            "is_pro": False,
            "RPM_limit": 8,
            "repo_name": {"data": []},
            "total_tokens_used": 0,
            "monthly_tokens_used": 0,
            "last_model_used": []
        }

        data["data"].append(new_user)
        self._save_data(data)

        print(f"✅ Registered '{full_name}' ({email}) with API key: {backend_api_key}")
        return user_id

    # ---------- USER LOOKUPS ----------
    def find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return next((u for u in self._load_data()["data"] if u["email"].lower() == email.lower()), None)

    def find_user_by_id(self, user_id):
        data = self._load_data()
        return next((u for u in data["data"] if u["id"] == user_id), None)

    # -------- REPOSITORY FUNCTIONS --------
    def find_repo_by_id(self, user_id, repo_id):
        data = self._load_data()
        user = next((u for u in data["data"] if u["id"] == user_id), None)
        if not user:
            return None

        for repo_entry in user.get("repo_name", {}).get("data", []):
            for repo_name, repo in repo_entry.items():
                if repo.get("repo_id") == repo_id:
                    return {
                        "repo_name": repo_name,
                        "repo_data": repo
                    }
        return None

    def make_repo(self, repo_name, user_id, files):
        data = self._load_data()
        user = next((u for u in data["data"] if u["id"] == user_id), None) or next((u for u in data["data"] if u["backend_api_key"] == user_id), None)

        if not user:
            return False

        mapped = {f["file_name"]: f["content"] for f in files}

        repo = {
            "repo_id": str(uuid.uuid4()),
            "file": mapped
        }

        user["repo_name"]["data"].append({repo_name: repo})
        user["updated_at"] = self._now()
        self._save_data(data)
        return True

    def update_repo(self, user_id, repo_id, updated_repo):
        data = self._load_data()
        user = next((u for u in data["data"] if u["id"] == user_id), None)
        if not user:
            return False

        repo_list = user["repo_name"]["data"]

        for i, repo_entry in enumerate(repo_list):
            for repo_name, repo in repo_entry.items():
                if repo["repo_id"] == repo_id:
                    repo_list[i] = {repo_name: updated_repo}
                    self._save_data(data)
                    return True
        return False