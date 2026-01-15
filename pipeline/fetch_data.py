#!/usr/bin/env python3
"""Fetch course and exam data from xnykcxt system."""

import json
import requests
from pathlib import Path

BASE_URL = "https://bdfz.xnykcxt.com:5002"
DATA_DIR = Path(__file__).parent.parent / "data"

class XnykcxtClient:
    def __init__(self, token: str):
        self.session = requests.Session()
        self.session.cookies.set("token", token)
        self.session.verify = False  # Skip SSL verification for internal system

    def get_teachers(self) -> list:
        """Get list of teachers."""
        r = self.session.get(f"{BASE_URL}/exam/api/student/teacher/entity")
        return r.json().get("extra", [])

    def get_course_catalog(self, teacher_id: int) -> list:
        """Get course catalog for a teacher."""
        r = self.session.get(f"{BASE_URL}/exam/api/student/catalog/entity/{teacher_id}")
        return r.json().get("extra", [])

    def get_paper_catalog(self, teacher_id: int) -> list:
        """Get exam/paper catalog for a teacher."""
        r = self.session.get(f"{BASE_URL}/exam/api/student/paper/catalog/entity/{teacher_id}")
        return r.json().get("extra", [])

    def get_course_reddot(self) -> dict:
        """Get new course markers."""
        r = self.session.get(f"{BASE_URL}/exam/api/catalog/reddot")
        return r.json().get("extra", {})

    def get_paper_reddot(self) -> dict:
        """Get new paper markers."""
        r = self.session.get(f"{BASE_URL}/exam/api/paper/catalog/reddot")
        return r.json().get("extra", {})

def flatten_catalog(items: list, result: list = None) -> list:
    """Flatten nested catalog structure."""
    if result is None:
        result = []
    for item in items:
        result.append({
            "id": item["id"],
            "paperId": item.get("paperId", item["id"]),  # 优先使用 paperId
            "name": item["catalogName"],
            "path": item["catalogNamePath"],
            "createTime": item["createTime"],
            "updateTime": item["updateTime"],
        })
        if item.get("childList"):
            flatten_catalog(item["childList"], result)
    return result

def main():
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    # Load token from environment variable
    import os
    token = os.environ.get("XNYKCXT_TOKEN")
    if not token:
        print("Error: XNYKCXT_TOKEN environment variable not set")
        return

    client = XnykcxtClient(token)
    DATA_DIR.mkdir(exist_ok=True)

    # Fetch teachers
    teachers = client.get_teachers()
    print(f"Found {len(teachers)} teachers")

    all_data = {
        "teachers": [],
        "courses": [],
        "papers": [],
        "reddot": {
            "courses": client.get_course_reddot(),
            "papers": client.get_paper_reddot()
        }
    }

    for t in teachers:
        teacher_info = {
            "id": t["teacherUserId"],
            "name": t["userName"],
            "subject": t["subjectName"],
            "school": t["schoolName"],
        }
        all_data["teachers"].append(teacher_info)

        # Get courses
        courses = client.get_course_catalog(t["teacherUserId"])
        for c in flatten_catalog(courses):
            c["teacherId"] = t["teacherUserId"]
            c["teacherName"] = t["userName"]
            c["subject"] = t["subjectName"]
            all_data["courses"].append(c)

        # Get papers/exams
        papers = client.get_paper_catalog(t["teacherUserId"])
        for p in flatten_catalog(papers):
            p["teacherId"] = t["teacherUserId"]
            p["teacherName"] = t["userName"]
            p["subject"] = t["subjectName"]
            all_data["papers"].append(p)

    # Save data
    output_file = DATA_DIR / "xnykcxt_data.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(all_data['courses'])} courses, {len(all_data['papers'])} papers to {output_file}")

if __name__ == "__main__":
    main()
