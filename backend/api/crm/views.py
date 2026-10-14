from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
import calendar

from trainers.models import (
    Staff, Trainer, Payments, Article, Costs, Addedpay, TrainerDocument, OrganizationInfo
)
from .serializers import (
    StaffSerializer, TrainerSerializer, TrainerCreateSerializer,
    PaymentSerializer, ArticleSerializer, CostsSerializer,
    AddedpaySerializer, TrainerDocumentSerializer,
)


class BaseOrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_organization(self):
        try:
            staff = Staff.objects.select_related('organization').get(user=self.request.user)
            return staff.organization
        except Staff.DoesNotExist:
            raise PermissionDenied("You do not belong to any organization.")

    def get_queryset(self):
        org = self.get_organization()
        return self.queryset.filter(organization=org)

    def perform_create(self, serializer):
        org = self.get_organization()
        serializer.save(organization=org)


class StaffViewSet(BaseOrganizationViewSet):
    queryset = Staff.objects.all().select_related('user')
    serializer_class = StaffSerializer

    def get_permissions(self):
        # We need a custom permission to restrict mutation to admins
        return super().get_permissions()
        
    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            try:
                staff = Staff.objects.select_related('organization').get(user=request.user)
                if not staff.is_admin:
                    self.permission_denied(request, message="Only admins can manage staff.")
            except Staff.DoesNotExist:
                self.permission_denied(request, message="No organization found.")


class TrainerViewSet(BaseOrganizationViewSet):
    queryset = Trainer.objects.all()
    serializer_class = TrainerSerializer

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TrainerCreateSerializer
        return TrainerSerializer

    def get_queryset(self):
        org = self.get_organization()
        qs = self.queryset.filter(organization=org)

        # Filter by active/inactive
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')

        # Filter by category
        category = self.request.query_params.get('category')
        if category and category != 'all':
            qs = qs.filter(category=category)

        return qs


class PaymentViewSet(BaseOrganizationViewSet):
    queryset = Payments.objects.all().select_related('trainer')
    serializer_class = PaymentSerializer

    def get_queryset(self):
        org = self.get_organization()
        qs = self.queryset.filter(organization=org)

        # Filter by category
        cat = self.request.query_params.get('paymentCategry')
        if cat:
            qs = qs.filter(paymentCategry=cat)

        # Filter by date range
        start = self.request.query_params.get('start_date')
        end = self.request.query_params.get('end_date')
        if start:
            qs = qs.filter(paymentdate__gte=start)
        if end:
            qs = qs.filter(paymentdate__lte=end)

        # Filter by trainer
        trainer_id = self.request.query_params.get('trainer')
        if trainer_id:
            qs = qs.filter(trainer_id=trainer_id)

        return qs


class ArticleViewSet(BaseOrganizationViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer

    def get_queryset(self):
        org = self.get_organization()
        qs = self.queryset.filter(organization=org)
        category = self.request.query_params.get('category')
        if category and category != 'all':
            qs = qs.filter(category=category)
        return qs


class CostsViewSet(BaseOrganizationViewSet):
    queryset = Costs.objects.all()
    serializer_class = CostsSerializer


class AddedpayViewSet(BaseOrganizationViewSet):
    queryset = Addedpay.objects.all()
    serializer_class = AddedpaySerializer


# ─── Dashboard Stats API ────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    """Return dashboard KPIs for the logged-in user's organization."""
    try:
        staff = Staff.objects.select_related('organization').get(user=request.user)
        org = staff.organization
    except Staff.DoesNotExist:
        return Response({'error': 'No organization found'}, status=403)

    today = timezone.now().date()
    current_month_start = today.replace(day=1)

    # Counts
    total_members = Trainer.objects.filter(organization=org, is_active=True).count()
    inactive_members = Trainer.objects.filter(organization=org, is_active=False).count()
    total_staff = Staff.objects.filter(organization=org).count()
    total_articles = Article.objects.filter(organization=org).count()

    # Payments this month
    month_income = Payments.objects.filter(
        organization=org,
        paymentdate__gte=current_month_start,
        paymentdate__lte=today,
    ).aggregate(total=Sum('paymentAmount'))['total'] or 0

    # Payments today
    today_income = Payments.objects.filter(
        organization=org,
        paymentdate=today,
    ).aggregate(total=Sum('paymentAmount'))['total'] or 0

    # Expenses this month
    month_expenses = Costs.objects.filter(
        organization=org,
        date__gte=current_month_start,
        date__lte=today,
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Additional payments this month
    month_added = Addedpay.objects.filter(
        organization=org,
        date__gte=current_month_start,
        date__lte=today,
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Subscription info
    sub_info = {
        'status': org.subscription_status,
        'days_remaining': org.days_remaining,
        'is_active': org.is_active,
    }

    # Unpaid members this month (members who haven't paid monthly this month)
    paid_ids = Payments.objects.filter(
        organization=org,
        paymentCategry='month',
        paymentdate__gte=current_month_start,
    ).values_list('trainer_id', flat=True).distinct()

    unpaid_count = Trainer.objects.filter(
        organization=org, is_active=True
    ).exclude(id__in=paid_ids).count()

    # New members this month
    new_members = Trainer.objects.filter(
        organization=org,
        started_day__gte=current_month_start,
    ).count()

    return Response({
        'total_members': total_members,
        'inactive_members': inactive_members,
        'total_staff': total_staff,
        'total_articles': total_articles,
        'month_income': float(month_income),
        'today_income': float(today_income),
        'month_expenses': float(month_expenses),
        'month_added_payments': float(month_added),
        'unpaid_count': unpaid_count,
        'new_members': new_members,
        'subscription': sub_info,
        'organization_name': org.name,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unpaid_members(request):
    """Return list of members who haven't paid monthly for a given month/year."""
    try:
        staff = Staff.objects.select_related('organization').get(user=request.user)
        org = staff.organization
    except Staff.DoesNotExist:
        return Response({'error': 'No organization found'}, status=403)

    today = timezone.now().date()
    year = int(request.query_params.get('year', today.year))
    month = int(request.query_params.get('month', today.month))

    start_date = today.replace(year=year, month=month, day=1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = today.replace(year=year, month=month, day=last_day)

    paid_ids = Payments.objects.filter(
        organization=org,
        paymentCategry='month',
        paymentdate__gte=start_date,
        paymentdate__lte=end_date,
    ).values_list('trainer_id', flat=True).distinct()

    unpaid = Trainer.objects.filter(
        organization=org, is_active=True
    ).exclude(id__in=paid_ids).values(
        'id', 'first_name', 'last_name', 'phone', 'category'
    )

    return Response({
        'year': year,
        'month': month,
        'unpaid': list(unpaid),
        'count': len(unpaid),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def financial_summary(request):
    """Return financial overview for the organization."""
    try:
        staff = Staff.objects.select_related('organization').get(user=request.user)
        org = staff.organization
    except Staff.DoesNotExist:
        return Response({'error': 'No organization found'}, status=403)

    today = timezone.now().date()
    year = int(request.query_params.get('year', today.year))

    # Monthly income breakdown
    monthly_income = []
    for m in range(1, 13):
        income = Payments.objects.filter(
            organization=org,
            paymentdate__year=year,
            paymentdate__month=m,
        ).aggregate(total=Sum('paymentAmount'))['total'] or 0
        monthly_income.append({'month': m, 'income': float(income)})

    # Total income this year
    total_income = sum(m['income'] for m in monthly_income)

    # Total expenses this year
    total_expenses = Costs.objects.filter(
        organization=org,
        date__year=year,
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Total additional payments
    total_added = Addedpay.objects.filter(
        organization=org,
        date__year=year,
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Staff salaries
    total_salaries = Staff.objects.filter(
        organization=org,
    ).aggregate(total=Sum('salary'))['total'] or 0

    # Rent
    rent = float(org.rent_amount) if org.rent_amount else 0

    return Response({
        'year': year,
        'monthly_income': monthly_income,
        'total_income': float(total_income),
        'total_expenses': float(total_expenses),
        'total_added_payments': float(total_added),
        'total_salaries': float(total_salaries),
        'rent': rent,
        'net_profit': float(total_income) + float(total_added) - float(total_expenses) - float(total_salaries) - rent,
    })
