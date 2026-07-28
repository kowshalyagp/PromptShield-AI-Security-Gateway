import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api import auth, gateway, dashboard, policies, redteam, logs, settings as settings_api

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware config to allow React dev server to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev simplicity, specify http://localhost:5173 in production
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(gateway.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(policies.router, prefix=settings.API_V1_STR)
app.include_router(redteam.router, prefix=settings.API_V1_STR)
app.include_router(logs.router, prefix=settings.API_V1_STR)
app.include_router(settings_api.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    # Automatically bootstrap SQLite tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default Admin account if no users exist
    from app.database import SessionLocal
    from app.models.user import User
    from app.models.policy import SecurityPolicy
    from app.models.settings import SystemSetting
    from app.services.auth_service import AuthService
    from sqlalchemy import select
    import logging

    async with SessionLocal() as session:
        # Seed Admin User
        result = await session.execute(select(User))
        user_exists = result.scalars().first()
        if not user_exists:
            hashed_pwd = AuthService.hash_password("adminpassword123")
            admin_user = User(
                username="admin",
                email="admin@promptshield.local",
                hashed_password=hashed_pwd,
                role="Admin",
                is_active=True
            )
            session.add(admin_user)
            await session.commit()
            print("INFO: Default admin user seeded (username: admin, password: adminpassword123)")

        # Seed default policies
        policy_result = await session.execute(select(SecurityPolicy))
        policy_exists = policy_result.scalars().first()
        if not policy_exists:
            default_policies = [
                SecurityPolicy(id="injection", title="Prompt Injection Defense", description="Detects attempts to hijack model context.", enabled=True, threshold=75),
                SecurityPolicy(id="jailbreak", title="Jailbreak Signatures", description="Compares semantic profiles to known jailbreaks.", enabled=True, threshold=80),
                SecurityPolicy(id="leakage", title="System Prompt Leakage", description="Prevents model output revealing developer guidelines.", enabled=True, threshold=85),
                SecurityPolicy(id="manipulation", title="Role Manipulation", description="Identifies dialogue simulation inside prompts.", enabled=False, threshold=60),
                SecurityPolicy(id="harmful", title="Harmful Content Classifier", description="Filters illegal instructions, hate speech, or malware writing.", enabled=True, threshold=70),
            ]
            session.add_all(default_policies)
            await session.commit()
            print("INFO: Default security policies seeded successfully.")

        # Sync settings from SQLite DB
        settings_result = await session.execute(select(SystemSetting))
        db_settings = settings_result.scalars().all()
        for s in db_settings:
            if s.key == "rate_limit_window":
                settings.RATE_LIMIT_WINDOW_SECONDS = int(s.value)
            elif s.key == "rate_limit_max_requests":
                settings.RATE_LIMIT_MAX_REQUESTS = int(s.value)
            elif s.key == "risk_threshold_malicious":
                settings.RISK_THRESHOLD_MALICIOUS = int(s.value)
            elif s.key == "risk_threshold_suspicious":
                settings.RISK_THRESHOLD_SUSPICIOUS = int(s.value)
            elif s.key == "logging_level":
                settings.LOGGING_LEVEL = s.value
                logging.getLogger("promptshield").setLevel(s.value)
        if db_settings:
            print("INFO: Dynamic settings loaded from SQLite database.")

@app.get("/")
def read_root():
    return {"message": "Welcome to PromptShield AI Security Gateway API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
