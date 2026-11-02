"""
ASGI config for crm_back project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

try:
    import MySQLdb  # noqa: F401
except ImportError:
    import pymysql

    # Vercel does not provide native MySQLdb, so use the pure-Python driver.
    pymysql.install_as_MySQLdb()

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

application = get_asgi_application()
