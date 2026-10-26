import caldav
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from icalendar import Calendar, Event as ICalEvent
import uuid

from .models import Event


ICLOUD_CALDAV_URL = "https://caldav.icloud.com"


def get_icloud_client(username=None, password=None):
    username = username or settings.ICLOUD_USERNAME
    password = password or settings.ICLOUD_PASSWORD
    client = caldav.DAVClient(
        url=ICLOUD_CALDAV_URL,
        username=username,
        password=password,
    )
    return client


def get_principal_and_calendar(username=None, password=None, calendar_url=None):
    client = get_icloud_client(username, password)
    principal = client.principal()
    calendars = principal.calendars()

    if not calendars:
        raise Exception("No calendars found in iCloud account.")

    if calendar_url:
        for cal in calendars:
            if str(cal.url) == calendar_url:
                return principal, cal

    skip_names = ["reminders", "reminders ⚠️"]
    preferred = ["home", "calendar"]

    for pref in preferred:
        for cal in calendars:
            if cal.name.lower() == pref:
                return principal, cal

    for cal in calendars:
        if cal.name.lower() not in skip_names:
            return principal, cal

    return principal, calendars[0]


def pull_events_from_icloud(user, username=None, password=None):
    try:
        client = get_icloud_client(username, password)
        principal = client.principal()
        calendars = principal.calendars()

        # Skip Reminders calendar
        skip_names = ["reminders", "reminders ⚠️"]
        valid_calendars = [
            cal for cal in calendars
            if cal.name.lower() not in skip_names
        ]

        print(f"Syncing {len(valid_calendars)} calendars...")

        created = 0
        updated = 0
        now = datetime.now(pytz.utc)
        end = now + timedelta(days=365)

        for calendar in valid_calendars:
            print(f"  Checking: {calendar.name}")
            try:
                icloud_events = calendar.date_search(
                    start=now,
                    end=end,
                    expand=True,
                )

                for ical_event in icloud_events:
                    try:
                        cal = Calendar.from_ical(ical_event.data)
                        for component in cal.walk():
                            if component.name != "VEVENT":
                                continue

                            uid = str(component.get("UID", ""))
                            title = str(component.get("SUMMARY", "Untitled"))
                            description = str(component.get("DESCRIPTION", ""))

                            dtstart = component.get("DTSTART")
                            dtend = component.get("DTEND")

                            if not dtstart or not dtend:
                                continue

                            start_dt = normalize_dt(dtstart.dt)
                            end_dt = normalize_dt(dtend.dt)

                            if not start_dt or not end_dt:
                                continue

                            existing = Event.objects.filter(
                                icloud_event_id=uid,
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
                                    color="#A78BFA",
                                    icloud_event_id=uid,
                                    user=user,
                                )
                                created += 1

                    except Exception as e:
                        print(f"Error parsing iCloud event: {e}")
                        continue

            except Exception as e:
                print(f"Error syncing calendar {calendar.name}: {e}")
                continue

        return {"created": created, "updated": updated}

    except Exception as e:
        print(f"Error pulling from iCloud: {e}")
        return {"error": str(e)}


def push_event_to_icloud(event, username=None, password=None):
    try:
        _, calendar = get_principal_and_calendar(
            username, password, settings.ICLOUD_CALENDAR_URL
        )

        uid = event.icloud_event_id or str(uuid.uuid4())

        cal = Calendar()
        cal.add("prodid", "-//My Calendar App//EN")
        cal.add("version", "2.0")

        ical_event = ICalEvent()
        ical_event.add("uid", uid)
        ical_event.add("summary", event.title)
        ical_event.add("description", event.notes or event.description or "")
        ical_event.add("dtstart", event.start_time)
        ical_event.add("dtend", event.end_time)
        ical_event.add("dtstamp", datetime.now(pytz.utc))

        cal.add_component(ical_event)
        calendar.save_event(cal.to_ical().decode("utf-8"))

        return uid

    except Exception as e:
        print(f"Error pushing event to iCloud: {e}")
        return None


def delete_event_from_icloud(icloud_event_id, username=None, password=None):
    try:
        _, calendar = get_principal_and_calendar(
            username, password, settings.ICLOUD_CALENDAR_URL
        )
        results = calendar.search(event=True)
        for ical_event in results:
            cal = Calendar.from_ical(ical_event.data)
            for component in cal.walk():
                if component.name == "VEVENT":
                    uid = str(component.get("UID", ""))
                    if uid == icloud_event_id:
                        ical_event.delete()
                        return True
        return False
    except Exception as e:
        print(f"Error deleting iCloud event: {e}")
        return False


def normalize_dt(dt):
    try:
        if isinstance(dt, datetime):
            if dt.tzinfo is None:
                return pytz.utc.localize(dt)
            return dt.astimezone(pytz.utc)
        else:
            return pytz.utc.localize(
                datetime(dt.year, dt.month, dt.day, 12, 0, 0)
            )
    except Exception:
        return None