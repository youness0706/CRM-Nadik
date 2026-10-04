"""
Nadik View Mixins
Shared behavior for organization-scoped API views.
"""
from rest_framework.response import Response
from rest_framework import status


class OrganizationQuerysetMixin:
    """
    Mixin for ViewSets that automatically scopes querysets to the
    current user's organization.
    
    Usage:
        class MyViewSet(OrganizationQuerysetMixin, ModelViewSet):
            queryset = MyModel.objects.all()
            ...
    
    The mixin overrides get_queryset() to always filter by organization.
    Subclasses can override `organization_field` to customize the lookup
    (default: 'organization').
    """
    organization_field = 'organization'

    def get_queryset(self):
        qs = super().get_queryset()
        org = getattr(self.request, 'organization', None)
        if org is None:
            return qs.none()
        return qs.filter(**{self.organization_field: org})


class SuccessResponseMixin:
    """Adds success=True wrapper to 200/201 responses."""

    def success_response(self, data=None, status_code=status.HTTP_200_OK, message=None):
        payload = {'success': True}
        if message:
            payload['message'] = message
        if data is not None:
            payload['data'] = data
        return Response(payload, status=status_code)
