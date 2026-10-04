import os
import django
from django.core.management import call_command

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "crm_back.settings")
django.setup()

from django.contrib.auth.models import User
from trainers.models import OrganizationInfo, Staff

def setup():
    # Run migrations first
    
    call_command("migrate")

    # 1. Create superuser (Admin who can see all organizations in django admin)
    admin_username = "admin"
    admin_password = "adminpassword123"
    
    if not User.objects.filter(username=admin_username).exists():
        User.objects.create_superuser(
            username=admin_username,
            email="admin@example.com",
            password=admin_password
        )
        print(f"Created Superuser: {admin_username} / {admin_password}")
    else:
        print(f"Superuser '{admin_username}' already exists.")

    # 2. Create a test organization
    org_name = "Test Organization"
    org, created = OrganizationInfo.objects.get_or_create(
        name=org_name,
        defaults={
            "slug": "test-org",
            "subscription_tier": "premium",
            "max_trainers": 100,
            "subscription_status": "active"
        }
    )
    if created:
        print(f"Created Organization: {org.name}")
    else:
        print(f"Organization '{org.name}' already exists.")

    # 3. Create an organization user (Staff)
    org_username = "orguser"
    org_password = "orgpassword123"
    
    if not User.objects.filter(username=org_username).exists():
        org_user = User.objects.create_user(
            username=org_username,
            email="orguser@example.com",
            password=org_password
        )
        print(f"Created Organization User: {org_username} / {org_password}")
        
        # Link to organization
        Staff.objects.create(
            user=org_user,
            organization=org,
            role="Manager",
            is_admin=True
        )
        print(f"Linked {org_username} to {org.name} as Staff.")
    else:
        print(f"User '{org_username}' already exists.")

if __name__ == "__main__":
    setup()
    print("Database setup complete.")
