from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q, F, DecimalField
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta
import calendar

from trainers.models import (
    Staff, Trainer, Payments, Article, Costs, Addedpay, TrainerDocument, OrganizationInfo
)
from api.common.permissions import IsOrganizationActive
from .serializers import (
    StaffSerializer, TrainerSerializer, TrainerCreateSerializer,
    PaymentSerializer, ArticleSerializer, CostsSerializer,
    AddedpaySerializer, TrainerDocumentSerializer,
)


class BaseOrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActive]

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
    search_fields = ['first_name', 'last_name', 'phone', 'email', 'CIN']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TrainerCreateSerializer
        return TrainerSerializer

    def get_queryset(self):
        org = self.get_organization()
        qs = self.queryset.filter(organization=org)

        # Filter by active/inactive
        is_active = self.request.query_params.get('is_active')
        if is_active is not None and is_active.lower() != 'all':
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


class TrainerDocumentsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActive]

    def _get_trainer(self, request, trainer_pk):
        try:
            staff = Staff.objects.select_related('organization').get(user=request.user)
        except Staff.DoesNotExist:
            raise PermissionDenied('You do not belong to any organization.')
        return get_object_or_404(Trainer, pk=trainer_pk, organization=staff.organization)

    def get(self, request, trainer_pk):
        trainer = self._get_trainer(request, trainer_pk)
        documents = TrainerDocument.objects.filter(trainer=trainer).order_by('-uploaded_at')
        serializer = TrainerDocumentSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, trainer_pk):
        trainer = self._get_trainer(request, trainer_pk)
        payload = request.data.copy()
        payload['trainer'] = trainer.pk
        serializer = TrainerDocumentSerializer(data=payload, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TrainerDocumentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActive]

    def delete(self, request, trainer_pk, pk):
        try:
            staff = Staff.objects.select_related('organization').get(user=request.user)
        except Staff.DoesNotExist:
            raise PermissionDenied('You do not belong to any organization.')
        document = get_object_or_404(
            TrainerDocument,
            pk=pk,
            trainer_id=trainer_pk,
            trainer__organization=staff.organization,
        )
        document.file.delete(save=False)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Dashboard Stats API ────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsOrganizationActive])
def dashboard_stats(request):
    """Return dashboard KPIs for the logged-in user's organization."""
    try:
        staff = Staff.objects.select_related('organization').get(user=request.user)
        org = staff.organization
    except Staff.DoesNotExist:
        return Response({'error': 'No organization found'}, status=403)

    today = timezone.now().date()
    current_month_start = today.replace(day=1)
    month_start_datetime = timezone.make_aware(
        datetime.combine(current_month_start, datetime.min.time())
    )
    tomorrow_datetime = timezone.make_aware(
        datetime.combine(today + timedelta(days=1), datetime.min.time())
    )

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
        date__gte=month_start_datetime,
        date__lt=tomorrow_datetime,
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Additional payments this month
    month_added = Addedpay.objects.filter(
        organization=org,
        date__gte=month_start_datetime,
        date__lt=tomorrow_datetime,
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
@permission_classes([permissions.IsAuthenticated, IsOrganizationActive])
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
@permission_classes([permissions.IsAuthenticated, IsOrganizationActive])
def financial_summary(request):
    """Return financial overview for the organization."""
    try:
        staff = Staff.objects.select_related('organization').get(user=request.user)
        org = staff.organization
    except Staff.DoesNotExist:
        return Response({'error': 'No organization found'}, status=403)

    today = timezone.now().date()
    year = int(request.query_params.get('year', today.year))

    amount_field = DecimalField(max_digits=14, decimal_places=2)
    yearly_payments = Payments.objects.filter(organization=org, paymentdate__year=year)
    yearly_added = Addedpay.objects.filter(organization=org, date__year=year)
    yearly_costs = Costs.objects.filter(organization=org, date__year=year)
    yearly_articles = Article.objects.filter(organization=org, date__year=year).annotate(
        participant_count=Count('trainees', distinct=True),
    )

    payment_total = yearly_payments.aggregate(total=Sum('paymentAmount'))['total'] or 0
    added_total = yearly_added.aggregate(total=Sum('amount'))['total'] or 0
    operating_cost_total = yearly_costs.aggregate(total=Sum('amount'))['total'] or 0
    article_totals = yearly_articles.aggregate(
        participation_income=Sum(F('participetion_price') * F('participant_count'), output_field=amount_field),
        costs=Sum('costs'),
    )
    event_income_total = article_totals['participation_income'] or 0
    event_cost_total = article_totals['costs'] or 0

    # Monthly income and expense series for report charts.
    monthly_income = []
    monthly_breakdown = []
    for m in range(1, 13):
        payments_income = yearly_payments.filter(paymentdate__month=m).aggregate(total=Sum('paymentAmount'))['total'] or 0
        additional_income = yearly_added.filter(date__month=m).aggregate(total=Sum('amount'))['total'] or 0
        operating_expenses = yearly_costs.filter(date__month=m).aggregate(total=Sum('amount'))['total'] or 0
        article_month = yearly_articles.filter(date__month=m).aggregate(
            participation_income=Sum(F('participetion_price') * F('participant_count'), output_field=amount_field),
            costs=Sum('costs'),
        )
        event_income = article_month['participation_income'] or 0
        event_expenses = article_month['costs'] or 0
        month_income = payments_income + additional_income + event_income
        month_expenses = operating_expenses + event_expenses
        monthly_income.append({'month': m, 'income': float(month_income)})
        monthly_breakdown.append({
            'month': m,
            'income': float(month_income),
            'payments': float(payments_income),
            'additional_income': float(additional_income),
            'event_income': float(event_income),
            'expenses': float(month_expenses),
            'operating_expenses': float(operating_expenses),
            'event_expenses': float(event_expenses),
            'net': float(month_income - month_expenses),
        })

    total_income = payment_total + added_total + event_income_total

    # Project recurring salary and rent commitments into the selected year.
    year_start = datetime(year, 1, 1).date()
    year_end = datetime(year, 12, 31).date()
    total_salaries = 0
    for salary, started in Staff.objects.filter(organization=org).values_list('salary', 'started'):
        started_date = started.date() if isinstance(started, datetime) else started
        salary_months = 12 if started_date.year < year else 13 - started_date.month if started_date.year == year else 0
        total_salaries += salary * salary_months

    rent = 0
    rent_date = org.datepay.date() if isinstance(org.datepay, datetime) else org.datepay
    if org.rent_amount and rent_date:
        while rent_date <= year_end:
            if rent_date >= year_start:
                rent += org.rent_amount
            rent_date += timedelta(days=calendar.monthrange(rent_date.year, rent_date.month)[1])

    total_expenses = operating_cost_total + event_cost_total + total_salaries + rent
    rent = float(rent)

    return Response({
        'year': year,
        'monthly_income': monthly_income,
        'monthly_breakdown': monthly_breakdown,
        'total_income': float(total_income),
        'total_expenses': float(total_expenses),
        'total_added_payments': float(added_total),
        'income_breakdown': {
            'payments': float(payment_total),
            'additional_payments': float(added_total),
            'events': float(event_income_total),
        },
        'expense_breakdown': {
            'operating': float(operating_cost_total),
            'events': float(event_cost_total),
            'salaries': float(total_salaries),
            'rent': rent,
        },
        'total_salaries': float(total_salaries),
        'rent': rent,
        'net_profit': float(total_income) - float(total_expenses),
    })
