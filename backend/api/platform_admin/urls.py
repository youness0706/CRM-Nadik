from django.urls import path

from .views import (
    OrganizationDetailView, OrganizationListCreateView, OrganizationRenewalView,
    PlatformDashboardView,
)

urlpatterns = [
    path('dashboard/', PlatformDashboardView.as_view(), name='platform-dashboard'),
    path('organizations/', OrganizationListCreateView.as_view(), name='platform-organizations'),
    path('organizations/<int:pk>/', OrganizationDetailView.as_view(), name='platform-organization-detail'),
    path('organizations/<int:pk>/renew/', OrganizationRenewalView.as_view(), name='platform-organization-renew'),
]