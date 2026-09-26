from fastapi import APIRouter

from app.api.v1 import admin, papers, taxonomy

api_router = APIRouter()
api_router.include_router(papers.router)
api_router.include_router(taxonomy.router)
api_router.include_router(admin.router)
