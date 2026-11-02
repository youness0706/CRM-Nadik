"""
WSGI config for crm_back project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os

try:
    import MySQLdb  # noqa: F401
except ImportError:
    import pymysql

    # Vercel does not provide native MySQLdb, so use the pure-Python driver.
    pymysql.install_as_MySQLdb()

from django.core.wsgi import get_wsgi_application

import pathlib, sys
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

application = get_wsgi_application()

