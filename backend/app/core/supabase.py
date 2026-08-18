from typing import Protocol, TypedDict, cast

from app.core.config import settings
from supabase import create_client


class SupabaseUser(TypedDict, total=False):
    id: str
    email: str | None
    phone: str | None
    app_metadata: dict[str, object]
    user_metadata: dict[str, object]


class SupabaseSession(TypedDict, total=False):
    access_token: str
    refresh_token: str
    user: SupabaseUser


class AuthResponse(TypedDict, total=False):
    user: SupabaseUser
    session: SupabaseSession
    error: dict[str, object]


class SupabaseAuthProtocol(Protocol):
    def sign_up(self, payload: dict[str, object]) -> object: ...

    def sign_in_with_password(self, payload: dict[str, object]) -> object: ...

    def refresh_session(self, refresh_token: str) -> object: ...

    def get_user(self, token: str) -> object: ...


class SupabaseClientProtocol(Protocol):
    auth: SupabaseAuthProtocol


def _require_env(value: str, name: str) -> str:
    if not value:
        raise RuntimeError(f"{name} não foi configurada no .env")
    return value


def get_public_supabase_client() -> SupabaseClientProtocol:
    url = _require_env(settings.SUPABASE_URL, "SUPABASE_URL")
    key = _require_env(settings.SUPABASE_KEY, "SUPABASE_KEY")
    client = create_client(url, key)
    # create_client returns a concrete Client implementation; cast via object
    # first to satisfy strict static checks that the concrete type may not
    # structurally overlap the Protocol.
    return cast(SupabaseClientProtocol, cast(object, client))


def get_admin_supabase_client() -> SupabaseClientProtocol:
    url = _require_env(settings.SUPABASE_URL, "SUPABASE_URL")
    admin_key = settings.SUPABASE_SECRET_KEY or settings.SUPABASE_SERVICE_ROLE_KEY

    if not admin_key:
        raise RuntimeError(
            "Configure SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY no .env"
        )

    client = create_client(url, admin_key)
    return cast(SupabaseClientProtocol, cast(object, client))


# Exported client instances with precise Protocol typing so static checkers
# can reason about the `auth` attribute and its methods without falling back
# to `Any`.
supabase_public = get_public_supabase_client()
supabase_admin = get_admin_supabase_client()


# Small helpers to normalize Supabase auth responses across the codebase.
# The client may return either mapping-like objects (TypedDicts) or objects
# with attributes depending on version; these helpers centralize the shape
# handling and the necessary casts for static typing.


def _get_attr(obj: object, name: str):
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)


def extract_user_from_response(resp: object) -> SupabaseUser | None:
    """Return a SupabaseUser if present in the response, otherwise None.

    The supabase-py client returns pydantic models (User, AuthResponse),
    not plain dicts, so this accepts either shape rather than requiring dict.
    """
    user = _get_attr(resp, "user")
    if not user:
        data = _get_attr(resp, "data")
        if isinstance(data, dict):
            user = data.get("user")

    if user is None:
        return None
    return cast(SupabaseUser, user)


def extract_session_from_response(resp: object) -> SupabaseSession | None:
    """Return a SupabaseSession if present in the response, otherwise None.

    The supabase-py client returns pydantic models (Session, AuthResponse),
    not plain dicts, so this accepts either shape rather than requiring dict.
    """
    session = _get_attr(resp, "session")
    if not session:
        data = _get_attr(resp, "data")
        if isinstance(data, dict):
            session = data.get("session")

    if session is None:
        return None
    return cast(SupabaseSession, session)
