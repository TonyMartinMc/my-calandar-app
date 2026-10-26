from django.contrib import admin
from .models import Event, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "color"]
    search_fields = ["name"]


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "start_time", "end_time", "recurrence", "remind_at", "reminder_sent"]
    list_filter = ["category", "recurrence", "reminder_sent"]
    search_fields = ["title", "notes", "description"]
    date_hierarchy = "start_time"