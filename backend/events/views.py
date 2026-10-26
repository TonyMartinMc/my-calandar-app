from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth.models import User
from django.conf import settings
from datetime import timedelta
from .models import Event, Category, GoogleCalendarToken, UserProfile
from .serializers import EventSerializer, CategorySerializer
from . import google_sync


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(
            parent=None,
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer

    def get_queryset(self):
        queryset = Event.objects.select_related(
            "category__parent"
        ).filter(user=self.request.user)

        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")

        if start and end:
            from django.db.models import Q
            from django.utils.dateparse import parse_datetime

            start_dt = parse_datetime(start)
            end_dt = parse_datetime(end)
            start_date = start_dt.date() if start_dt else None

            if start_dt and end_dt:
                queryset = queryset.filter(
                    Q(recurrence__in=["daily", "weekly", "monthly", "custom"]) |
                    Q(start_time__gte=start_dt, start_time__lte=end_dt) |
                    Q(end_date__isnull=False, end_date__gte=start_date)
                )

        return queryset

    def perform_create(self, serializer):
        event = serializer.save(user=self.request.user)
        try:
            token = GoogleCalendarToken.objects.get(user=self.request.user)
            google_id = google_sync.push_event_to_google(event, token)
            if google_id:
                event.google_event_id = google_id
                event.save(update_fields=["google_event_id"])
        except GoogleCalendarToken.DoesNotExist:
            pass

    def perform_update(self, serializer):
        event = serializer.save()
        try:
            token = GoogleCalendarToken.objects.get(user=self.request.user)
            if event.google_event_id:
                google_sync.delete_event_from_google(event.google_event_id, token)
            google_id = google_sync.push_event_to_google(event, token)
            if google_id:
                event.google_event_id = google_id
                event.save(update_fields=["google_event_id"])
        except GoogleCalendarToken.DoesNotExist:
            pass

    def perform_destroy(self, instance):
        try:
            token = GoogleCalendarToken.objects.get(user=self.request.user)
            if instance.google_event_id:
                google_sync.delete_event_from_google(instance.google_event_id, token)
        except GoogleCalendarToken.DoesNotExist:
            pass
        instance.delete()

    @action(detail=False, methods=["get"], url_path="upcoming-reminders")
    def upcoming_reminders(self, request):
        now = timezone.now()
        window = now + timedelta(minutes=15)
        events = Event.objects.filter(
            user=request.user,
            remind_at__gte=now,
            remind_at__lte=window,
            reminder_sent=False,
        )
        return Response(self.get_serializer(events, many=True).data)

    @action(detail=True, methods=["post"], url_path="mark-reminder-sent")
    def mark_reminder_sent(self, request, pk=None):
        event = self.get_object()
        event.reminder_sent = True
        event.save(update_fields=["reminder_sent"])
        return Response({"status": "reminder marked as sent"})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")
    first_name = request.data.get("first_name", "")
    last_name = request.data.get("last_name", "")

    if not username or not email or not password:
        return Response({"error": "All fields required."}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"username": "Username already taken."}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({"email": "Email already in use."}, status=400)

    User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    return Response({"message": "Account created."}, status=201)


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    user_profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == "GET":
        avatar_url = None
        if user_profile.avatar:
            avatar_url = request.build_absolute_uri(user_profile.avatar.url)

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar_url": avatar_url,
            "initials": (
                (user.first_name[0] if user.first_name else user.username[0])
                + (user.last_name[0] if user.last_name else "")
            ).upper(),
        })

    if request.method == "PUT":
        username = request.data.get("username", user.username)
        email = request.data.get("email", user.email)
        first_name = request.data.get("first_name", user.first_name)
        last_name = request.data.get("last_name", user.last_name)
        password = request.data.get("password")
        avatar = request.FILES.get("avatar")

        if username != user.username and User.objects.filter(username=username).exists():
            return Response({"error": "Username already taken."}, status=400)
        if email != user.email and User.objects.filter(email=email).exists():
            return Response({"error": "Email already in use."}, status=400)

        user.username = username
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        if password:
            user.set_password(password)
        user.save()

        if avatar:
            user_profile.avatar = avatar
            user_profile.save()

        avatar_url = None
        if user_profile.avatar:
            avatar_url = request.build_absolute_uri(user_profile.avatar.url)

        return Response({
            "message": "Profile updated.",
            "avatar_url": avatar_url,
        })


@api_view(["GET"])
@permission_classes([AllowAny])
def google_login_url(request):
    import json, base64, hashlib, secrets, urllib.parse

    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()

    state_data = base64.urlsafe_b64encode(
        json.dumps({"code_verifier": code_verifier}).encode()
    ).decode()

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": "http://localhost:8000/api/auth/google/login/callback/",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state_data,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return Response({"url": auth_url})


@api_view(["GET"])
@permission_classes([AllowAny])
def google_login_callback(request):
    import json, base64, requests, urllib.parse
    from rest_framework_simplejwt.tokens import RefreshToken

    code = request.GET.get("code")
    state = request.GET.get("state")

    if not code or not state:
        from django.shortcuts import redirect
        return redirect("http://localhost:5173/login?error=invalid_callback")

    try:
        state_decoded = urllib.parse.unquote(state)
        padding = 4 - len(state_decoded) % 4
        if padding != 4:
            state_decoded += "=" * padding
        state_data = json.loads(base64.urlsafe_b64decode(state_decoded).decode())
        code_verifier = state_data.get("code_verifier")
    except Exception as e:
        from django.shortcuts import redirect
        return redirect("http://localhost:5173/login?error=invalid_state")

    token_response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": "http://localhost:8000/api/auth/google/login/callback/",
            "grant_type": "authorization_code",
            "code_verifier": code_verifier,
        }
    )

    if not token_response.ok:
        from django.shortcuts import redirect
        return redirect("http://localhost:5173/login?error=google_failed")

    token_data = token_response.json()
    access_token = token_data.get("access_token")

    if not access_token:
        from django.shortcuts import redirect
        return redirect("http://localhost:5173/login?error=no_token")

    user_info_response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    if not user_info_response.ok:
        from django.shortcuts import redirect
        return redirect("http://localhost:5173/login?error=user_info_failed")

    user_info = user_info_response.json()
    email = user_info.get("email")
    name = user_info.get("name", "")

    if not email:
        from django.shortcuts import redirect
        return redirect("http://localhost:5173/login?error=no_email")

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        username = email.split("@")[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=None,
        )
        user.first_name = name.split(" ")[0] if name else ""
        user.last_name = " ".join(name.split(" ")[1:]) if name else ""
        user.save()

    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    refresh_token = str(refresh)

    from django.shortcuts import redirect
    return redirect(
        f"http://localhost:5173/auth/callback?access={access}&refresh={refresh_token}"
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def google_auth_url(request):
    import json, base64, hashlib, secrets, urllib.parse

    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()

    state_data = base64.urlsafe_b64encode(
        json.dumps({
            "user_id": request.user.id,
            "code_verifier": code_verifier,
        }).encode()
    ).decode()

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/calendar",
        "access_type": "offline",
        "prompt": "consent",
        "state": state_data,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return Response({"url": auth_url})


@api_view(["GET"])
@permission_classes([AllowAny])
def google_callback(request):
    import json, base64, requests

    code = request.GET.get("code")
    state = request.GET.get("state")

    if not code or not state:
        return Response({"error": "Invalid callback."}, status=400)

    try:
        padded = state + "=="
        state_data = json.loads(base64.urlsafe_b64decode(padded).decode())
        user_id = state_data.get("user_id")
        code_verifier = state_data.get("code_verifier")
    except Exception as e:
        return Response({"error": f"Invalid state: {str(e)}"}, status=400)

    if not user_id or not code_verifier:
        return Response({"error": "Missing user or verifier."}, status=400)

    token_response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
            "code_verifier": code_verifier,
        }
    )

    if not token_response.ok:
        return Response(
            {"error": f"Token fetch failed: {token_response.text}"},
            status=400
        )

    token_data = token_response.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token", "")

    if not access_token:
        return Response({"error": "No access token received."}, status=400)

    user = User.objects.get(id=user_id)
    GoogleCalendarToken.objects.update_or_create(
        user=user,
        defaults={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expiry": None,
        }
    )

    token = GoogleCalendarToken.objects.get(user=user)
    google_sync.pull_events_from_google(token, user)

    from django.shortcuts import redirect
    return redirect("http://localhost:5173/?google=connected")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def google_sync_now(request):
    try:
        token = GoogleCalendarToken.objects.get(user=request.user)
        result = google_sync.pull_events_from_google(token, request.user)
        return Response({"status": "synced", **result})
    except GoogleCalendarToken.DoesNotExist:
        return Response({"error": "Google Calendar not connected."}, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def google_status(request):
    connected = GoogleCalendarToken.objects.filter(user=request.user).exists()
    last_synced = None
    if connected:
        token = GoogleCalendarToken.objects.get(user=request.user)
        last_synced = token.last_synced
    return Response({"connected": connected, "last_synced": last_synced})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def google_disconnect(request):
    GoogleCalendarToken.objects.filter(user=request.user).delete()
    return Response({"status": "disconnected"})