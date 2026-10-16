from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Prefetch, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.auth.serializers import RegisterSerializer
from trainers.models import OrganizationInfo, OrganizationPayment, PlatformExpense, Staff


class IsPlatformAdmin(BasePermission):
    message = 'Platform administrator access is required.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class RenewalSerializer(serializers.Serializer):
    duration_months = serializers.ChoiceField(choices=(1, 3, 6, 12))
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    payment_method = serializers.ChoiceField(
        choices=('cash', 'bank_transfer', 'card', 'check', 'other'),
        default='cash',
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class PlatformOrganizationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationInfo
        fields = [
            'name', 'slug', 'description', 'email', 'phone_number', 'location',
            'subscription_tier', 'max_trainers', 'is_active',
        ]

    def validate_slug(self, value):
        queryset = OrganizationInfo.objects.filter(slug=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('This organization slug is already taken.')
        return value


class PlatformExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformExpense
        fields = ['id', 'title', 'description', 'amount', 'date', 'created_at']
        read_only_fields = ['id', 'created_at']


def _organization_queryset():
    return OrganizationInfo.objects.annotate(
        total_trainees=Count('trainers', distinct=True),
        active_trainees=Count('trainers', filter=Q(trainers__is_active=True), distinct=True),
        staff_count=Count('staff_members', distinct=True),
    ).prefetch_related(
        Prefetch(
            'staff_members',
            queryset=Staff.objects.filter(is_admin=True).select_related('user'),
            to_attr='platform_admin_staff',
        )
    ).order_by('-created_at', 'name')


def _staff_payload(staff):
    return {
        'id': staff.id,
        'username': staff.user.username,
        'email': staff.user.email,
        'first_name': staff.user.first_name,
        'last_name': staff.user.last_name,
        'role': staff.role,
        'is_admin': staff.is_admin,
        'phone_number': staff.phone_number,
        'started': staff.started,
    }


def _organization_payload(organization, include_details=False):
    admins = getattr(organization, 'platform_admin_staff', None)
    if admins is None:
        admins = organization.staff_members.filter(is_admin=True).select_related('user')

    payload = {
        'id': organization.id,
        'name': organization.name,
        'slug': organization.slug,
        'description': organization.description,
        'email': organization.email,
        'phone_number': organization.phone_number,
        'location': organization.location,
        'is_active': organization.is_active,
        'subscription_tier': organization.subscription_tier,
        'max_trainers': organization.max_trainers,
        'subscription_status': organization.subscription_status,
        'subscription_start': organization.subscription_start_date,
        'subscription_end': organization.subscription_end_date,
        'days_remaining': organization.days_until_expiration,
        'created_at': organization.created_at,
        'total_trainees': organization.total_trainees,
        'active_trainees': organization.active_trainees,
        'staff_count': organization.staff_count,
        'admins': [_staff_payload(staff) for staff in admins],
    }

    if include_details:
        staff = organization.staff_members.select_related('user').order_by('user__username')
        payments = organization.subscription_payments.select_related('processed_by')[:50]
        payload['staff'] = [_staff_payload(member) for member in staff]
        payload['subscription_payments'] = [
            {
                'id': payment.id,
                'payment_date': payment.payment_date,
                'amount': payment.amount,
                'duration_months': payment.duration_months,
                'payment_method': payment.payment_method,
                'subscription_start': payment.subscription_start,
                'subscription_end': payment.subscription_end,
                'processed_by': payment.processed_by.username if payment.processed_by else None,
                'notes': payment.notes,
            }
            for payment in payments
        ]
    return payload


class PlatformAdminAPIView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]


class OrganizationListCreateView(PlatformAdminAPIView):
    def get(self, request):
        organizations = _organization_queryset()
        return Response({
            'count': organizations.count(),
            'results': [_organization_payload(organization) for organization in organizations],
        })

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            _, organization = serializer.save()
        return Response(
            _organization_payload(_organization_queryset().get(pk=organization.pk), include_details=True),
            status=status.HTTP_201_CREATED,
        )


class OrganizationDetailView(PlatformAdminAPIView):
    def get(self, request, pk):
        organization = get_object_or_404(_organization_queryset(), pk=pk)
        return Response(_organization_payload(organization, include_details=True))

    def patch(self, request, pk):
        organization = get_object_or_404(OrganizationInfo, pk=pk)
        serializer = PlatformOrganizationUpdateSerializer(
            organization,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        organization = _organization_queryset().get(pk=organization.pk)
        return Response(_organization_payload(organization, include_details=True))


class OrganizationRenewalView(PlatformAdminAPIView):
    def post(self, request, pk):
        organization = get_object_or_404(OrganizationInfo, pk=pk)
        serializer = RenewalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        period_names = {1: 'monthly', 3: 'quarterly', 6: 'semi_annual', 12: 'annual'}

        with transaction.atomic():
            payment = OrganizationPayment.objects.create(
                organization=organization,
                amount=values['amount'],
                duration_months=values['duration_months'],
                payment_method=values['payment_method'],
                period=period_names[values['duration_months']],
                notes=values.get('notes', ''),
                processed_by=request.user,
            )

        organization.refresh_from_db()
        organization = _organization_queryset().get(pk=organization.pk)
        return Response({
            'organization': _organization_payload(organization),
            'payment': {
                'id': payment.id,
                'amount': payment.amount,
                'duration_months': payment.duration_months,
                'payment_method': payment.payment_method,
                'subscription_start': payment.subscription_start,
                'subscription_end': payment.subscription_end,
            },
        }, status=status.HTTP_201_CREATED)


class PlatformDashboardView(PlatformAdminAPIView):
    def get(self, request):
        try:
            year = int(request.query_params.get('year', timezone.now().year))
        except (TypeError, ValueError):
            return Response({'detail': 'Year must be a valid number.'}, status=status.HTTP_400_BAD_REQUEST)

        organizations = list(_organization_queryset())
        subscription_payments = OrganizationPayment.objects.filter(payment_date__year=year)
        expenses = PlatformExpense.objects.filter(date__year=year)
        monthly = []
        for month in range(1, 13):
            income = subscription_payments.filter(payment_date__month=month).aggregate(total=Sum('amount'))['total'] or 0
            cost = expenses.filter(date__month=month).aggregate(total=Sum('amount'))['total'] or 0
            monthly.append({
                'month': month,
                'income': float(income),
                'expenses': float(cost),
                'net': float(income - cost),
            })

        organization_income = {
            row['organization_id']: row['total']
            for row in subscription_payments.values('organization_id').annotate(total=Sum('amount'))
        }
        organization_rows = []
        for organization in organizations:
            row = _organization_payload(organization)
            row['subscription_income'] = float(organization_income.get(organization.id, 0))
            organization_rows.append(row)

        total_income = subscription_payments.aggregate(total=Sum('amount'))['total'] or 0
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
        recent_expenses = PlatformExpenseSerializer(expenses.order_by('-date', '-created_at')[:100], many=True).data
        return Response({
            'year': year,
            'metrics': {
                'organization_count': len(organizations),
                'active_organizations': sum(organization.is_active for organization in organizations),
                'trainee_count': sum(organization.total_trainees for organization in organizations),
                'staff_count': sum(organization.staff_count for organization in organizations),
                'subscription_income': float(total_income),
                'platform_expenses': float(total_expenses),
                'net_income': float(total_income - total_expenses),
            },
            'monthly': monthly,
            'organizations': organization_rows,
            'expenses': recent_expenses,
        })

    def post(self, request):
        serializer = PlatformExpenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = serializer.save(created_by=request.user)
        return Response(PlatformExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)