from rest_framework import serializers
from .models import Event, Category


class SubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "color"]


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubcategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "color", "parent", "subcategories"]


class EventSerializer(serializers.ModelSerializer):
    category_detail = CategorySerializer(source="category", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "title", "description", "start_time", "end_time", "end_date",
            "color", "category", "category_detail", "recurrence", "recurrence_days",
            "recurrence_end", "remind_at", "reminder_sent", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "reminder_sent"]

    def validate(self, data):
        if data.get("end_time") and data.get("start_time"):
            if data["end_time"] < data["start_time"]:
                raise serializers.ValidationError("end_time must be after start_time.")
        return data