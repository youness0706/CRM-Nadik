"""
Nadik Authentication Serializers
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify
import re

from trainers.models import OrganizationInfo, Staff


class NadikTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that adds user and organization info
    to the token response.
    """
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False, write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].required = False

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add user info to token payload
        token['username'] = user.username
        token['email'] = user.email
        return token

    def validate(self, attrs):
        email = attrs.pop('email', None)
        if email:
            matching_usernames = User.objects.filter(
                email__iexact=email
            ).values_list('username', flat=True)
            attrs['username'] = matching_usernames.get() if matching_usernames.count() == 1 else email
        elif not attrs.get('username'):
            raise serializers.ValidationError({'username': 'Provide an email address or username.'})

        data = super().validate(attrs)

        # Add extra response fields
        user = self.user
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        }

        # Add organization info if available
        try:
            staff = Staff.objects.select_related('organization').get(user=user)
            data['organization'] = {
                'id': staff.organization.id,
                'name': staff.organization.name,
                'slug': staff.organization.slug,
                'subscription_status': staff.organization.subscription_status,
                'is_admin': staff.is_admin,
            }
        except Staff.DoesNotExist:
            data['organization'] = None

        return data


class RegisterSerializer(serializers.Serializer):
    """
    One-step registration: creates User + OrganizationInfo + Staff.
    """
    # User fields
    username = serializers.CharField(min_length=3, max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, default='')
    last_name = serializers.CharField(max_length=150, required=False, default='')

    # Organization fields
    org_name = serializers.CharField(min_length=3, max_length=255)
    org_slug = serializers.CharField(min_length=3, max_length=100, required=False, allow_blank=True)
    org_email = serializers.EmailField(required=False, allow_blank=True)
    org_phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    org_description = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('This email is already registered.')
        return value

    def validate_org_slug(self, value):
        if not value:
            return value
        slug = slugify(value)
        if not re.match(r'^[a-z0-9-]+$', slug):
            raise serializers.ValidationError(
                'Slug must contain only lowercase letters, digits, and hyphens.'
            )
        if OrganizationInfo.objects.filter(slug=slug).exists():
            raise serializers.ValidationError('This organization slug is already taken.')
        return slug

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})

        # Auto-generate slug if not provided
        if not attrs.get('org_slug'):
            base_slug = slugify(attrs['org_name'])
            slug = base_slug
            counter = 1
            while OrganizationInfo.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            attrs['org_slug'] = slug
        elif OrganizationInfo.objects.filter(slug=attrs['org_slug']).exists():
            raise serializers.ValidationError({'org_slug': 'This slug is already taken.'})

        return attrs

    def create(self, validated_data):
        from django.db import transaction

        with transaction.atomic():
            # Create user
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
            )

            # Create organization (trial starts automatically via model.save())
            org = OrganizationInfo.objects.create(
                name=validated_data['org_name'],
                slug=validated_data['org_slug'],
                email=validated_data.get('org_email') or validated_data['email'],
                phone_number=validated_data.get('org_phone', ''),
                description=validated_data.get('org_description', ''),
                is_active=True,
                subscription_tier='free',
                max_trainers=50,
            )

            # Create staff (link user to org as admin/owner)
            Staff.objects.create(
                organization=org,
                user=user,
                role='مالك',
                is_admin=True,
                salary=0,
                email=validated_data['email'],
            )

        return user, org


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for the current user's profile."""
    organization = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'date_joined', 'organization', 'is_admin', 'role']
        read_only_fields = ['id', 'date_joined']

    def get_organization(self, obj):
        try:
            staff = Staff.objects.select_related('organization').get(user=obj)
            org = staff.organization
            return {
                'id': org.id,
                'name': org.name,
                'slug': org.slug,
                'subscription_tier': org.subscription_tier,
                'subscription_status': org.subscription_status,
                'days_remaining': org.days_remaining,
                'is_active': org.is_active,
            }
        except Staff.DoesNotExist:
            return None

    def get_is_admin(self, obj):
        try:
            return Staff.objects.get(user=obj).is_admin
        except Staff.DoesNotExist:
            return False

    def get_role(self, obj):
        try:
            return Staff.objects.get(user=obj).role
        except Staff.DoesNotExist:
            return None


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError(
                {'new_password_confirm': 'New passwords do not match.'}
            )
        validate_password(attrs['new_password'])
        return attrs
