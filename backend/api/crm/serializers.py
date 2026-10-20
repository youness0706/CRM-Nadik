from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers
from trainers.models import Staff, Trainer, Payments, Article, Costs, Addedpay, TrainerDocument

class StaffSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    email = serializers.EmailField(source='user.email')
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Staff
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'password', 'role', 'is_admin', 'started', 'salary', 'datepay', 'phone_number']
        read_only_fields = ['organization']

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'A password is required for new staff accounts.'})
        return attrs

    def validate_username(self, value):
        users = User.objects.filter(username=value)
        if self.instance:
            users = users.exclude(pk=self.instance.user_id)
        if users.exists():
            raise serializers.ValidationError('This username is already in use.')
        return value

    def to_representation(self, instance):
        """Coerce datetime→date on instance before DRF DateField serializes it.
        The model uses default=timezone.now which produces a datetime, but the
        column is DateField. DRF's DateField.to_representation asserts the value
        is not a datetime, so we must convert it first."""
        import datetime as dt
        for field_name in ('started', 'datepay'):
            val = getattr(instance, field_name, None)
            if isinstance(val, dt.datetime):
                setattr(instance, field_name, val.date())
        return super().to_representation(instance)

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = validated_data.pop('password', None)
        
        user = User(
            username=user_data.get('username'),
            email=user_data.get('email'),
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name', '')
        )
        if password:
            user.set_password(password)
        user.save()
        
        staff = Staff.objects.create(user=user, **validated_data)
        return staff

    def update(self, instance, validated_data):
        if 'user' in validated_data:
            user_data = validated_data.pop('user')
            user = instance.user
            user.username = user_data.get('username', user.username)
            user.email = user_data.get('email', user.email)
            user.first_name = user_data.get('first_name', user.first_name)
            user.last_name = user_data.get('last_name', user.last_name)
            user.save()
            
        password = validated_data.pop('password', None)
        if password:
            instance.user.set_password(password)
            instance.user.save()
            
        return super().update(instance, validated_data)


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
            'id', 'first_name', 'last_name', 'birth_day', 'phone', 'phone_parent',
            'email', 'CIN', 'address', 'male_female', 'belt_degree', 'Degree',
            'category', 'tall', 'weight', 'started_day', 'is_active', 'image',
        ]
        read_only_fields = ['id']


class PaymentSerializer(serializers.ModelSerializer):
    trainer = serializers.PrimaryKeyRelatedField(queryset=Trainer.objects.all())
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

    def validate_trainer(self, trainer):
        request = self.context.get('request')
        if request:
            try:
                organization_id = Staff.objects.get(user=request.user).organization_id
            except Staff.DoesNotExist:
                raise serializers.ValidationError('You do not belong to an organization.')
            if trainer.organization_id != organization_id:
                raise serializers.ValidationError('Member does not belong to your organization.')
        return trainer


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
