"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.http import HttpResponse, Http404
from django.urls import path, include, re_path
from django.conf import settings
from django.views.decorators.cache import never_cache
from django.views.static import serve


@never_cache
def spa_index_view(request):
    """Serve the built React SPA index.html for client-side routes."""
    index_path = getattr(settings, 'FRONTEND_DIST_DIR', None)
    if index_path is not None:
        index_file = index_path / 'index.html'
        if index_file.exists():
            return HttpResponse(index_file.read_bytes(), content_type='text/html; charset=utf-8')
    raise Http404('Frontend build not found. Run npm run build in Frontend/.')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('erp.urls')),
]

if settings.DEBUG or getattr(settings, 'SERVE_MEDIA', False):
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]

if getattr(settings, 'FRONTEND_DIST_DIR', None) and (settings.FRONTEND_DIST_DIR / 'index.html').exists():
    urlpatterns += [
        re_path(r'^(?!api/|admin/|media/|static/|assets/).*$', spa_index_view, name='spa-index'),
    ]
