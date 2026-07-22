from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import OrderingFilter

class CustomOrderingFilter(OrderingFilter):
    def get_valid_fields(self, queryset, view, context={}):
        return [(field.name, field.verbose_name) for field in queryset.model._meta.fields]
        
    def get_default_ordering(self, view):
        ordering = getattr(view, 'ordering', None)
        if ordering:
            return ordering
        return ['-id']  # Fallback default



class OptionalPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'

    def paginate_queryset(self, queryset, request, view=None):
        if 'nopage' in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)
