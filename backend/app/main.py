from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.care_link import router as care_link_router
from app.api.routes.diet import router as diet_router
from app.api.routes.health import router as health_router
from app.api.routes.message import router as message_router
from app.api.routes.profile import router as profile_router
from app.api.routes.reminder import router as reminder_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Backend do MVP da plataforma de acompanhamento nutricional",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(profile_router, prefix=settings.API_V1_PREFIX)
app.include_router(care_link_router, prefix=settings.API_V1_PREFIX)
app.include_router(diet_router, prefix=settings.API_V1_PREFIX)
app.include_router(message_router, prefix=settings.API_V1_PREFIX)
app.include_router(reminder_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {"message": "Nutri Backend online"}