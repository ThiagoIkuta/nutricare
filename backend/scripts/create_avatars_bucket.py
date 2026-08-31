"""One-off setup script: creates the public Storage bucket used for user
profile photos. Run once per Supabase project (safe to re-run; skips if the
bucket already exists).

Usage:
    cd backend
    python scripts/create_avatars_bucket.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from app.core.supabase import supabase_admin  # noqa: E402
from app.services.image_utils import ALLOWED_IMAGE_TYPES  # noqa: E402
from app.services.profile_service import AVATAR_BUCKET, MAX_AVATAR_SIZE  # noqa: E402


def main() -> None:
    existing = {b.name for b in supabase_admin.storage.list_buckets()}
    if AVATAR_BUCKET in existing:
        print(f"Bucket '{AVATAR_BUCKET}' já existe, nada a fazer.")
        return

    supabase_admin.storage.create_bucket(
        AVATAR_BUCKET,
        options={
            # Public: profile photos are displayed all over the app (dashboard,
            # chat header, etc.) and avatar_url is stored as a plain URL, so a
            # signed-URL/private-bucket setup like chat attachments would need
            # every reader to refresh it. Not sensitive enough to warrant that.
            "public": True,
            "allowed_mime_types": sorted(ALLOWED_IMAGE_TYPES),
            "file_size_limit": f"{MAX_AVATAR_SIZE // (1024 * 1024)}MB",
        },
    )
    print(f"Bucket '{AVATAR_BUCKET}' criado.")


if __name__ == "__main__":
    main()
