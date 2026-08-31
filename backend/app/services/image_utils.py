from fastapi import HTTPException, UploadFile, status

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

EXT_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

# Magic-byte signatures used to verify the upload actually is the image type it
# claims to be in its Content-Type header, instead of trusting the client.
MAGIC_BYTES_BY_CONTENT_TYPE: dict[str, tuple[bytes, ...]] = {
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/gif": (b"GIF87a", b"GIF89a"),
    # WEBP = "RIFF" + 4-byte size + "WEBP"; the size bytes vary per file.
    "image/webp": (b"RIFF",),
}


def _matches_declared_type(content_type: str, data: bytes) -> bool:
    signatures = MAGIC_BYTES_BY_CONTENT_TYPE.get(content_type, ())
    if not any(data.startswith(sig) for sig in signatures):
        return False
    if content_type == "image/webp":
        return data[8:12] == b"WEBP"
    return True


def read_and_validate_image(file: UploadFile, max_size: int) -> tuple[str, bytes, str]:
    """Validate an uploaded image against type/size/magic-bytes and return
    (content_type, file_bytes, extension). Raises HTTPException on failure."""
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Apenas imagens (JPEG, PNG, WEBP ou GIF) são permitidas.",
        )

    # Read at most max_size + 1 bytes so an oversized upload can never be
    # fully buffered into memory before we reject it.
    file_bytes = file.file.read(max_size + 1)
    if len(file_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"A imagem excede o limite de {max_size // (1024 * 1024)}MB.",
        )

    if not _matches_declared_type(content_type, file_bytes):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O arquivo enviado não é uma imagem válida do tipo declarado.",
        )

    return content_type, file_bytes, EXT_BY_CONTENT_TYPE[content_type]
