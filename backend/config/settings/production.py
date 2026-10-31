"""
Nadik Production Settings
"""
from .base import *  # noqa: F401, F403
import dj_database_url
import sys

DEBUG = False

# Database — required at runtime in production. Vercel imports the WSGI
# application without a management-command argument, so do not use argv to
# decide whether the application needs a database configuration.
if 'collectstatic' not in sys.argv:
    DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
    if not DATABASE_URL:
        raise Exception("DATABASE_URL or POSTGRES_URL is required in production")
    database_config = dj_database_url.parse(DATABASE_URL)
    # dj-database-url maps sslmode=require to MySQLdb's ``ssl_mode`` option.
    # PyMySQL uses the DB-API ``ssl`` option instead and rejects ``ssl_mode``.
    if database_config.get('ENGINE') == 'django.db.backends.mysql':
        options = database_config.setdefault('OPTIONS', {})
        if options.pop('ssl_mode', None):
            options['ssl'] = {}
    DATABASES = {'default': database_config}

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
