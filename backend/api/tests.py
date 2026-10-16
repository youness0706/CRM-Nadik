from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from django.utils import timezone
from trainers.models import Addedpay, Costs, OrganizationInfo, Payments, Staff, Trainer


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

        staff_list = self.client.get('/api/v1/crm/staff/')
        self.assertEqual(staff_list.status_code, status.HTTP_200_OK)
        self.assertEqual(staff_list.data['count'], 2)
        staff_id = next(item['id'] for item in staff_list.data['results'] if item['username'] == 'newcoach')

        staff_detail = self.client.get(f'/api/v1/crm/staff/{staff_id}/')
        self.assertEqual(staff_detail.status_code, status.HTTP_200_OK)

        staff_update = self.client.patch(
            f'/api/v1/crm/staff/{staff_id}/', {'role': 'Senior Coach'}, format='json'
        )
        self.assertEqual(staff_update.status_code, status.HTTP_200_OK, staff_update.data)
        self.assertEqual(staff_update.data['role'], 'Senior Coach')

        staff_delete = self.client.delete(f'/api/v1/crm/staff/{staff_id}/')
        self.assertEqual(staff_delete.status_code, status.HTTP_204_NO_CONTENT)

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
        payment_id = pay_res.data['id']

        payment_detail = self.client.get(f'/api/v1/crm/payments/{payment_id}/')
        self.assertEqual(payment_detail.status_code, status.HTTP_200_OK)
        payment_update = self.client.patch(
            f'/api/v1/crm/payments/{payment_id}/', {'paymentAmount': '250.00'}
        )
        self.assertEqual(payment_update.status_code, status.HTTP_200_OK)
        self.assertEqual(payment_update.data['paymentAmount'], '250.00')
        payment_delete = self.client.delete(f'/api/v1/crm/payments/{payment_id}/')
        self.assertEqual(payment_delete.status_code, status.HTTP_204_NO_CONTENT)

        # Org2 cannot see this payment
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token2)
        list_res = self.client.get('/api/v1/crm/payments/')
        self.assertEqual(list_res.data['count'], 0)

    def test_payment_rejects_member_from_another_organization(self):
        other_member = Trainer.objects.create(
            organization=self.org2,
            first_name='Other',
            last_name='Member',
            birth_day='2000-01-01',
            male_female='male',
            category='كبار',
        )
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)

        response = self.client.post('/api/v1/crm/payments/', {
            'trainer': other_member.pk,
            'paymentdate': '2026-10-01',
            'paymentCategry': 'month',
            'paymentAmount': '200.00',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Payments.objects.exists())

    def test_article_expense_and_additional_income_crud(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)
        resource_cases = [
            (
                'articles',
                {
                    'title': 'Autumn tournament',
                    'date': '2026-10-01',
                    'location': 'Club hall',
                    'content': 'Tournament details',
                    'category': 'League',
                    'area': 'local',
                    'costs': '50.00',
                    'participetion_price': '10.00',
                },
                'title',
                'Updated tournament',
            ),
            (
                'expenses',
                {
                    'cost': 'Equipment',
                    'desc': 'Training supplies',
                    'amount': '75.00',
                    'date': '2026-10-01T12:00:00Z',
                    'is_recurring': False,
                },
                'amount',
                '80.00',
            ),
            (
                'added-payments',
                {
                    'title': 'Donation',
                    'desc': 'Community donation',
                    'amount': '125.00',
                    'date': '2026-10-01T12:00:00Z',
                },
                'amount',
                '130.00',
            ),
        ]

        for resource, payload, field, updated_value in resource_cases:
            with self.subTest(resource=resource):
                url = f'/api/v1/crm/{resource}/'
                created = self.client.post(url, payload, format='json')
                self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
                resource_id = created.data['id']

                listed = self.client.get(url)
                self.assertEqual(listed.status_code, status.HTTP_200_OK)
                self.assertEqual(listed.data['count'], 1)

                updated = self.client.patch(
                    f'{url}{resource_id}/', {field: updated_value}, format='json'
                )
                self.assertEqual(updated.status_code, status.HTTP_200_OK, updated.data)
                self.assertEqual(str(updated.data[field]), str(updated_value))

                self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token2)
                other_org_list = self.client.get(url)
                self.assertEqual(other_org_list.data['count'], 0)
                self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)

                deleted = self.client.delete(f'{url}{resource_id}/')
                self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)

    def test_dashboard_unpaid_and_financial_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)
        for endpoint in ('unpaid/', 'financial/'):
            response = self.client.get(f'/api/v1/crm/{endpoint}')
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_api_schema_and_documentation_routes(self):
        for endpoint in ('schema/', 'docs/', 'redoc/'):
            with self.subTest(endpoint=endpoint):
                response = self.client.get(f'/api/v1/{endpoint}')
                self.assertEqual(response.status_code, status.HTTP_200_OK)

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

    def test_dashboard_counts_expenses_and_additional_income_for_today(self):
        Costs.objects.create(
            organization=self.org1,
            cost='Equipment',
            amount='75.00',
            date=timezone.now(),
        )
        Addedpay.objects.create(
            organization=self.org1,
            title='Donation',
            amount='125.00',
            date=timezone.now(),
        )
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token1)

        response = self.client.get('/api/v1/crm/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['month_expenses'], 75.0)
        self.assertEqual(response.data['month_added_payments'], 125.0)
