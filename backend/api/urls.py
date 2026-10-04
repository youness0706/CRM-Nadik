"""
Nadik API v1 — Root URL Configuration
"""
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # API Schema (OpenAPI)
    path('schema/', SpectacularAPIView.as_view(), name='api-schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='api-schema'), name='api-docs'),
    path('redoc/', SpectacularRedocView.as_view(url_name='api-schema'), name='api-redoc'),

    # Auth
    path('auth/', include('api.auth.urls')),

    # CRM functionality
    path('crm/', include('api.crm.urls')),
]
