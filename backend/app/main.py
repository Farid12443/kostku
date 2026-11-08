from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from .database import Base, engine, get_db
from .config import settings
from .seed import seed_data
from .routers import auth, public, bookings, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    seed_data(db)
    db.close()
    yield

app = FastAPI(title="Kos API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(public.router)
app.include_router(bookings.router)
app.include_router(admin.router)

app.mount("/uploads", StaticFiles(directory="backend/uploads"), name="uploads")

@app.get("/api/health")
async def health():
    return {"status": "ok"}
