from datetime import datetime
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from openpyxl import Workbook, load_workbook

from trainers.models import OrganizationInfo, Payments, Staff, Trainer


class ExcelUploadTemplateTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.organization = OrganizationInfo.objects.create(name="Template Club", slug="template-club")
        self.user = User.objects.create_user(username="template-admin", password="test-password-123")
        Staff.objects.create(
            user=self.user,
            organization=self.organization,
            role="Owner",
            is_admin=True,
        )
        self.client.force_login(self.user)
        self.trainer = Trainer.objects.create(
            organization=self.organization,
            first_name="Amina",
            last_name="North",
            birth_day="2010-01-01",
            male_female="female",
            category="كبار",
        )

    def make_upload(self, rows, filename):
        workbook = Workbook()
        worksheet = workbook.active
        for row in rows:
            worksheet.append(row)
        content = BytesIO()
        workbook.save(content)
        return SimpleUploadedFile(
            filename,
            content.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    def test_trainer_template_has_category_dropdown_and_iso_date_formats(self):
        response = self.client.get("/download-trainers-template/")

        self.assertEqual(response.status_code, 200)
        workbook = load_workbook(BytesIO(response.content))
        worksheet = workbook["المتدربون"]
        self.assertEqual(worksheet["C2"].number_format, "yyyy-mm-dd")
        self.assertEqual(worksheet["O2"].number_format, "yyyy-mm-dd")
        self.assertEqual(
            workbook.defined_names["TrainerCategories"].attr_text,
            "'_Options'!$C$2:$C$6",
        )
        self.assertTrue(any("L2:L1000" == str(validation.sqref) for validation in worksheet.data_validations.dataValidation))
        self.assertEqual(workbook["_Options"]["A2"].value, "ذكر")
        self.assertEqual(workbook["_Options"]["C2"].value, "الصغار")

    def test_payment_template_has_trainer_and_category_dropdowns(self):
        response = self.client.get("/download-payments-template/")

        self.assertEqual(response.status_code, 200)
        workbook = load_workbook(BytesIO(response.content))
        worksheet = workbook["المدفوعات"]
        self.assertEqual(worksheet["B2"].number_format, "yyyy-mm-dd")
        self.assertEqual(workbook["_Options"]["A2"].value, f"{self.trainer.pk} - Amina North")
        self.assertEqual(workbook["_Options"]["B2"].value, "شهرية")
        self.assertTrue(any("C2:C1000" == str(validation.sqref) for validation in worksheet.data_validations.dataValidation))

    def test_trainer_upload_accepts_template_category_and_dates(self):
        upload = self.make_upload(
            [[
                "الاسم الأول", "اسم العائلة", "تاريخ الميلاد", "الجنس", "الهاتف",
                "هاتف ولي الأمر", "البريد الإلكتروني", "العنوان", "رقم البطاقة",
                "المستوى التعليمي", "درجة الحزام", "الفئة", "الطول", "الوزن",
                "تاريخ الانضمام",
            ], [
                "Salma", "Example", datetime(2012, 5, 6), "أنثى", "0600000000",
                "", "salma@example.com", "", "", "ابتدائي", "أبيض", "نساء",
                "", "", datetime(2026, 2, 3),
            ]],
            "trainees.xlsx",
        )

        response = self.client.post("/upload_data/", {"excel_file": upload})

        self.assertEqual(response.status_code, 302)
        imported = Trainer.objects.get(organization=self.organization, first_name="Salma")
        self.assertEqual(imported.male_female, "female")
        self.assertEqual(imported.category, "نساء")
        self.assertEqual(imported.birth_day.isoformat(), "2012-05-06")
        self.assertEqual(imported.started_day.isoformat(), "2026-02-03")

    def test_payment_upload_accepts_dropdown_labels_and_iso_dates(self):
        upload = self.make_upload(
            [
                ["المتدرب (رقم - الاسم)", "تاريخ الدفع", "نوع الدفع", "المبلغ"],
                [f"{self.trainer.pk} - Amina North", "2026-04-15", "شهرية", 125],
            ],
            "payments.xlsx",
        )

        response = self.client.post("/upload_payments", {"excel_file": upload})

        self.assertEqual(response.status_code, 302)
        payment = Payments.objects.get(organization=self.organization, trainer=self.trainer)
        self.assertEqual(payment.paymentCategry, "month")
        self.assertEqual(payment.paymentdate.isoformat(), "2026-04-15")

    def test_import_rejects_unknown_categories_and_ambiguous_dates(self):
        upload = self.make_upload(
            [
                ["المتدرب", "تاريخ الدفع", "نوع الدفع", "المبلغ"],
                [f"{self.trainer.pk} - Amina North", "2026-04-15", "monthly", 125],
                [f"{self.trainer.pk} - Amina North", "15/04/2026", "month", 125],
            ],
            "payments.xlsx",
        )

        response = self.client.post("/upload_payments", {"excel_file": upload})

        self.assertEqual(response.status_code, 302)
        self.assertFalse(Payments.objects.filter(organization=self.organization).exists())
