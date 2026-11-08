import os
import uuid

from fastapi import HTTPException, UploadFile

from .config import UPLOAD_DIR, settings

CHUNK_SIZE = 1024 * 1024

IMAGE_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
VIDEO_TYPES = {".mp4": "video/mp4", ".webm": "video/webm"}

for folder in ("photos", "videos", "proofs"):
    (UPLOAD_DIR / folder).mkdir(parents=True, exist_ok=True)


def extension_of(file: UploadFile) -> str:
    return os.path.splitext(file.filename or "")[1].lower()


def save_upload(file: UploadFile, subfolder: str, allowed: dict[str, str], max_mb: int) -> str:
    """Validasi lalu tulis file per chunk. Mengembalikan path relatif terhadap uploads/."""
    ext = extension_of(file)
    if allowed.get(ext) != file.content_type:
        raise HTTPException(
            status_code=400,
            detail=f"Format file {file.filename} tidak didukung. Gunakan: {', '.join(allowed)}",
        )

    relative_path = f"{subfolder}/{uuid.uuid4()}{ext}"
    target = UPLOAD_DIR / relative_path
    max_bytes = max_mb * 1024 * 1024
    written = 0
    try:
        with open(target, "wb") as buffer:
            while chunk := file.file.read(CHUNK_SIZE):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=400, detail=f"Ukuran file {file.filename} melebihi batas {max_mb} MB"
                    )
                buffer.write(chunk)
    except BaseException:
        target.unlink(missing_ok=True)
        raise
    return relative_path


def save_photo(file: UploadFile) -> str:
    return save_upload(file, "photos", IMAGE_TYPES, settings.MAX_PHOTO_MB)


def save_video(file: UploadFile) -> str:
    return save_upload(file, "videos", VIDEO_TYPES, settings.MAX_VIDEO_MB)


def save_proof(file: UploadFile) -> str:
    return save_upload(file, "proofs", IMAGE_TYPES, settings.MAX_PROOF_MB)


def delete_file(relative_path: str) -> None:
    (UPLOAD_DIR / relative_path).unlink(missing_ok=True)
