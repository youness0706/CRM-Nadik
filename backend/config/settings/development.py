"""
Nadik Development Settings
"""
from .base import *  # noqa: F401, F403

DEBUG = True

# In development, allow all origins for ease of frontend dev
CORS_ALLOW_ALL_ORIGINS = True

# SQLite for local dev (set DEVELOPMENT_MODE=True in .env)
if os.getenv('DEVELOPMENT_MODE', 'False') == 'True':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    # Use DATABASE_URL from .env
    import dj_database_url
    DATABASE_URL = os.getenv('DATABASE_URL')
    if DATABASE_URL:
        DATABASES = {
            'default': dj_database_url.parse(DATABASE_URL)
        }
    else:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }

# Show emails in console during development
if not os.getenv('EMAIL_HOST_USER'):
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Caching — local memory cache in dev
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'nadik-dev',
    }
}

# Allow DRF Browsable API in development
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [  # type: ignore[name-defined]
    'rest_framework.renderers.JSONRenderer',
    'rest_framework.renderers.BrowsableAPIRenderer',
]
