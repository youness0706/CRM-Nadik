from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StaffViewSet, TrainerViewSet, PaymentViewSet,
    ArticleViewSet, CostsViewSet, AddedpayViewSet,
    TrainerDocumentsView, TrainerDocumentDetailView,
    dashboard_stats, unpaid_members, financial_summary,
)

router = DefaultRouter()
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'members', TrainerViewSet, basename='member')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'articles', ArticleViewSet, basename='article')
router.register(r'expenses', CostsViewSet, basename='expense')
router.register(r'added-payments', AddedpayViewSet, basename='added-payment')

urlpatterns = [
    path('members/<int:trainer_pk>/documents/', TrainerDocumentsView.as_view(), name='member-documents'),
    path('members/<int:trainer_pk>/documents/<int:pk>/', TrainerDocumentDetailView.as_view(), name='member-document-detail'),
    path('', include(router.urls)),
    path('dashboard/', dashboard_stats, name='dashboard-stats'),
    path('unpaid/', unpaid_members, name='unpaid-members'),
    path('financial/', financial_summary, name='financial-summary'),
]
