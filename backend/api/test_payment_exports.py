from datetime import date
from io import BytesIO
import tempfile

from docx import Document
from docx.oxml.ns import qn
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image as PILImage
from rest_framework.test import APIClient

from trainers.models import OrganizationInfo, Payments, Staff, Trainer


class PaymentExportApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = OrganizationInfo.objects.create(name='North Club', slug='north-club')
        self.user = User.objects.create_user('north-admin', password='test-password-123')
        Staff.objects.create(
            user=self.user,
            organization=self.organization,
            role='Manager',
            is_admin=True,
        )
        self.client.force_authenticate(self.user)
        self.trainee = Trainer.objects.create(
            organization=self.organization,
            first_name='Amina',
            last_name='North',
            birth_day=date(2010, 1, 1),
            male_female='female',
            category='كبار',
        )
        self.unpaid_trainee = Trainer.objects.create(
            organization=self.organization,
            first_name='Sara',
            last_name='North',
            birth_day=date(2011, 1, 1),
            male_female='female',
            category='كبار',
        )
        self.payment = Payments.objects.create(
            organization=self.organization,
            trainer=self.trainee,
            paymentdate=date(2026, 4, 10),
            paymentCategry='month',
            paymentAmount='150.00',
        )

    def test_paid_export_filters_by_category_trainee_and_dates(self):
        response = self.client.get('/api/v1/crm/payments/export/docx/', {
            'paymentCategry': 'month',
            'trainer': self.trainee.pk,
            'start_date': '2026-04-01',
            'end_date': '2026-04-30',
            'status': 'paid',
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response['Content-Type'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        document = Document(BytesIO(response.content))
        content = ' '.join(
            cell.text
            for table in document.tables
            for row in table.rows
            for cell in row.cells
        )
        self.assertIn('Amina', content)
        self.assertIn('North', content)
        self.assertNotIn('Sara North', content)
        self.assertIn('150.00', content)
        self.assertIn('الاسم الشخصي', content)
        self.assertIn('تاريخ الأداء', content)
        self.assertIn('نوع الأداء: شهرية', ' '.join(
            paragraph.text for paragraph in document.paragraphs
        ))
        self.assertIsNotNone(document.tables[0]._tbl.tblPr.find(qn('w:bidiVisual')))

    def test_unpaid_export_uses_selected_period_and_category(self):
        response = self.client.get('/api/v1/crm/payments/export/docx/', {
            'paymentCategry': 'month',
            'start_date': '2026-04-01',
            'end_date': '2026-04-30',
            'status': 'unpaid',
        })

        self.assertEqual(response.status_code, 200)
        document = Document(BytesIO(response.content))
        content = ' '.join(
            cell.text
            for table in document.tables
            for row in table.rows
            for cell in row.cells
        )
        self.assertIn('Sara', content)
        self.assertIn('غير مدفوع', content)
        self.assertNotIn('Amina', content)

    def test_invoice_download_is_available_for_organization_payment(self):
        response = self.client.get(f'/api/v1/crm/payments/{self.payment.pk}/invoice/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.content.startswith(b'%PDF'))

    def test_uploaded_organization_logo_is_in_word_export_and_invoice(self):
        image_buffer = BytesIO()
        PILImage.new('RGB', (32, 32), color='blue').save(image_buffer, format='PNG')

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(
                MEDIA_ROOT=media_root,
                STORAGES={
                    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
                    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
                },
            ):
                response = self.client.patch('/api/v1/auth/organization/', {
                    'logo': SimpleUploadedFile(
                        'club-logo.png',
                        image_buffer.getvalue(),
                        content_type='image/png',
                    ),
                }, format='multipart')
                self.assertEqual(response.status_code, 200, response.data)
                self.assertTrue(response.data['data']['logo'].startswith('http'))

                word_response = self.client.get('/api/v1/crm/payments/export/docx/')
                self.assertEqual(word_response.status_code, 200)
                document = Document(BytesIO(word_response.content))
                self.assertEqual(len(document.inline_shapes), 1)
                self.assertIn('North Club', ' '.join(paragraph.text for paragraph in document.paragraphs))

                invoice_response = self.client.get(f'/api/v1/crm/payments/{self.payment.pk}/invoice/')
                self.assertEqual(invoice_response.status_code, 200)
                self.assertTrue(invoice_response.content.startswith(b'%PDF'))

        self.organization.refresh_from_db()
        self.assertTrue(self.organization.logo.name.endswith('/logo.png'))
