from django.urls import path
from .views import (
    NadikLoginView,
    NadikTokenRefreshView,
    LogoutView,
    RegisterView,
    MeView,
    ChangePasswordView,
    check_username_view,
    check_slug_view,
)

urlpatterns = [
    path('login/', NadikLoginView.as_view(), name='api-login'),
    path('refresh/', NadikTokenRefreshView.as_view(), name='api-token-refresh'),
    path('logout/', LogoutView.as_view(), name='api-logout'),
    path('register/', RegisterView.as_view(), name='api-register'),
    path('me/', MeView.as_view(), name='api-me'),
    path('password/change/', ChangePasswordView.as_view(), name='api-password-change'),
    path('check-username/', check_username_view, name='api-check-username'),
    path('check-slug/', check_slug_view, name='api-check-slug'),
]
