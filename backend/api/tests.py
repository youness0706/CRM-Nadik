from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from trainers.models import OrganizationInfo, Staff, Trainer, Payments


class CRMIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Org 1 and User 1
        self.org1 = OrganizationInfo.objects.create(name="Org 1", slug="org1")
        self.user1 = User.objects.create_user(username="admin1", email="admin1@test.com", password="password")
        self.staff1 = Staff.objects.create(user=self.user1, organization=self.org1, is_admin=True, role="Manager")

        # Org 2 and User 2 (Isolation Test)
        self.org2 = OrganizationInfo.objects.create(name="Org 2", slug="org2")
        self.user2 = User.objects.create_user(username="admin2", email="admin2@test.com", password="password")
        self.staff2 = Staff.objects.create(user=self.user2, organization=self.org2, is_admin=True, role="Manager")

        # Get JWT for user 1
        res = self.client.post('/api/v1/auth/login/', {'username': 'admin1', 'password': 'password'})
        self.token1 = res.data['access']

        # Get JWT for user 2
        res2 = self.client.post('/api/v1/auth/login/', {'username': 'admin2', 'password': 'password'})
        self.token2 = res2.data['access']

    # ─── AUTH ─────────────────────────────────────────────────────────

    def test_unauthenticated_access_rejected(self):
        """Requests without a token must return 401."""
        response = self.client.get('/api/v1/crm/members/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_access_allowed(self):
        """Valid JWT grants access to the members endpoint."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)
        response = self.client.get('/api/v1/crm/members/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ─── MEMBER CRUD & ORG ISOLATION ─────────────────────────────────

    def test_member_create_and_isolation(self):
        """A member created in Org1 must be invisible to Org2."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)

        data = {
            "first_name": "John",
            "last_name": "Doe",
            "birth_day": "2000-05-15",
            "phone": "123456",
            "CIN": "AB123",
            "male_female": "male",
            "category": "كبار",
            "started_day": "2026-01-01",
        }
        res = self.client.post('/api/v1/crm/members/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, msg=f"Creation failed: {res.data}")
        member_id = res.data['id']

        # Org2 user lists members → should see 0
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token2)
        res_list = self.client.get('/api/v1/crm/members/')
        self.assertEqual(res_list.data['count'], 0)

        # Org2 user tries to GET the specific member → 404
        res_get = self.client.get(f'/api/v1/crm/members/{member_id}/')
        self.assertEqual(res_get.status_code, status.HTTP_404_NOT_FOUND)

    def test_member_edit_and_delete(self):
        """Owner org can edit and delete; other org cannot."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)

        # Create
        data = {
            "first_name": "Ali",
            "last_name": "Test",
            "birth_day": "1995-01-01",
            "phone": "0612345678",
            "male_female": "male",
            "category": "كبار",
            "started_day": "2026-01-01",
        }
        res = self.client.post('/api/v1/crm/members/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        mid = res.data['id']

        # Edit
        res_edit = self.client.patch(f'/api/v1/crm/members/{mid}/', {"first_name": "Ali-Updated"})
        self.assertEqual(res_edit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_edit.data['first_name'], "Ali-Updated")

        # Org2 cannot edit
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token2)
        res_cross = self.client.patch(f'/api/v1/crm/members/{mid}/', {"first_name": "Hacked"})
        self.assertEqual(res_cross.status_code, status.HTTP_404_NOT_FOUND)

        # Owner can delete
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)
        res_del = self.client.delete(f'/api/v1/crm/members/{mid}/')
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)

    # ─── STAFF MANAGEMENT & RBAC ─────────────────────────────────────

    def test_admin_can_create_staff(self):
        """An admin user can create a new staff member via the API."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)

        data = {
            "username": "newcoach",
            "email": "coach@test.com",
            "password": "secure123",
            "first_name": "Coach",
            "last_name": "One",
            "role": "Coach",
            "is_admin": False,
            "started": "2026-01-15",
        }
        res = self.client.post('/api/v1/crm/staff/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, msg=f"Staff creation failed: {res.data}")

        # Verify the new staff can log in
        login_res = self.client.post('/api/v1/auth/login/', {'username': 'newcoach', 'password': 'secure123'})
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)

    def test_nonadmin_cannot_create_staff(self):
        """A non-admin staff member must be denied when trying to create staff."""
        # First, create a non-admin staff member
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)
        data = {
            "username": "regularstaff",
            "email": "regular@test.com",
            "password": "secure123",
            "role": "Receptionist",
            "is_admin": False,
            "started": "2026-01-15",
        }
        res = self.client.post('/api/v1/crm/staff/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Log in as the non-admin
        login_res = self.client.post('/api/v1/auth/login/', {'username': 'regularstaff', 'password': 'secure123'})
        staff_token = login_res.data['access']

        # Non-admin tries to create another staff → 403
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + staff_token)
        res2 = self.client.post('/api/v1/crm/staff/', {
            "username": "hacker",
            "email": "hack@test.com",
            "password": "nope",
            "role": "Evil",
        })
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

    # ─── PAYMENT CRUD ────────────────────────────────────────────────

    def test_payment_crud(self):
        """Payments can be created and are org-isolated."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)

        # Need a member first
        member_data = {
            "first_name": "Pays",
            "last_name": "Well",
            "birth_day": "1990-06-01",
            "phone": "111",
            "male_female": "male",
            "category": "كبار",
            "started_day": "2026-01-01",
        }
        member_res = self.client.post('/api/v1/crm/members/', member_data)
        self.assertEqual(member_res.status_code, status.HTTP_201_CREATED)
        trainer_id = member_res.data['id']

        # Record payment
        pay_data = {
            "trainer": trainer_id,
            "paymentdate": "2026-10-01",
            "paymentCategry": "month",
            "paymentAmount": "200.00",
        }
        pay_res = self.client.post('/api/v1/crm/payments/', pay_data)
        self.assertEqual(pay_res.status_code, status.HTTP_201_CREATED)

        # Org2 cannot see this payment
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token2)
        list_res = self.client.get('/api/v1/crm/payments/')
        self.assertEqual(list_res.data['count'], 0)

    # ─── DASHBOARD ───────────────────────────────────────────────────

    def test_dashboard_returns_data(self):
        """Dashboard endpoint returns expected keys."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)
        res = self.client.get('/api/v1/crm/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total_members', res.data)
        self.assertIn('month_income', res.data)
        self.assertIn('unpaid_count', res.data)
        self.assertIn('subscription', res.data)
