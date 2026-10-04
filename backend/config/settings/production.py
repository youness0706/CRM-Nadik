"""
Nadik Production Settings
"""
from .base import *  # noqa: F401, F403
import dj_database_url
import sys

DEBUG = False

# Database — required in production
if len(sys.argv) > 1 and sys.argv[1] != 'collectstatic':
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        raise Exception("DATABASE_URL environment variable is required in production")
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL)
    }

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Caching — use Redis in production if available
REDIS_URL = os.getenv('REDIS_URL')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
            'TIMEOUT': 300,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'nadik-prod',
        }
    }

# CORS — restrict to allowed frontend origins in production
CORS_ALLOW_ALL_ORIGINS = False
