from django.db import models
from django.contrib.auth.models import User


class Category(models.Model):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#F472B6")
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="subcategories",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="categories",
    )

    def __str__(self):
        return f"{self.parent.name} → {self.name}" if self.parent else self.name

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]


class Event(models.Model):
    RECURRENCE_CHOICES = [
        ("none", "None"),
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
        ("custom", "Custom"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="events",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    end_date = models.DateField(null=True, blank=True)
    color = models.CharField(max_length=7, default="#F472B6")
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="events",
    )
    recurrence = models.CharField(
        max_length=20, choices=RECURRENCE_CHOICES, default="none"
    )
    recurrence_days = models.CharField(max_length=20, blank=True, default="")
    recurrence_end = models.DateField(null=True, blank=True)
    remind_at = models.DateTimeField(null=True, blank=True)
    reminder_sent = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    google_event_id = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.start_time.date()})"

    class Meta:
        ordering = ["start_time"]


class GoogleCalendarToken(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="google_token"
    )
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True)
    token_expiry = models.DateTimeField(null=True, blank=True)
    google_calendar_id = models.CharField(max_length=200, default="primary")
    last_synced = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} Google Token"


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    avatar = models.ImageField(
        upload_to="avatars/",
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.user.username} Profile"