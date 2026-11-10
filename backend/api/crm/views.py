from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Sum, Count, Q, F, Case, When, Value, DecimalField, Exists, OuterRef
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.core.cache import cache
from django.http import HttpResponse
from datetime import datetime, timedelta
import calendar
from io import BytesIO
from zipfile import BadZipFile
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.utils.exceptions import InvalidFileException
from openpyxl.worksheet.datavalidation import DataValidation

from trainers.models import (
    Staff, Trainer, Payments, Article, Costs, Addedpay, TrainerDocument, OrganizationInfo
)
from trainers.payments.invoice_views import download_payment_invoice
from api.common.permissions import IsOrganizationActive
from .serializers import (
    StaffSerializer, TrainerSerializer, TrainerCreateSerializer,
    PaymentSerializer, ArticleSerializer, CostsSerializer,
    AddedpaySerializer, TrainerDocumentSerializer,
)


class BaseOrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActive]

    def get_organization(self):
        try:
            staff = Staff.objects.select_related('organization').get(user=self.request.user)
            return staff.organization
        except Staff.DoesNotExist:
            raise PermissionDenied("You do not belong to any organization.")

    def get_queryset(self):
        org = self.get_organization()
        return self.queryset.filter(organization=org)

    def perform_create(self, serializer):
        org = self.get_organization()
        serializer.save(organization=org)


class StaffViewSet(BaseOrganizationViewSet):
    queryset = Staff.objects.all().select_related('user')
    serializer_class = StaffSerializer

    def get_permissions(self):
        # We need a custom permission to restrict mutation to admins
        return super().get_permissions()
        
    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            try:
                staff = Staff.objects.select_related('organization').get(user=request.user)
                if not staff.is_admin:
                    self.permission_denied(request, message="Only admins can manage staff.")
            except Staff.DoesNotExist:
                self.permission_denied(request, message="No organization found.")


class TrainerViewSet(BaseOrganizationViewSet):
    queryset = Trainer.objects.all()
    serializer_class = TrainerSerializer
    search_fields = ['first_name', 'last_name', 'phone', 'email', 'CIN']
    max_import_size = 5 * 1024 * 1024

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TrainerCreateSerializer
        return TrainerSerializer

    @action(detail=False, methods=['get'], url_path='excel-template')
    def excel_template(self, request):
        template_columns = [
            ('first_name', 'الاسم الأول', 'Required / مطلوب'),
            ('last_name', 'اسم العائلة', 'Required / مطلوب'),
            ('gender', 'الجنس', 'Required / مطلوب: male/female أو ذكر/أنثى'),
            ('birth_day', 'تاريخ الميلاد', 'Optional / اختياري: YYYY-MM-DD'),
            ('phone', 'الهاتف', 'Optional / اختياري'),
            ('phone_parent', 'هاتف ولي الأمر', 'Optional / اختياري'),
            ('email', 'البريد الإلكتروني', 'Optional / اختياري'),
            ('CIN', 'رقم البطاقة الوطنية', 'Optional / اختياري'),
            ('address', 'العنوان', 'Optional / اختياري'),
            ('belt_degree', 'درجة الحزام', 'Optional / اختياري'),
            ('Degree', 'المستوى الدراسي', 'Optional / اختياري'),
            ('category', 'الفئة', 'Optional / اختياري: use an available category / اختر فئة متاحة'),
            ('tall', 'الطول (سم)', 'Optional / اختياري'),
            ('weight', 'الوزن (كلغ)', 'Optional / اختياري'),
            ('started_day', 'تاريخ البداية', 'Optional / اختياري: YYYY-MM-DD'),
            ('is_active', 'الحالة', 'Optional / اختياري: true/false أو نعم/لا'),
        ]
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = 'Trainees'
        worksheet.append([f'{field_name} / {arabic_label}' for field_name, arabic_label, _ in template_columns])
        for index, (_, _, instruction) in enumerate(template_columns, start=1):
            column_letter = worksheet.cell(row=1, column=index).column_letter
            worksheet.cell(row=1, column=index).comment = Comment(instruction, 'Nadik')
            worksheet.column_dimensions[column_letter].width = 28
        worksheet.freeze_panes = 'A2'
        worksheet.auto_filter.ref = f'A1:{worksheet.cell(row=1, column=len(template_columns)).column_letter}1'
        gender_validation = DataValidation(type='list', formula1='"male,female,ذكر,أنثى"', allow_blank=False)
        worksheet.add_data_validation(gender_validation)
        gender_validation.add('C2:C1000')

        instructions = workbook.create_sheet('Instructions')
        instructions.append(['Column / الحقل', 'Required / مطلوب', 'Accepted values / القيم المقبولة'])
        for field_name, arabic_label, instruction in template_columns:
            instructions.append([f'{field_name} / {arabic_label}', instruction, instruction])
        instructions.append([
            'Only first name, last name, and gender are required. / الحقول المطلوبة فقط: الاسم الأول واسم العائلة والجنس.',
            '',
            '',
        ])
        instructions.column_dimensions['A'].width = 48
        instructions.column_dimensions['B'].width = 42
        instructions.column_dimensions['C'].width = 42

        output = BytesIO()
        workbook.save(output)
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="trainees_template.xlsx"'
        return response

    @action(
        detail=False,
        methods=['post'],
        url_path='import-excel',
        parser_classes=[FormParser, MultiPartParser],
    )
    def import_excel(self, request):
        excel_file = request.FILES.get('file')
        if not excel_file:
            return Response(
                {'error': 'Choose an Excel file to import. / اختر ملف Excel للاستيراد.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not excel_file.name.lower().endswith('.xlsx'):
            return Response(
                {'error': 'The file must be an .xlsx workbook. / يجب أن يكون الملف بصيغة .xlsx.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if excel_file.size > self.max_import_size:
            return Response(
                {'error': 'The Excel file must be 5 MB or smaller. / يجب ألا يتجاوز حجم ملف Excel خمسة ميغابايت.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            workbook = load_workbook(excel_file, read_only=True, data_only=True)
        except (InvalidFileException, BadZipFile):
            return Response(
                {'error': 'The uploaded file is not a valid .xlsx workbook. / ملف Excel غير صالح.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        header_aliases = {
            'first_name': 'first_name',
            'firstname': 'first_name',
            'prénom': 'first_name',
            'prenom': 'first_name',
            'الاسم_الأول': 'first_name',
            'الاسم_الشخصي': 'first_name',
            'last_name': 'last_name',
            'lastname': 'last_name',
            'nom': 'last_name',
            'اسم_العائلة': 'last_name',
            'gender': 'male_female',
            'sex': 'male_female',
            'sexe': 'male_female',
            'male_female': 'male_female',
            'الجنس': 'male_female',
            'النوع': 'male_female',
            'birth_day': 'birth_day',
            'birthday': 'birth_day',
            'date_of_birth': 'birth_day',
            'تاريخ_الميلاد': 'birth_day',
            'phone': 'phone',
            'الهاتف': 'phone',
            'phone_parent': 'phone_parent',
            'parent_phone': 'phone_parent',
            'هاتف_ولي_الأمر': 'phone_parent',
            'email': 'email',
            'البريد_الإلكتروني': 'email',
            'cin': 'CIN',
            'رقم_البطاقة_الوطنية': 'CIN',
            'address': 'address',
            'العنوان': 'address',
            'belt_degree': 'belt_degree',
            'belt': 'belt_degree',
            'درجة_الحزام': 'belt_degree',
            'degree': 'Degree',
            'education_level': 'Degree',
            'المستوى_الدراسي': 'Degree',
            'category': 'category',
            'الفئة': 'category',
            'tall': 'tall',
            'height': 'tall',
            'الطول_سم': 'tall',
            'الطول_(سم)': 'tall',
            'weight': 'weight',
            'الوزن_كلغ': 'weight',
            'الوزن_(كلغ)': 'weight',
            'started_day': 'started_day',
            'start_date': 'started_day',
            'تاريخ_البداية': 'started_day',
            'is_active': 'is_active',
            'status': 'is_active',
            'الحالة': 'is_active',
        }
        gender_values = {
            'male': 'male',
            'm': 'male',
            'masculin': 'male',
            'homme': 'male',
            'ذكر': 'male',
            'female': 'female',
            'f': 'female',
            'féminin': 'female',
            'feminin': 'female',
            'femme': 'female',
            'أنثى': 'female',
            'انثى': 'female',
        }
        active_values = {
            'true': True,
            'yes': True,
            'active': True,
            'نعم': True,
            'نشط': True,
            'false': False,
            'no': False,
            'inactive': False,
            'لا': False,
            'غير_نشط': False,
        }
        category_values = {
            'kids': 'الصغار',
            'الصغار': 'الصغار',
            'boys': 'فتيان',
            'فتيان': 'فتيان',
            'youth': 'شبان',
            'شبان': 'شبان',
            'adults': 'كبار',
            'كبار': 'كبار',
            'women': 'نساء',
            'نساء': 'نساء',
        }
        date_fields = {'birth_day', 'started_day'}
        valid_rows = []
        row_errors = []

        try:
            rows = workbook.active.iter_rows(values_only=True)
            header_row = next(rows, ())
            columns = {}
            for index, value in enumerate(header_row):
                if value is not None:
                    header_parts = str(value).strip().casefold().replace('-', ' ').split('/')
                    normalized_headers = ['_'.join(part.split()) for part in header_parts]
                    field_name = next(
                        (header_aliases[header] for header in normalized_headers if header in header_aliases),
                        None,
                    )
                    if field_name:
                        columns[field_name] = index

            missing_headers = {'first_name', 'last_name', 'male_female'} - columns.keys()
            if missing_headers:
                missing = ', '.join(
                    {'first_name': 'first_name / الاسم الأول',
                     'last_name': 'last_name / اسم العائلة',
                     'male_female': 'gender / الجنس'}[field]
                    for field in ('first_name', 'last_name', 'male_female')
                    if field in missing_headers
                )
                return Response(
                    {'error': f'Missing required columns / الأعمدة المطلوبة غير موجودة: {missing}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            for row_number, row in enumerate(rows, start=2):
                if not any(value is not None and str(value).strip() for value in row):
                    continue

                data = {}
                for field_name, column_index in columns.items():
                    if column_index >= len(row) or row[column_index] is None:
                        continue
                    value = row[column_index]
                    if isinstance(value, str):
                        value = value.strip()
                    if value == '':
                        continue
                    if field_name in date_fields and hasattr(value, 'date'):
                        value = value.date()
                    if field_name == 'male_female':
                        gender_text = str(value).strip().casefold()
                        value = gender_values.get(gender_text, gender_text)
                    elif field_name == 'is_active':
                        active_text = '_'.join(str(value).strip().casefold().split())
                        value = active_values.get(active_text, value)
                    elif field_name == 'category':
                        category_text = str(value).strip().casefold()
                        value = category_values.get(category_text, value)
                    data[field_name] = value

                gender_text = str(data.get('male_female', '')).strip().casefold()
                gender = gender_values.get(gender_text)
                data['male_female'] = gender
                data.setdefault('category', 'كبار')
                data.setdefault('birth_day', None)
                serializer = TrainerCreateSerializer(data=data)
                if gender is None:
                    row_errors.append({
                        'row': row_number,
                        'errors': {'الجنس / gender': ['اكتب male أو female أو ذكر أو أنثى.']},
                    })
                elif not serializer.is_valid():
                    field_labels = {
                        'first_name': 'الاسم الأول',
                        'last_name': 'اسم العائلة',
                        'birth_day': 'تاريخ الميلاد',
                        'phone': 'الهاتف',
                        'phone_parent': 'هاتف ولي الأمر',
                        'email': 'البريد الإلكتروني',
                        'CIN': 'رقم البطاقة الوطنية',
                        'address': 'العنوان',
                        'male_female': 'الجنس',
                        'belt_degree': 'درجة الحزام',
                        'Degree': 'المستوى الدراسي',
                        'category': 'الفئة',
                        'tall': 'الطول',
                        'weight': 'الوزن',
                        'started_day': 'تاريخ البداية',
                        'is_active': 'الحالة',
                    }
                    translated_errors = {}
                    for field, errors in serializer.errors.items():
                        message_text = ' '.join(str(error) for error in errors).casefold()
                        if 'required' in message_text:
                            translated_message = 'هذا الحقل مطلوب.'
                        elif 'valid choice' in message_text:
                            translated_message = 'القيمة غير صالحة. راجع القيم المتاحة في قالب Excel.'
                        elif 'date' in message_text or 'iso format' in message_text:
                            translated_message = 'التاريخ غير صالح. استخدم الصيغة YYYY-MM-DD.'
                        elif 'number' in message_text or 'decimal' in message_text:
                            translated_message = 'أدخل رقماً صالحاً.'
                        elif 'email' in message_text:
                            translated_message = 'أدخل بريداً إلكترونياً صالحاً.'
                        elif 'characters' in message_text or 'length' in message_text:
                            translated_message = 'القيمة تتجاوز الحد المسموح.'
                        else:
                            translated_message = 'القيمة غير صالحة. تحقق من هذا الحقل.'
                        translated_errors[f'{field_labels.get(field, field)} / {field}'] = [translated_message]
                    row_errors.append({
                        'row': row_number,
                        'errors': translated_errors,
                    })
                else:
                    valid_rows.append(serializer)
        except (InvalidFileException, BadZipFile):
            return Response(
                {'error': 'The uploaded file is not a valid .xlsx workbook. / ملف Excel غير صالح.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        finally:
            workbook.close()

        if row_errors:
            return Response(
                {
                    'error': 'No trainees were imported. Fix the rows listed and upload the file again. / لم يتم استيراد المتدربين. صحح الصفوف المذكورة ثم أعد رفع الملف.',
                    'rows': row_errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not valid_rows:
            return Response(
                {'error': 'The workbook contains no trainee rows. / لا يحتوي الملف على صفوف متدربين.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization = self.get_organization()
        with transaction.atomic():
            for serializer in valid_rows:
                serializer.save(organization=organization)
        return Response({'created': len(valid_rows)}, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        org = self.get_organization()
        qs = self.queryset.filter(organization=org)

        # Filter by active/inactive
        is_active = self.request.query_params.get('is_active')
        if is_active is not None and is_active.lower() != 'all':
            qs = qs.filter(is_active=is_active.lower() == 'true')

        # Filter by category
        category = self.request.query_params.get('category')
        if category and category != 'all':
            qs = qs.filter(category=category)

        return qs


class PaymentViewSet(BaseOrganizationViewSet):
    queryset = Payments.objects.all().select_related('trainer')
    serializer_class = PaymentSerializer

    def get_queryset(self):
        org = self.get_organization()
        qs = self.queryset.filter(organization=org)

        # Filter by category
        cat = self.request.query_params.get('paymentCategry')
        if cat and cat != 'all':
            qs = qs.filter(paymentCategry=cat)

        # Filter by date range
        start = self.request.query_params.get('start_date')
        end = self.request.query_params.get('end_date')
        if start:
            qs = qs.filter(paymentdate__gte=start)
        if end:
            qs = qs.filter(paymentdate__lte=end)

        # Filter by trainer
        trainer_id = self.request.query_params.get('trainer')
        if trainer_id:
            qs = qs.filter(trainer_id=trainer_id)

        return qs

    @action(detail=False, methods=['get'], url_path='export/docx')
    def export_docx(self, request):
        organization = self.get_organization()
        category = request.query_params.get('paymentCategry', 'all')
        trainer_id = request.query_params.get('trainer')
        status_filter = request.query_params.get('status', 'paid')

        valid_categories = {value for value, _ in Payments.CatChoices}
        if category != 'all' and category not in valid_categories:
            return Response({'error': 'Invalid payment category.'}, status=status.HTTP_400_BAD_REQUEST)
        if status_filter not in {'paid', 'unpaid'}:
            return Response({'error': 'Status must be paid or unpaid.'}, status=status.HTTP_400_BAD_REQUEST)

        start_value = request.query_params.get('start_date')
        end_value = request.query_params.get('end_date')
        start_date = parse_date(start_value) if start_value else None
        end_date = parse_date(end_value) if end_value else None
        if (start_value and start_date is None) or (end_value and end_date is None):
            return Response({'error': 'Dates must use YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)

        if status_filter == 'unpaid' and not start_date and not end_date:
            today = timezone.localdate()
            start_date = today.replace(day=1)
            end_date = today.replace(day=calendar.monthrange(today.year, today.month)[1])

        if start_date and end_date and start_date > end_date:
            return Response({'error': 'From date must be on or before To date.'}, status=status.HTTP_400_BAD_REQUEST)

        if status_filter == 'paid':
            payments = Payments.objects.filter(organization=organization).select_related('trainer')
            if category != 'all':
                payments = payments.filter(paymentCategry=category)
            if trainer_id:
                payments = payments.filter(trainer_id=trainer_id)
            if start_date:
                payments = payments.filter(paymentdate__gte=start_date)
            if end_date:
                payments = payments.filter(paymentdate__lte=end_date)
            records = list(payments.order_by('paymentdate', 'trainer__last_name', 'trainer__first_name'))
        else:
            trainers = Trainer.objects.filter(organization=organization, is_active=True)
            if trainer_id:
                trainers = trainers.filter(pk=trainer_id)
            matching_payments = Payments.objects.filter(
                organization=organization,
                trainer_id=OuterRef('pk'),
            )
            if category != 'all':
                matching_payments = matching_payments.filter(paymentCategry=category)
            if start_date:
                matching_payments = matching_payments.filter(paymentdate__gte=start_date)
            if end_date:
                matching_payments = matching_payments.filter(paymentdate__lte=end_date)
            records = list(
                trainers.annotate(has_matching_payment=Exists(matching_payments))
                .filter(has_matching_payment=False)
                .order_by('last_name', 'first_name')
            )

        document = Document()
        section = document.sections[0]
        section.top_margin = Inches(0.55)
        section.bottom_margin = Inches(0.55)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)

        def set_arabic_paragraph(paragraph, alignment=WD_ALIGN_PARAGRAPH.RIGHT):
            paragraph.alignment = alignment
            paragraph_properties = paragraph._p.get_or_add_pPr()
            bidi = OxmlElement('w:bidi')
            bidi.set(qn('w:val'), '1')
            paragraph_properties.append(bidi)

        def set_arabic_run(run, *, bold=False, size=11, color=None):
            run.bold = bold
            run.font.name = 'Arial'
            run.font.size = Pt(size)
            if color:
                run.font.color.rgb = RGBColor(*color)
            run_properties = run._element.get_or_add_rPr()
            fonts = run_properties.rFonts
            if fonts is None:
                fonts = OxmlElement('w:rFonts')
                run_properties.insert(0, fonts)
            fonts.set(qn('w:ascii'), 'Arial')
            fonts.set(qn('w:hAnsi'), 'Arial')
            fonts.set(qn('w:cs'), 'Arial')
            rtl = OxmlElement('w:rtl')
            rtl.set(qn('w:val'), '1')
            run_properties.append(rtl)

        def set_cell_fill(cell, fill):
            cell_properties = cell._tc.get_or_add_tcPr()
            shading = OxmlElement('w:shd')
            shading.set(qn('w:fill'), fill)
            cell_properties.append(shading)

        def set_repeat_table_header(row):
            row_properties = row._tr.get_or_add_trPr()
            repeat = OxmlElement('w:tblHeader')
            repeat.set(qn('w:val'), 'true')
            row_properties.append(repeat)

        if organization.logo:
            with organization.logo.open('rb') as logo_file:
                logo_paragraph = document.add_paragraph()
                set_arabic_paragraph(logo_paragraph, WD_ALIGN_PARAGRAPH.CENTER)
                logo_paragraph.add_run().add_picture(logo_file, width=Inches(1.25))

        heading = document.add_paragraph()
        set_arabic_paragraph(heading, WD_ALIGN_PARAGRAPH.CENTER)
        set_arabic_run(heading.add_run(organization.name), bold=True, size=18, color=(44, 62, 80))

        category_label = (
            dict(Payments.CatChoices).get(category, 'جميع الفئات')
            if category != 'all' else 'جميع الفئات'
        )
        status_label = 'لائحة الأداءات المسجلة' if status_filter == 'paid' else 'لائحة غير المؤدين'
        title = document.add_paragraph()
        set_arabic_paragraph(title, WD_ALIGN_PARAGRAPH.CENTER)
        set_arabic_run(title.add_run(status_label), bold=True, size=15, color=(60, 120, 231))

        category_paragraph = document.add_paragraph()
        set_arabic_paragraph(category_paragraph)
        set_arabic_run(category_paragraph.add_run(f'نوع الأداء: {category_label}'), bold=True)

        if start_date or end_date:
            period_paragraph = document.add_paragraph()
            set_arabic_paragraph(period_paragraph)
            set_arabic_run(
                period_paragraph.add_run(
                    f'الفترة: {start_date.strftime("%Y/%m/%d") if start_date else "—"}'
                    f' إلى {end_date.strftime("%Y/%m/%d") if end_date else "—"}'
                ),
            )

        table = document.add_table(rows=1, cols=7)
        table.style = 'Table Grid'
        table_properties = table._tbl.tblPr
        table_direction = OxmlElement('w:bidiVisual')
        table_direction.set(qn('w:val'), '1')
        table_properties.append(table_direction)
        headers = [
            'الترتيب',
            'النسب',
            'الاسم الشخصي',
            'رقم البطاقة الوطنية',
            'تاريخ الازدياد',
            'تاريخ الأداء',
            'المبلغ (درهم)',
        ]
        for cell, label in zip(table.rows[0].cells, headers):
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_fill(cell, '2C3E50')
            paragraph = cell.paragraphs[0]
            set_arabic_paragraph(paragraph, WD_ALIGN_PARAGRAPH.CENTER)
            set_arabic_run(paragraph.add_run(label), bold=True, size=9, color=(255, 255, 255))
        set_repeat_table_header(table.rows[0])

        total_amount = 0
        for index, record in enumerate(records, start=1):
            row = table.add_row().cells
            if status_filter == 'paid':
                total_amount += record.paymentAmount
                values = [
                    str(index),
                    record.trainer.last_name,
                    record.trainer.first_name,
                    record.trainer.CIN or '—',
                    record.trainer.birth_day.strftime('%Y/%m/%d') if record.trainer.birth_day else '—',
                    record.paymentdate.strftime('%Y/%m/%d'),
                    f'{record.paymentAmount:.2f}',
                ]
            else:
                values = [
                    str(index),
                    record.last_name,
                    record.first_name,
                    record.CIN or '—',
                    record.birth_day.strftime('%Y/%m/%d') if record.birth_day else '—',
                    '—',
                    'غير مدفوع',
                ]
            for cell, value in zip(row, values):
                cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
                paragraph = cell.paragraphs[0]
                set_arabic_paragraph(paragraph, WD_ALIGN_PARAGRAPH.CENTER)
                set_arabic_run(paragraph.add_run(str(value)), size=9)

        summary = document.add_paragraph()
        set_arabic_paragraph(summary)
        if status_filter == 'paid':
            set_arabic_run(summary.add_run(f'مجموع الأداءات: {total_amount:.2f} درهم'), bold=True)
        count_paragraph = document.add_paragraph()
        set_arabic_paragraph(count_paragraph)
        set_arabic_run(count_paragraph.add_run(f'عدد السجلات: {len(records)}'))

        output = BytesIO()
        document.save(output)
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        response['Content-Disposition'] = (
            f'attachment; filename="nadik-payments-{status_filter}-{category}.docx"'
        )
        return response

    @action(detail=True, methods=['get'], url_path='invoice')
    def invoice(self, request, pk=None):
        payment = self.get_object()
        return download_payment_invoice(request, payment.pk)


class ArticleViewSet(BaseOrganizationViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer

    def get_queryset(self):
        org = self.get_organization()
        qs = self.queryset.filter(organization=org)
        category = self.request.query_params.get('category')
        if category and category != 'all':
            qs = qs.filter(category=category)
        return qs


class CostsViewSet(BaseOrganizationViewSet):
    queryset = Costs.objects.all()
    serializer_class = CostsSerializer


class AddedpayViewSet(BaseOrganizationViewSet):
    queryset = Addedpay.objects.all()
    serializer_class = AddedpaySerializer


class TrainerDocumentsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActive]

    def _get_trainer(self, request, trainer_pk):
        try:
            staff = Staff.objects.select_related('organization').get(user=request.user)
        except Staff.DoesNotExist:
            raise PermissionDenied('You do not belong to any organization.')
        return get_object_or_404(Trainer, pk=trainer_pk, organization=staff.organization)

    def get(self, request, trainer_pk):
        trainer = self._get_trainer(request, trainer_pk)
        documents = TrainerDocument.objects.filter(trainer=trainer).order_by('-uploaded_at')
        serializer = TrainerDocumentSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, trainer_pk):
        trainer = self._get_trainer(request, trainer_pk)
        payload = request.data.copy()
        payload['trainer'] = trainer.pk
        serializer = TrainerDocumentSerializer(data=payload, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TrainerDocumentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActive]

    def delete(self, request, trainer_pk, pk):
        try:
            staff = Staff.objects.select_related('organization').get(user=request.user)
        except Staff.DoesNotExist:
            raise PermissionDenied('You do not belong to any organization.')
        document = get_object_or_404(
            TrainerDocument,
            pk=pk,
            trainer_id=trainer_pk,
            trainer__organization=staff.organization,
        )
        document.file.delete(save=False)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Dashboard Stats API ────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsOrganizationActive])
def dashboard_stats(request):
    """Return dashboard KPIs for the logged-in user's organization."""
    try:
        staff = Staff.objects.select_related('organization').get(user=request.user)
        org = staff.organization
    except Staff.DoesNotExist:
        return Response({'error': 'No organization found'}, status=403)

    cache_key = f'nadik:dashboard:v2:organization:{org.pk}'
    user_cache_key = f'nadik:dashboard:v2:user:{request.user.pk}'
    cached_stats = cache.get(user_cache_key) or cache.get(cache_key)
    if cached_stats is not None:
        return Response(cached_stats)

    today = timezone.now().date()
    current_month_start = today.replace(day=1)
    month_start_datetime = timezone.make_aware(
        datetime.combine(current_month_start, datetime.min.time())
    )
    tomorrow_datetime = timezone.make_aware(
        datetime.combine(today + timedelta(days=1), datetime.min.time())
    )

    # Aggregate the member KPIs in one query. The paid-members subquery stays in
    # SQL, avoiding a separate round trip and avoiding loading IDs into Python.
    paid_ids = Payments.objects.filter(
        organization=org,
        paymentCategry='month',
        paymentdate__gte=current_month_start,
    ).values('trainer_id').distinct()
    member_counts = Trainer.objects.filter(organization=org).aggregate(
        total_members=Count('id', filter=Q(is_active=True)),
        inactive_members=Count('id', filter=Q(is_active=False)),
        unpaid_count=Count(
            'id',
            filter=Q(is_active=True) & ~Q(id__in=paid_ids),
        ),
        new_members=Count('id', filter=Q(started_day__gte=current_month_start)),
    )

    # Counts for the smaller related tables remain separate to avoid a
    # many-to-many join multiplying aggregate results.
    total_staff = Staff.objects.filter(organization=org).count()
    total_articles = Article.objects.filter(organization=org).count()

    # Both payment KPIs come from one aggregate query.
    payment_totals = Payments.objects.filter(organization=org).aggregate(
        month_income=Sum(
            Case(
                When(paymentdate__gte=current_month_start, paymentdate__lte=today, then=F('paymentAmount')),
                default=Value(0),
                output_field=DecimalField(max_digits=10, decimal_places=2),
            )
        ),
        today_income=Sum(
            Case(
                When(paymentdate=today, then=F('paymentAmount')),
                default=Value(0),
                output_field=DecimalField(max_digits=10, decimal_places=2),
            )
        ),
    )

    # Expenses this month
    month_expenses = Costs.objects.filter(
        organization=org,
        date__gte=month_start_datetime,
        date__lt=tomorrow_datetime,
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Additional payments this month
    month_added = Addedpay.objects.filter(
        organization=org,
        date__gte=month_start_datetime,
        date__lt=tomorrow_datetime,
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Subscription info
    sub_info = {
        'status': org.subscription_status,
        'days_remaining': org.days_remaining,
        'is_active': org.is_active,
    }

    stats = {
        'total_members': member_counts['total_members'],
        'inactive_members': member_counts['inactive_members'],
        'total_staff': total_staff,
        'total_articles': total_articles,
        'month_income': float(payment_totals['month_income'] or 0),
        'today_income': float(payment_totals['today_income'] or 0),
        'month_expenses': float(month_expenses),
        'month_added_payments': float(month_added),
        'unpaid_count': member_counts['unpaid_count'],
        'new_members': member_counts['new_members'],
        'subscription': sub_info,
        'organization_name': org.name,
    }
    # Dashboard numbers do not need a new remote query on every navigation.
    # Keep this short so normal changes become visible quickly without making
    # the remote database the bottleneck for repeated page loads.
    cache.set(cache_key, stats, timeout=10)
    cache.set(user_cache_key, stats, timeout=10)
    return Response(stats)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsOrganizationActive])
def unpaid_members(request):
    """Return list of members who haven't paid monthly for a given month/year."""
    try:
        staff = Staff.objects.select_related('organization').get(user=request.user)
        org = staff.organization
    except Staff.DoesNotExist:
        return Response({'error': 'No organization found'}, status=403)

    today = timezone.now().date()
    year = int(request.query_params.get('year', today.year))
    month = int(request.query_params.get('month', today.month))

    start_date = today.replace(year=year, month=month, day=1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = today.replace(year=year, month=month, day=last_day)

    paid_ids = Payments.objects.filter(
        organization=org,
        paymentCategry='month',
        paymentdate__gte=start_date,
        paymentdate__lte=end_date,
    ).values_list('trainer_id', flat=True).distinct()

    unpaid = Trainer.objects.filter(
        organization=org, is_active=True
    ).exclude(id__in=paid_ids).values(
        'id', 'first_name', 'last_name', 'phone', 'category'
    )

    return Response({
        'year': year,
        'month': month,
        'unpaid': list(unpaid),
        'count': len(unpaid),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsOrganizationActive])
def financial_summary(request):
    """Return financial overview for the organization."""
    try:
        staff = Staff.objects.select_related('organization').get(user=request.user)
        org = staff.organization
    except Staff.DoesNotExist:
        return Response({'error': 'No organization found'}, status=403)

    today = timezone.now().date()
    year = int(request.query_params.get('year', today.year))

    amount_field = DecimalField(max_digits=14, decimal_places=2)
    yearly_payments = Payments.objects.filter(organization=org, paymentdate__year=year)
    yearly_added = Addedpay.objects.filter(organization=org, date__year=year)
    yearly_costs = Costs.objects.filter(organization=org, date__year=year)
    yearly_articles = Article.objects.filter(organization=org, date__year=year).annotate(
        participant_count=Count('trainees', distinct=True),
    )

    payment_total = yearly_payments.aggregate(total=Sum('paymentAmount'))['total'] or 0
    added_total = yearly_added.aggregate(total=Sum('amount'))['total'] or 0
    operating_cost_total = yearly_costs.aggregate(total=Sum('amount'))['total'] or 0
    article_totals = yearly_articles.aggregate(
        participation_income=Sum(F('participetion_price') * F('participant_count'), output_field=amount_field),
        costs=Sum('costs'),
    )
    event_income_total = article_totals['participation_income'] or 0
    event_cost_total = article_totals['costs'] or 0

    # Monthly income and expense series for report charts.
    monthly_income = []
    monthly_breakdown = []
    for m in range(1, 13):
        payments_income = yearly_payments.filter(paymentdate__month=m).aggregate(total=Sum('paymentAmount'))['total'] or 0
        additional_income = yearly_added.filter(date__month=m).aggregate(total=Sum('amount'))['total'] or 0
        operating_expenses = yearly_costs.filter(date__month=m).aggregate(total=Sum('amount'))['total'] or 0
        article_month = yearly_articles.filter(date__month=m).aggregate(
            participation_income=Sum(F('participetion_price') * F('participant_count'), output_field=amount_field),
            costs=Sum('costs'),
        )
        event_income = article_month['participation_income'] or 0
        event_expenses = article_month['costs'] or 0
        month_income = payments_income + additional_income + event_income
        month_expenses = operating_expenses + event_expenses
        monthly_income.append({'month': m, 'income': float(month_income)})
        monthly_breakdown.append({
            'month': m,
            'income': float(month_income),
            'payments': float(payments_income),
            'additional_income': float(additional_income),
            'event_income': float(event_income),
            'expenses': float(month_expenses),
            'operating_expenses': float(operating_expenses),
            'event_expenses': float(event_expenses),
            'net': float(month_income - month_expenses),
        })

    total_income = payment_total + added_total + event_income_total

    # Project recurring salary and rent commitments into the selected year.
    year_start = datetime(year, 1, 1).date()
    year_end = datetime(year, 12, 31).date()
    total_salaries = 0
    for salary, started in Staff.objects.filter(organization=org).values_list('salary', 'started'):
        started_date = started.date() if isinstance(started, datetime) else started
        salary_months = 12 if started_date.year < year else 13 - started_date.month if started_date.year == year else 0
        total_salaries += salary * salary_months

    rent = 0
    rent_date = org.datepay.date() if isinstance(org.datepay, datetime) else org.datepay
    if org.rent_amount and rent_date:
        while rent_date <= year_end:
            if rent_date >= year_start:
                rent += org.rent_amount
            rent_date += timedelta(days=calendar.monthrange(rent_date.year, rent_date.month)[1])

    total_expenses = operating_cost_total + event_cost_total + total_salaries + rent
    rent = float(rent)

    return Response({
        'year': year,
        'monthly_income': monthly_income,
        'monthly_breakdown': monthly_breakdown,
        'total_income': float(total_income),
        'total_expenses': float(total_expenses),
        'total_added_payments': float(added_total),
        'income_breakdown': {
            'payments': float(payment_total),
            'additional_payments': float(added_total),
            'events': float(event_income_total),
        },
        'expense_breakdown': {
            'operating': float(operating_cost_total),
            'events': float(event_cost_total),
            'salaries': float(total_salaries),
            'rent': rent,
        },
        'total_salaries': float(total_salaries),
        'rent': rent,
        'net_profit': float(total_income) - float(total_expenses),
    })
