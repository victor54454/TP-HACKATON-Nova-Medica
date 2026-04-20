import sys
from loguru import logger


def setup_logger():
    logger.remove()

    # Format horodaté pour la démo (Test D ✅)
    fmt = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{extra[event]}</cyan> | "
        "{message}"
    )

    logger.add(sys.stdout, format=fmt, level="DEBUG", colorize=True)

    # Fichier de logs persistant (bonus audit)
    logger.add(
        "/app/logs/hsecure.log",
        format=fmt,
        level="INFO",
        rotation="10 MB",
        retention="7 days",
        colorize=False,
    )

    return logger


def log_info(event: str, message: str):
    """[INFO] Accès accordé, opération réussie"""
    logger.bind(event=event).info(f"[INFO] {message}")


def log_warn(event: str, message: str):
    """[WARN] Tentative échouée, accès refusé"""
    logger.bind(event=event).warning(f"[WARN] {message}")


def log_error(event: str, message: str):
    """[ERROR] Erreur critique"""
    logger.bind(event=event).error(f"[ERROR] {message}")