from rest_framework import serializers
from trainers.models import Staff, Trainer, Payments, Article, Costs, Addedpay, TrainerDocument

class StaffSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = Staff
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 'is_admin', 'started', 'salary', 'datepay', 'email', 'phone_number']


class TrainerSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()

    class Meta:
        model = Trainer
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'age',
            'birth_day', 'phone', 'phone_parent', 'email', 'CIN',
            'address', 'male_female', 'belt_degree', 'Degree',
            'category', 'tall', 'weight', 'started_day', 'is_active', 'image',
        ]
        read_only_fields = ['organization']


class TrainerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating trainers with writable fields."""
    class Meta:
        model = Trainer
        fields = [
            'first_name', 'last_name', 'birth_day', 'phone', 'phone_parent',
            'email', 'CIN', 'address', 'male_female', 'belt_degree', 'Degree',
            'category', 'tall', 'weight', 'started_day', 'is_active', 'image',
        ]


class PaymentSerializer(serializers.ModelSerializer):
    trainer_name = serializers.CharField(source='trainer.first_name', read_only=True)
    trainer_surname = serializers.CharField(source='trainer.last_name', read_only=True)
    category_display = serializers.CharField(source='get_paymentCategry_display', read_only=True)

    class Meta:
        model = Payments
        fields = [
            'id', 'trainer', 'trainer_name', 'trainer_surname',
            'paymentdate', 'paymentCategry', 'category_display', 'paymentAmount',
        ]
        read_only_fields = ['organization']


class ArticleSerializer(serializers.ModelSerializer):
    trainees_count = serializers.SerializerMethodField()
    profit = serializers.ReadOnlyField()
    net_profit = serializers.ReadOnlyField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    area_display = serializers.CharField(source='get_area_display', read_only=True)

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'date', 'location', 'content',
            'category', 'category_display', 'area', 'area_display',
            'costs', 'participetion_price', 'trainees', 'trainees_count',
            'profit', 'net_profit',
        ]
        read_only_fields = ['organization']

    def get_trainees_count(self, obj):
        return obj.trainees.count()


class CostsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Costs
        fields = ['id', 'cost', 'desc', 'amount', 'date', 'is_recurring']
        read_only_fields = ['organization']


class AddedpaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Addedpay
        fields = ['id', 'title', 'desc', 'amount', 'date']
        read_only_fields = ['organization']


class TrainerDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerDocument
        fields = ['id', 'trainer', 'document_type', 'file', 'uploaded_at']
        read_only_fields = ['uploaded_at']
