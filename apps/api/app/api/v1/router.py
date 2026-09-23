from fastapi import APIRouter

from app.api.v1 import papers

api_router = APIRouter()
api_router.include_router(papers.router)
