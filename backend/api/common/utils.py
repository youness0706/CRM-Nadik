"""
Nadik Shared Utilities
"""
from django.utils import timezone
from datetime import date
from typing import Optional


def get_today() -> date:
    """Return today's date (UTC)."""
    return timezone.now().date()


def parse_date_param(date_str: Optional[str], fallback: Optional[date] = None) -> Optional[date]:
    """Safely parse a YYYY-MM-DD query parameter."""
    if not date_str:
        return fallback
    try:
        from datetime import datetime
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return fallback


def format_currency(amount) -> str:
    """Format amount as Moroccan Dirham string."""
    try:
        return f"{float(amount):.2f} MAD"
    except (TypeError, ValueError):
        return "0.00 MAD"
