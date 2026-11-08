import os
import shutil
import uuid
from typing import List
from fastapi import UploadFile, HTTPException
from .config import settings

UPLOAD_DIR = "backend/uploads"
for folder in ["photos", "videos", "proofs"]:
    os.makedirs(os.path.join(UPLOAD_DIR, folder), exist_ok=True)

def validate_file(file: UploadFile, max_mb: int, allowed_types: List[str]):
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > max_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large (max {max_mb}MB)")

async def save_file(file: UploadFile, subfolder: str) -> str:
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(UPLOAD_DIR, subfolder, filename)
    
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return f"{subfolder}/{filename}"

def delete_file(file_path: str):
    full_path = os.path.join(UPLOAD_DIR, file_path)
    if os.path.exists(full_path):
        os.remove(full_path)
