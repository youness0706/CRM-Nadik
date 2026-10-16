import tempfile

from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from trainers.models import OrganizationInfo, Staff, Trainer, Article


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
