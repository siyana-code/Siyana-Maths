from fastapi import APIRouter

from app.api.v1 import admin, papers

api_router = APIRouter()
api_router.include_router(papers.router)
api_router.include_router(admin.router)
