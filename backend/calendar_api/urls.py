from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from events.views import (
    register, profile,
    google_auth_url, google_callback, google_sync_now, google_status, google_disconnect,
    google_login_url, google_login_callback,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("events.urls")),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/register/", register, name="register"),
    path("api/auth/profile/", profile, name="profile"),
    path("api/auth/google/", google_auth_url, name="google_auth_url"),
    path("api/auth/google/callback/", google_callback, name="google_callback"),
    path("api/auth/google/login/", google_login_url, name="google_login_url"),
    path("api/auth/google/login/callback/", google_login_callback, name="google_login_callback"),
    path("api/google/sync/", google_sync_now, name="google_sync"),
    path("api/google/status/", google_status, name="google_status"),
    path("api/google/disconnect/", google_disconnect, name="google_disconnect"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)