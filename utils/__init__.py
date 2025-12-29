# utils.py
import re, json

def extract_repo_and_files(text: str):
    # Get project name
    project = re.search(r"<<<<<<< PROJECT_NAME_START\s*(.*?)\s*>>>>>>> PROJECT_NAME_END", text, re.DOTALL)
    project_name = project.group(1).strip() if project else "APINOW_Project"

    # Flexible file extraction
    pattern = re.compile(r"<<<<<<< NEW_FILE_START\s*(.*?)\s*>>>>>>> NEW_FILE_END\s*```[^\n]*\n(.*?)(?=\n<<<<<<<|$)", re.DOTALL)
    files = []
    for filename, content in pattern.findall(text):
        files.append({
            "file_name": filename.strip(),
            "content": content.strip(),
            "repo_name": project_name
        })
    return files
