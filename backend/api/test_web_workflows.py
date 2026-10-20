import tempfile
from datetime import datetime

from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from trainers.models import Addedpay, Article, Costs, OrganizationInfo, Payments, Staff, Trainer


class WebWorkflowContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='workflow-admin',
            email='workflow@example.com',
            password='test-password-123',
        )
        self.organization = OrganizationInfo.objects.create(name='Workflow Club', slug='workflow-club')
        Staff.objects.create(
            user=self.user,
            organization=self.organization,
            role='Owner',
            is_admin=True,
        )
        self.client.force_authenticate(self.user)

    def create_member(self, first_name, last_name):
        return Trainer.objects.create(
            organization=self.organization,
            first_name=first_name,
            last_name=last_name,
            birth_day='2010-05-10',
            male_female='male',
            category='كبار',
        )

    def test_member_search_filters_results(self):
        matching = self.create_member('Distinctive', 'Trainee')
        self.create_member('Different', 'Member')

        response = self.client.get('/api/v1/crm/members/?search=Distinctive')

        self.assertEqual(response.status_code, 200)
        self.assertEqual([member['id'] for member in response.data['results']], [matching.id])

    def test_members_without_category_filter_include_all_categories_and_statuses(self):
        active_member = self.create_member('Active', 'Member')
        inactive_member = self.create_member('Inactive', 'Member')
        inactive_member.is_active = False
        inactive_member.category = 'نساء'
        inactive_member.save()

        response = self.client.get('/api/v1/crm/members/?is_active=all')

        self.assertEqual(response.status_code, 200)
        self.assertEqual({member['id'] for member in response.data['results']}, {active_member.id, inactive_member.id})

    def test_financial_summary_reconciles_income_expenses_and_event_participants(self):
        first_member = self.create_member('First', 'Participant')
        second_member = self.create_member('Second', 'Participant')
        Payments.objects.create(
            organization=self.organization,
            trainer=first_member,
            paymentdate='2026-02-05',
            paymentCategry='month',
            paymentAmount='100.00',
        )
        Addedpay.objects.create(
            organization=self.organization,
            title='Sponsorship',
            amount='25.00',
            date=timezone.make_aware(datetime(2026, 2, 10, 12)),
        )
        Costs.objects.create(
            organization=self.organization,
            cost='Equipment',
            amount='20.00',
            date=timezone.make_aware(datetime(2026, 2, 12, 12)),
        )
        event = Article.objects.create(
            organization=self.organization,
            title='February event',
            date='2026-02-15',
            location='Club',
            content='Event report',
            category='League',
            area='national',
            costs='10.00',
            participetion_price='12.00',
        )
        event.trainees.set([first_member, second_member])
        owner_staff = Staff.objects.get(user=self.user)
        owner_staff.salary = '100.00'
        owner_staff.started = '2026-02-01'
        owner_staff.save(update_fields=['salary', 'started'])
        self.organization.rent_amount = '200.00'
        self.organization.datepay = '2026-02-01'
        self.organization.save(update_fields=['rent_amount', 'datepay'])

        response = self.client.get('/api/v1/crm/financial/?year=2026')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_income'], 149.0)
        self.assertEqual(response.data['total_expenses'], 3330.0)
        self.assertEqual(response.data['net_profit'], -3181.0)
        self.assertEqual(response.data['income_breakdown']['events'], 24.0)
        self.assertEqual(response.data['expense_breakdown']['salaries'], 1100.0)
        self.assertEqual(response.data['expense_breakdown']['rent'], 2200.0)
        self.assertEqual(response.data['monthly_breakdown'][1]['income'], 149.0)
        self.assertEqual(response.data['monthly_breakdown'][1]['expenses'], 30.0)

    def test_staff_creation_reports_duplicate_usernames_as_validation_errors(self):
        payload = {
            'username': self.user.username,
            'email': 'duplicate@example.com',
            'password': 'test-password-123',
            'role': 'Coach',
            'is_admin': False,
            'salary': '0',
            'started': '2026-10-15',
            'datepay': '2026-10-15',
        }

        response = self.client.post('/api/v1/crm/staff/', payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('username', response.data['detail'])

    def test_event_creation_accepts_choices_and_participants(self):
        member = self.create_member('Event', 'Participant')
        payload = {
            'title': 'Spring tournament',
            'date': '2026-10-14',
            'location': 'Main hall',
            'content': 'Quarterly tournament',
            'category': 'League',
            'area': 'national',
            'costs': '0',
            'participetion_price': '10',
            'trainees': [member.id],
        }

        response = self.client.post('/api/v1/crm/articles/', payload, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        event = Article.objects.get(pk=response.data['id'])
        self.assertEqual(list(event.trainees.values_list('id', flat=True)), [member.id])

    def test_member_document_list_is_organization_scoped(self):
        member = self.create_member('Document', 'Owner')
        response = self.client.get(f'/api/v1/crm/members/{member.id}/documents/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

        other_organization = OrganizationInfo.objects.create(name='Other Club', slug='other-club')
        other_member = Trainer.objects.create(
            organization=other_organization,
            first_name='Other',
            last_name='Member',
            birth_day='2010-05-10',
            male_female='female',
            category='كبار',
        )
        cross_organization_response = self.client.get(
            f'/api/v1/crm/members/{other_member.id}/documents/'
        )
        self.assertEqual(cross_organization_response.status_code, 404)

    def test_member_document_upload_and_delete(self):
        member = self.create_member('Document', 'Upload')
        storages = settings.STORAGES.copy()
        with tempfile.TemporaryDirectory() as storage_root:
            storages['default'] = {
                'BACKEND': 'django.core.files.storage.FileSystemStorage',
                'OPTIONS': {'location': storage_root},
            }
            with override_settings(STORAGES=storages):
                upload = SimpleUploadedFile('identity.pdf', b'test document', content_type='application/pdf')
                response = self.client.post(
                    f'/api/v1/crm/members/{member.id}/documents/',
                    {'document_type': 'وثيقة أخرى', 'file': upload},
                    format='multipart',
                )
                self.assertEqual(response.status_code, 201, response.data)
                document_id = response.data['id']

                delete_response = self.client.delete(
                    f'/api/v1/crm/members/{member.id}/documents/{document_id}/'
                )
                self.assertEqual(delete_response.status_code, 204)
