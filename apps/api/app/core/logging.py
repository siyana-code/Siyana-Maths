import logging

from app.core.config import Settings


def configure_logging(settings: Settings) -> None:
    """Configure concise, non-secret application logging."""
    level_name = settings.log_level.upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        force=True,
    )
