"""
Nadik Custom DRF Permissions
"""
from rest_framework.permissions import BasePermission
from trainers.models import Staff


class IsOrganizationMember(BasePermission):
    """
    Allows access only to users who have a Staff record
    (i.e., are linked to an organization).
    Sets request.organization and request.staff as a side effect.
    """
    message = 'You must be linked to an organization to perform this action.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers bypass org check
        if request.user.is_superuser:
            return True

        # Check for Staff record (may already be set by OrganizationMiddleware)
        if hasattr(request, 'organization') and request.organization is not None:
            return True

        # Fallback: look up directly
        try:
            staff = Staff.objects.select_related('organization').get(user=request.user)
            if not staff.organization.is_active:
                self.message = 'This organization is suspended. Contact the platform administrator.'
                return False
            request.organization = staff.organization
            request.staff = staff
            return True
        except Staff.DoesNotExist:
            return False


class IsOrganizationActive(BasePermission):
    """Block organization users while their organization is suspended."""
    message = 'This organization is suspended. Contact the platform administrator.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or request.user.is_superuser:
            return True
        try:
            staff = Staff.objects.select_related('organization').get(user=request.user)
        except Staff.DoesNotExist:
            return True
        return staff.organization.is_active


class IsOrganizationAdmin(IsOrganizationMember):
    """
    Allows access only to organization admins (staff.is_admin=True).
    """
    message = 'You must be an organization administrator to perform this action.'

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if request.user.is_superuser:
            return True

        staff = getattr(request, 'staff', None)
        if staff is None:
            try:
                staff = Staff.objects.get(user=request.user)
                request.staff = staff
            except Staff.DoesNotExist:
                return False

        return staff.is_admin


class BelongsToOrganization(BasePermission):
    """
    Object-level permission: ensures the object belongs to request.organization.
    Use this with get_object() checks.
    """
    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        org = getattr(request, 'organization', None)
        if org is None:
            return False

        # Support models with direct organization FK
        obj_org = getattr(obj, 'organization', None)
        if obj_org is not None:
            return obj_org.id == org.id

        # Support models with trainer->organization (e.g., TrainerDocument)
        trainer = getattr(obj, 'trainer', None)
        if trainer is not None:
            return getattr(trainer, 'organization_id', None) == org.id

        return False
