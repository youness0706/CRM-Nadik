"""
Nadik Custom Exception Handler
All API errors return a consistent JSON structure.
"""
from rest_framework.views import exception_handler
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def nadik_exception_handler(exc, context):
    """
    Custom exception handler that wraps all errors in a
    consistent JSON envelope:
    {
        "success": false,
        "error": "Human-readable message",
        "detail": { ... }  // Optional validation details
    }
    """
    # Call DRF's default handler first to get the Response object
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            'success': False,
            'error': _get_error_message(exc, response),
        }

        # Include field-level validation errors
        if isinstance(exc, ValidationError) and isinstance(response.data, dict):
            error_data['detail'] = response.data

        response.data = error_data
    else:
        # Unhandled exception — log it
        logger.exception(
            'Unhandled exception in view %s',
            context.get('view', 'unknown'),
            exc_info=exc
        )
        response = Response(
            {
                'success': False,
                'error': 'An unexpected server error occurred.',
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response


def _get_error_message(exc, response) -> str:
    """Extract a human-readable error message."""
    if hasattr(exc, 'detail'):
        detail = exc.detail
        if isinstance(detail, list) and detail:
            return str(detail[0])
        if isinstance(detail, dict):
            # Return first field error
            for key, value in detail.items():
                if isinstance(value, list):
                    return f"{key}: {value[0]}"
                return f"{key}: {value}"
        return str(detail)
    return str(exc)
