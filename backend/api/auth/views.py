"""
Nadik Authentication Views
JWT-based: login, logout, refresh, register, profile
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.contrib.auth import authenticate
from trainers.models import OrganizationInfo

from .serializers import (
    NadikTokenObtainPairSerializer,
    RegisterSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
)


class NadikLoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    
    Authenticate and receive JWT access + refresh tokens.
    Response includes user info and organization details.
    """
    serializer_class = NadikTokenObtainPairSerializer
    permission_classes = [AllowAny]

    @extend_schema(
        tags=['auth'],
        summary='Login',
        description='Authenticate with username/password and receive JWT tokens.',
        responses={
            200: OpenApiResponse(description='Login successful — returns access and refresh tokens'),
            401: OpenApiResponse(description='Invalid credentials'),
        }
    )
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            response.data['success'] = True
        return response


class NadikTokenRefreshView(TokenRefreshView):
    """
    POST /api/v1/auth/refresh/
    Exchange a refresh token for a new access token.
    """
    @extend_schema(tags=['auth'], summary='Refresh token')
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklist the refresh token to invalidate the session.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['auth'],
        summary='Logout',
        description='Blacklist the refresh token to invalidate the session.',
        responses={200: OpenApiResponse(description='Logged out successfully')},
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'success': False, 'error': 'Refresh token is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'success': True, 'message': 'Logged out successfully.'})
        except TokenError as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/
    One-step registration: create user account + organization.
    Returns JWT tokens immediately.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        tags=['auth'],
        summary='Register',
        description=(
            'Create a new user account and organization in one step. '
            'A 7-day free trial starts automatically. '
            'Returns JWT tokens on success.'
        ),
        responses={
            201: OpenApiResponse(description='Registration successful'),
            400: OpenApiResponse(description='Validation error'),
        }
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'error': 'Validation failed', 'detail': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        user, org = serializer.save()

        # Issue JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'success': True,
                'message': f'Account created successfully. Welcome to Nadik!',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                },
                'organization': {
                    'id': org.id,
                    'name': org.name,
                    'slug': org.slug,
                    'subscription_status': org.subscription_status,
                    'trial_end': str(org.trial_end) if org.trial_end else None,
                },
            },
            status=status.HTTP_201_CREATED
        )


class MeView(APIView):
    """
    GET  /api/v1/auth/me/  — Get current user profile
    PATCH /api/v1/auth/me/ — Update profile (first_name, last_name, email)
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['auth'], summary='Get current user profile')
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response({'success': True, 'data': serializer.data})

    @extend_schema(tags=['auth'], summary='Update current user profile')
    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'success': True, 'data': serializer.data})
        return Response(
            {'success': False, 'error': 'Validation failed', 'detail': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/password/change/
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['auth'], summary='Change password')
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'error': 'Validation failed', 'detail': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'success': False, 'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'success': True, 'message': 'Password changed successfully.'})


@extend_schema(tags=['auth'], summary='Check username availability')
@api_view(['GET'])
@permission_classes([AllowAny])
def check_username_view(request):
    """GET /api/v1/auth/check-username/?username=xxx"""
    from django.contrib.auth.models import User
    username = request.GET.get('username', '').strip()
    if len(username) < 3:
        return Response({'available': False, 'message': 'Username must be at least 3 characters.'})
    available = not User.objects.filter(username=username).exists()
    return Response({
        'available': available,
        'message': 'Username is available.' if available else 'Username is already taken.',
    })


@extend_schema(tags=['auth'], summary='Check organization slug availability')
@api_view(['GET'])
@permission_classes([AllowAny])
def check_slug_view(request):
    """GET /api/v1/auth/check-slug/?slug=xxx"""
    from django.utils.text import slugify
    slug = slugify(request.GET.get('slug', '').strip())
    if len(slug) < 3:
        return Response({'available': False, 'message': 'Slug must be at least 3 characters.'})
    available = not OrganizationInfo.objects.filter(slug=slug).exists()
    return Response({
        'available': available,
        'slug': slug,
        'message': 'Slug is available.' if available else 'Slug is already taken.',
    })
