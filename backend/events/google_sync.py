from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from django.conf import settings
from django.utils import timezone
from datetime import datetime
import pytz

from .models import Event, GoogleCalendarToken


def get_credentials(token_obj):
    creds = Credentials(
        token=token_obj.access_token,
        refresh_token=token_obj.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_obj.access_token = creds.token
        token_obj.save(update_fields=["access_token"])
    return creds


def get_calendar_service(token_obj):
    creds = get_credentials(token_obj)
    return build("calendar", "v3", credentials=creds)


def push_event_to_google(event, token_obj):
    service = get_calendar_service(token_obj)
    body = {
        "summary": event.title,
        "description": event.notes or event.description or "",
        "start": {
            "dateTime": event.start_time.isoformat(),
            "timeZone": "America/Chicago",
        },
        "end": {
            "dateTime": event.end_time.isoformat(),
            "timeZone": "America/Chicago",
        },
        "extendedProperties": {
            "private": {
                "app_event_id": str(event.id),
            }
        },
    }

    if event.recurrence and event.recurrence != "none":
        rrule = build_rrule(event)
        if rrule:
            body["recurrence"] = [rrule]

    try:
        result = service.events().insert(
            calendarId=token_obj.google_calendar_id,
            body=body
        ).execute()
        return result.get("id")
    except Exception as e:
        print(f"Error pushing event to Google: {e}")
        return None


def delete_event_from_google(google_event_id, token_obj):
    service = get_calendar_service(token_obj)
    try:
        service.events().delete(
            calendarId=token_obj.google_calendar_id,
            eventId=google_event_id
        ).execute()
    except Exception as e:
        print(f"Error deleting event from Google: {e}")


def pull_events_from_google(token_obj, user):
    service = get_calendar_service(token_obj)
    try:
        now = timezone.now().isoformat()
        events_result = service.events().list(
            calendarId=token_obj.google_calendar_id,
            timeMin=now,
            maxResults=250,
            singleEvents=True,
            orderBy="startTime"
        ).execute()

        google_events = events_result.get("items", [])
        created = 0
        updated = 0

        for g_event in google_events:
            private_props = g_event.get("extendedProperties", {}).get("private", {})
            if private_props.get("app_event_id"):
                continue

            title = g_event.get("summary", "Untitled")
            description = g_event.get("description", "")
            google_id = g_event.get("id")

            start = g_event["start"].get("dateTime") or g_event["start"].get("date")
            end = g_event["end"].get("dateTime") or g_event["end"].get("date")

            if not start or not end:
                continue

            start_dt = parse_google_datetime(start)
            end_dt = parse_google_datetime(end)

            if not start_dt or not end_dt:
                continue

            existing = Event.objects.filter(
                google_event_id=google_id,
                user=user
            ).first()

            if existing:
                existing.title = title
                existing.description = description
                existing.start_time = start_dt
                existing.end_time = end_dt
                existing.save()
                updated += 1
            else:
                Event.objects.create(
                    title=title,
                    description=description,
                    start_time=start_dt,
                    end_time=end_dt,
                    color="#6C63FF",
                    google_event_id=google_id,
                    user=user,
                )
                created += 1

        token_obj.last_synced = timezone.now()
        token_obj.save(update_fields=["last_synced"])

        return {"created": created, "updated": updated}

    except Exception as e:
        print(f"Error pulling from Google: {e}")
        return {"error": str(e)}


def parse_google_datetime(dt_str):
    try:
        if "T" in dt_str:
            if dt_str.endswith("Z"):
                dt_str = dt_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(dt_str)
            if dt.tzinfo is None:
                dt = pytz.utc.localize(dt)
            else:
                dt = dt.astimezone(pytz.utc)
            return dt
        else:
            # All-day event — use noon to avoid date shifting across timezones
            d = datetime.strptime(dt_str, "%Y-%m-%d")
            return pytz.utc.localize(d.replace(hour=12, minute=0))
    except Exception:
        return None


def build_rrule(event):
    if event.recurrence == "daily":
        rule = "RRULE:FREQ=DAILY"
    elif event.recurrence == "weekly":
        rule = "RRULE:FREQ=WEEKLY"
    elif event.recurrence == "monthly":
        rule = "RRULE:FREQ=MONTHLY"
    elif event.recurrence == "custom" and event.recurrence_days:
        days = event.recurrence_days.upper()
        rule = f"RRULE:FREQ=WEEKLY;BYDAY={days}"
    else:
        return None

    if event.recurrence_end:
        end_str = event.recurrence_end.strftime("%Y%m%d")
        rule += f";UNTIL={end_str}"

    return rule