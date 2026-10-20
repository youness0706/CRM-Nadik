from django.urls import path

from .views import (
    OrganizationDetailView, OrganizationListCreateView, OrganizationRenewalView,
    PlatformDashboardView, PlatformPaymentHistoryView,
)

urlpatterns = [
    path('dashboard/', PlatformDashboardView.as_view(), name='platform-dashboard'),
    path('payments/', PlatformPaymentHistoryView.as_view(), name='platform-payment-history'),
    path('organizations/', OrganizationListCreateView.as_view(), name='platform-organizations'),
    path('organizations/<int:pk>/', OrganizationDetailView.as_view(), name='platform-organization-detail'),
    path('organizations/<int:pk>/renew/', OrganizationRenewalView.as_view(), name='platform-organization-renew'),
]