from datetime import timedelta
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from trainers.models import OrganizationInfo, OrganizationPayment, PlatformExpense, Staff, Trainer


class PlatformOrganizationAdminTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.platform_admin = User.objects.create_superuser(
            username='platform-admin',
            email='platform-admin@example.com',
            password='test-password-123',
        )
        self.org_admin = User.objects.create_user(
            username='org-admin',
            email='org-admin@example.com',
            password='test-password-123',
        )
        self.organization = OrganizationInfo.objects.create(name='North Club', slug='north-club')
        self.staff = Staff.objects.create(
            user=self.org_admin,
            organization=self.organization,
            role='Owner',
            is_admin=True,
        )
        self.member = Trainer.objects.create(
            organization=self.organization,
            first_name='Sam',
            last_name='Member',
            birth_day='2000-01-01',
            male_female='male',
            category='كبار',
        )

    def test_organization_admin_cannot_access_platform_directory(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.get('/api/v1/platform/organizations/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_platform_admin_can_list_organization_summary(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.get('/api/v1/platform/organizations/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        organization = response.data['results'][0]
        self.assertEqual(organization['name'], 'North Club')
        self.assertEqual(organization['active_trainees'], 1)
        self.assertEqual(organization['staff_count'], 1)
        self.assertEqual(organization['admins'][0]['username'], 'org-admin')

    def test_platform_dashboard_reports_subscription_income_and_organization_totals(self):
        self.client.force_authenticate(self.platform_admin)
        OrganizationPayment.objects.create(
            organization=self.organization,
            amount=Decimal('500.00'),
            duration_months=1,
        )

        response = self.client.get('/api/v1/platform/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['metrics']['organization_count'], 1)
        self.assertEqual(response.data['metrics']['trainee_count'], 1)
        self.assertEqual(response.data['metrics']['subscription_income'], 500.0)

    def test_platform_admin_can_add_platform_expenses(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.post(
            '/api/v1/platform/dashboard/',
            {'title': 'Hosting', 'description': 'Cloud service', 'amount': '25.50', 'date': '2026-10-15'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        expense = PlatformExpense.objects.get(pk=response.data['id'])
        self.assertEqual(expense.amount, Decimal('25.50'))
        self.assertEqual(expense.created_by, self.platform_admin)

    def test_platform_payment_history_lists_and_filters_organization_receipts(self):
        self.client.force_authenticate(self.platform_admin)
        OrganizationPayment.objects.create(
            organization=self.organization,
            amount=Decimal('500.00'),
            duration_months=1,
            payment_method='cash',
        )
        OrganizationPayment.objects.create(
            organization=self.organization,
            amount=Decimal('800.00'),
            duration_months=3,
            payment_method='bank_transfer',
        )

        response = self.client.get('/api/v1/platform/payments/?payment_method=cash&search=North')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['total_amount'], 500.0)
        self.assertEqual(response.data['results'][0]['organization_name'], 'North Club')

    def test_organization_admin_cannot_access_platform_dashboard(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.get('/api/v1/platform/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_platform_admin_can_view_organization_details(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.get(f'/api/v1/platform/organizations/{self.organization.pk}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['staff'][0]['email'], 'org-admin@example.com')
        self.assertEqual(response.data['total_trainees'], 1)
        self.assertEqual(response.data['subscription_payments'], [])

    def test_platform_admin_can_update_organization_and_suspend_it(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.patch(
            f'/api/v1/platform/organizations/{self.organization.pk}/',
            {'subscription_tier': 'premium', 'max_trainers': 120, 'is_active': False},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.subscription_tier, 'premium')
        self.assertEqual(self.organization.max_trainers, 120)
        self.assertFalse(self.organization.is_active)

    def test_organization_admin_cannot_update_platform_organization(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.patch(
            f'/api/v1/platform/organizations/{self.organization.pk}/',
            {'is_active': False},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.organization.refresh_from_db()
        self.assertTrue(self.organization.is_active)

    def test_platform_admin_can_create_organization_and_owner(self):
        self.client.force_authenticate(self.platform_admin)
        payload = {
            'username': 'new-owner',
            'email': 'new-owner@example.com',
            'password': 'safe-password-123',
            'password_confirm': 'safe-password-123',
            'org_name': 'South Club',
            'org_slug': 'south-club',
            'org_email': 'contact@south-club.example',
            'org_phone': '0612345678',
        }

        response = self.client.post('/api/v1/platform/organizations/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['name'], 'South Club')
        created_staff = Staff.objects.get(user__username='new-owner')
        self.assertEqual(created_staff.organization.name, 'South Club')
        self.assertTrue(created_staff.is_admin)

    def test_renewal_records_payment_and_updates_subscription(self):
        self.client.force_authenticate(self.platform_admin)
        payload = {
            'duration_months': 3,
            'amount': '350.00',
            'payment_method': 'bank_transfer',
            'notes': 'Quarterly renewal',
        }

        response = self.client.post(
            f'/api/v1/platform/organizations/{self.organization.pk}/renew/',
            payload,
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        payment = OrganizationPayment.objects.get(organization=self.organization)
        self.organization.refresh_from_db()
        self.assertEqual(payment.amount, Decimal('350.00'))
        self.assertEqual(payment.duration_months, 3)
        self.assertEqual(payment.period, 'quarterly')
        self.assertEqual(payment.processed_by, self.platform_admin)
        self.assertEqual(payment.subscription_end, payment.subscription_start + relativedelta(months=3) - timedelta(days=1))
        self.assertEqual(self.organization.subscription_status, 'active')
        self.assertEqual(self.organization.subscription_end_date, payment.subscription_end)

    def test_renewal_rejects_unsupported_duration_without_recording_payment(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.post(
            f'/api/v1/platform/organizations/{self.organization.pk}/renew/',
            {'duration_months': 2, 'amount': '100.00'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(OrganizationPayment.objects.filter(organization=self.organization).exists())

    def test_profile_identifies_platform_admin_separately(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.get('/api/v1/auth/me/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['data']['is_platform_admin'])
        self.assertFalse(response.data['data']['is_admin'])