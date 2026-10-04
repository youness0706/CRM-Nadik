from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient


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
