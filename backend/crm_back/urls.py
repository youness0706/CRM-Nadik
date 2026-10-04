"""
Nadik Root URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Admin (renamed for security)
    path('nojoum_admin/', admin.site.urls),

    # API v1
    path('api/v1/', include('api.urls')),

    # Legacy template-based app (kept during transition)
    path('', include('trainers.urls')),
    
]
