from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from trainers.models import OrganizationInfo, Staff


class OrganizationSettingsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = OrganizationInfo.objects.create(
            name='North Club',
            slug='north-club',
            email='north@example.com',
        )
        self.admin = User.objects.create_user('north-admin', password='test-password-123')
        Staff.objects.create(
            user=self.admin,
            organization=self.organization,
            role='Owner',
            is_admin=True,
        )
        self.staff_user = User.objects.create_user('north-staff', password='test-password-123')
        Staff.objects.create(
            user=self.staff_user,
            organization=self.organization,
            role='Coach',
            is_admin=False,
        )

    def test_organization_admin_can_update_organization_profile(self):
        self.client.force_authenticate(self.admin)

        response = self.client.patch('/api/v1/auth/organization/', {
            'name': 'North Sports Club',
            'phone_number': '0612345678',
            'location': 'North district',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.name, 'North Sports Club')
        self.assertEqual(self.organization.location, 'North district')

    def test_regular_staff_cannot_update_organization_profile(self):
        self.client.force_authenticate(self.staff_user)

        response = self.client.patch('/api/v1/auth/organization/', {'name': 'Unauthorized'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.name, 'North Club')

    def test_duplicate_slug_is_rejected(self):
        OrganizationInfo.objects.create(name='South Club', slug='south-club')
        self.client.force_authenticate(self.admin)

        response = self.client.patch('/api/v1/auth/organization/', {'slug': 'south-club'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)