import threading

_thread_locals = threading.local()

def get_current_request():
    """Returns the current HTTP request object for the active thread."""
    return getattr(_thread_locals, 'request', None)

def get_current_user():
    """Returns the current authenticated User object for the active thread."""
    request = get_current_request()
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
    return None

def get_client_ip(request=None):
    """Extracts the client IP address from the HTTP request headers."""
    if not request:
        request = get_current_request()
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def get_user_agent(request=None):
    """Extracts the client User-Agent string."""
    if not request:
        request = get_current_request()
    if not request:
        return ''
    return request.META.get('HTTP_USER_AGENT', '')

def set_bulk_import_mode(active=True):
    """Flags current thread as running high-throughput bulk import to bypass per-row signal overhead."""
    _thread_locals.bulk_import = active

def is_bulk_import_mode():
    """Checks if current thread is executing in bulk import mode."""
    return getattr(_thread_locals, 'bulk_import', False)


class AuditLogMiddleware:
    """
    Middleware that captures request metadata for the active thread,
    enabling automatic audit logging across all database signals and views.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        try:
            response = self.get_response(request)
            return response
        finally:
            _thread_locals.request = None
