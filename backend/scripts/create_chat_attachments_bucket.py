"""One-off setup script: creates the private Storage bucket used for chat
image attachments. Run once per Supabase project (safe to re-run; skips if
the bucket already exists).

Usage:
    cd backend
    python scripts/create_chat_attachments_bucket.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from app.core.supabase import supabase_admin  # noqa: E402
from app.services.message_service import (  # noqa: E402
    ALLOWED_IMAGE_TYPES,
    ATTACHMENTS_BUCKET,
    MAX_ATTACHMENT_SIZE,
)


def main() -> None:
    existing = {b.name for b in supabase_admin.storage.list_buckets()}
    if ATTACHMENTS_BUCKET in existing:
        print(f"Bucket '{ATTACHMENTS_BUCKET}' já existe, nada a fazer.")
        return

    supabase_admin.storage.create_bucket(
        ATTACHMENTS_BUCKET,
        options={
            "public": False,  # served via signed URLs, see message_service.py
            "allowed_mime_types": sorted(ALLOWED_IMAGE_TYPES),
            "file_size_limit": f"{MAX_ATTACHMENT_SIZE // (1024 * 1024)}MB",
        },
    )
    print(f"Bucket '{ATTACHMENTS_BUCKET}' criado.")


if __name__ == "__main__":
    main()
