from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from trainers.models import OrganizationInfo, Staff


class LoginTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='login-user',
            email='login@example.com',
            password='CorrectHorseBattery9',
        )
        self.client = APIClient()

    def test_login_accepts_email(self):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': 'CorrectHorseBattery9'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['username'], self.user.username)

    def test_login_accepts_username(self):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': self.user.username, 'password': 'CorrectHorseBattery9'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)

    def test_register_creates_trial_organization_owner_and_tokens(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'new-owner',
            'email': 'new-owner@example.com',
            'password': 'SaffronRiver!482',
            'password_confirm': 'SaffronRiver!482',
            'org_name': 'New Sports Club',
            'org_slug': 'new-sports-club',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(username='new-owner')
        organization = OrganizationInfo.objects.get(slug='new-sports-club')
        self.assertTrue(user.check_password('SaffronRiver!482'))
        self.assertTrue(Staff.objects.get(user=user).is_admin)
        self.assertEqual(organization.subscription_status, 'trial')
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_auth_profile_password_refresh_logout_and_availability(self):
        login = self.client.post('/api/v1/auth/login/', {
            'username': self.user.username,
            'password': 'CorrectHorseBattery9',
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        profile = self.client.patch('/api/v1/auth/me/', {
            'first_name': 'Updated',
        }, format='json')
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data['data']['first_name'], 'Updated')

        changed = self.client.post('/api/v1/auth/password/change/', {
            'old_password': 'CorrectHorseBattery9',
            'new_password': 'VioletHarbor!739',
            'new_password_confirm': 'VioletHarbor!739',
        }, format='json')
        self.assertEqual(changed.status_code, 200, changed.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('VioletHarbor!739'))

        refreshed = self.client.post('/api/v1/auth/refresh/', {
            'refresh': login.data['refresh'],
        }, format='json')
        self.assertEqual(refreshed.status_code, 200, refreshed.data)
        self.assertIn('access', refreshed.data)

        logout = self.client.post('/api/v1/auth/logout/', {
            'refresh': refreshed.data['refresh'],
        }, format='json')
        self.assertEqual(logout.status_code, 200, logout.data)

        username_check = self.client.get('/api/v1/auth/check-username/', {'username': 'freshname'})
        self.assertTrue(username_check.data['available'])
        slug_check = self.client.get('/api/v1/auth/check-slug/', {'slug': 'fresh-club'})
        self.assertTrue(slug_check.data['available'])
