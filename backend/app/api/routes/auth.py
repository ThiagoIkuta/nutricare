from typing import Annotated, cast

from app.api.deps import get_current_user
from app.core.supabase import (
    SupabaseSession,
    SupabaseUser,
    supabase_public,
)
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RefreshResponse,
    SignupRequest,
    SignupResponse,
)
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


@router.post(
    "/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED
)
def signup(payload: SignupRequest):
    """
    Cria um usuário no Supabase Auth usando email e senha.
    Dependendo da configuração de confirmação de email do projeto,
    o signup pode ou não retornar sessão imediatamente.
    """
    try:
        response_raw: object = supabase_public.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
            }
        )
    except Exception as exc:
        detail = getattr(exc, "message", None) or str(exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha no signup: {detail}",
        ) from exc

    # Use helpers to extract typed user/session values
    from app.core.supabase import (
        extract_session_from_response,
        extract_user_from_response,
    )

    user = extract_user_from_response(response_raw)
    session = extract_session_from_response(response_raw)

    def _get_field(o, field, default=None):
        if isinstance(o, dict):
            return o.get(field, default)
        return getattr(o, field, default)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signup não retornou usuário válido.",
        )

    if session is None:
        return {
            "user_id": str(_get_field(user, "id", "")),
            "email": _get_field(user, "email", None),
            "session_created": False,
            "access_token": None,
            "refresh_token": None,
            "message": (
                "Usuário criado. Se a confirmação de email estiver habilitada no Supabase, "
                "o usuário precisará confirmar o email antes de fazer login."
            ),
        }

    return {
        "user_id": str(_get_field(user, "id", "")),
        "email": _get_field(user, "email", None),
        "session_created": True,
        "access_token": _get_field(session, "access_token"),
        "refresh_token": _get_field(session, "refresh_token"),
        "message": "Usuário criado com sessão ativa.",
    }


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    """
    Faz login com email e senha no Supabase Auth e retorna a sessão.
    """
    try:
        response_raw: object = supabase_public.auth.sign_in_with_password(
            {
                "email": payload.email,
                "password": payload.password,
            }
        )
    except Exception as exc:
        detail = getattr(exc, "message", None) or str(exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Falha no login: {detail}",
        ) from exc

    from app.core.supabase import (
        extract_session_from_response,
        extract_user_from_response,
    )

    user = extract_user_from_response(response_raw)
    session = extract_session_from_response(response_raw)

    def _get_field(o, field, default=None):
        if isinstance(o, dict):
            return o.get(field, default)
        return getattr(o, field, default)

    if session is None or user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login não retornou sessão válida.",
        )

    return {
        "access_token": _get_field(session, "access_token"),
        "refresh_token": _get_field(session, "refresh_token"),
        "token_type": "bearer",
        "user": {
            "id": str(_get_field(user, "id", "")),
            "email": _get_field(user, "email", None),
            "phone": _get_field(user, "phone", None),
            "app_metadata": _get_field(user, "app_metadata", {}) or {},
            "user_metadata": _get_field(user, "user_metadata", {}) or {},
        },
    }


@router.post("/refresh", response_model=RefreshResponse)
def refresh_token(payload: RefreshRequest):
    """
    Renova o access_token usando um refresh_token válido do Supabase.
    """
    try:
        response_raw: object = supabase_public.auth.refresh_session(
            payload.refresh_token
        )
    except Exception as exc:
        detail = getattr(exc, "message", None) or str(exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Falha ao renovar sessão: {detail}",
        ) from exc

    from app.core.supabase import extract_session_from_response

    session = extract_session_from_response(response_raw)

    def _get_field(o, field, default=None):
        if isinstance(o, dict):
            return o.get(field, default)
        return getattr(o, field, default)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não foi possível renovar a sessão. Faça login novamente.",
        )

    return {
        "access_token": _get_field(session, "access_token"),
        "refresh_token": _get_field(session, "refresh_token"),
        "token_type": "bearer",
    }


@router.get("/me", response_model=CurrentUserResponse)
def get_me(
    current_user: Annotated[SupabaseUser, Depends(get_current_user)],
):
    def _get_field(o, field, default=None):
        if isinstance(o, dict):
            return o.get(field, default)
        return getattr(o, field, default)

    return {
        "id": str(_get_field(current_user, "id", "")),
        "email": _get_field(current_user, "email", None),
        "phone": _get_field(current_user, "phone", None),
        "app_metadata": _get_field(current_user, "app_metadata", {}) or {},
        "user_metadata": _get_field(current_user, "user_metadata", {}) or {},
    }
