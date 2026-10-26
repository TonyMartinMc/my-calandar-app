import { useState, useEffect, useCallback } from "react"
import dayjs from "dayjs"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"
import * as api from "../api/events"

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

const DAY_MAP = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

function expandRecurringEvent(event, rangeStart, rangeEnd) {
  const { recurrence, recurrence_days, recurrence_end } = event

  if (recurrence === "none" || !recurrence) return [event]

  const occurrences = []
  const duration = dayjs(event.end_time).diff(dayjs(event.start_time))
  const start = dayjs(event.start_time)
  const end = recurrence_end ? dayjs(recurrence_end).endOf("day") : rangeEnd
  const capEnd = end.isBefore(rangeEnd) ? end : rangeEnd

  if (recurrence === "daily") {
    let cursor = start.clone()
    while (cursor.isSameOrBefore(capEnd)) {
      if (cursor.isSameOrAfter(rangeStart)) {
        occurrences.push(makeOccurrence(event, cursor, duration))
      }
      cursor = cursor.add(1, "day")
    }
    return occurrences
  }

  if (recurrence === "weekly") {
    let cursor = start.clone()
    while (cursor.isSameOrBefore(capEnd)) {
      if (cursor.isSameOrAfter(rangeStart)) {
        occurrences.push(makeOccurrence(event, cursor, duration))
      }
      cursor = cursor.add(1, "week")
    }
    return occurrences
  }

  if (recurrence === "monthly") {
    let cursor = start.clone()
    while (cursor.isSameOrBefore(capEnd)) {
      if (cursor.isSameOrAfter(rangeStart)) {
        occurrences.push(makeOccurrence(event, cursor, duration))
      }
      cursor = cursor.add(1, "month")
    }
    return occurrences
  }

  if (recurrence === "custom" && recurrence_days) {
    const targetDays = recurrence_days
      .split(",")
      .filter(Boolean)
      .map(d => DAY_MAP[d.trim()])
      .filter(d => d !== undefined)

    if (!targetDays.length) return [event]

    let cursor = start.clone().startOf("day")
    while (cursor.isSameOrBefore(capEnd)) {
      if (targetDays.includes(cursor.day())) {
        const occurrenceStart = cursor
          .hour(start.hour())
          .minute(start.minute())
          .second(0)

        if (
          occurrenceStart.isSameOrAfter(rangeStart) &&
          occurrenceStart.isSameOrBefore(capEnd)
        ) {
          occurrences.push(makeOccurrence(event, occurrenceStart, duration))
        }
      }
      cursor = cursor.add(1, "day")
    }
    return occurrences
  }

  return [event]
}

function makeOccurrence(event, startDayjs, duration) {
  return {
    ...event,
    id: event.id,
    start_time: startDayjs.toISOString(),
    end_time: startDayjs.add(duration, "millisecond").toISOString(),
    _isOccurrence: true,
  }
}

export function useEvents(currentDate, view) {
  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [checkedIds, setCheckedIds] = useState(new Set())

  const getRange = useCallback(() => {
    if (view === "month") return {
      start: currentDate.startOf("month").subtract(7, "day"),
      end: currentDate.endOf("month").add(7, "day"),
    }
    if (view === "week") return {
      start: currentDate.startOf("week"),
      end: currentDate.endOf("week"),
    }
    return {
      start: currentDate.startOf("day"),
      end: currentDate.endOf("day"),
    }
  }, [currentDate, view])

  const loadEvents = useCallback(async () => {
    const { start, end } = getRange()
    const data = await api.fetchEvents(start.toISOString(), end.toISOString())
    setEvents(data)
  }, [getRange])

  const loadCategories = useCallback(async () => {
    const data = await api.fetchCategories()
    setCategories(data)
    setCheckedIds(prev => {
      const next = new Set(prev)
      data.forEach(cat => {
        next.add(cat.id)
        cat.subcategories?.forEach(sub => next.add(sub.id))
      })
      return next
    })
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])
  useEffect(() => { loadCategories() }, [loadCategories])

  // Reminder polling
  useEffect(() => {
    const check = async () => {
      const reminders = await api.fetchUpcomingReminders()
      reminders.forEach(event => {
        if (Notification.permission === "granted") {
          new Notification(`Reminder: ${event.title}`, {
            body: event.notes || event.description || "",
          })
          api.markReminderSent(event.id)
        }
      })
    }
    if (Notification.permission === "default") Notification.requestPermission()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [])

  function toggleCategory(cat) {
    const allIds = [cat.id, ...(cat.subcategories?.map(s => s.id) || [])]
    const allChecked = allIds.every(id => checkedIds.has(id))
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (allChecked) {
        allIds.forEach(id => next.delete(id))
      } else {
        allIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  function toggleSubcategory(sub, parentCat) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(sub.id)) {
        next.delete(sub.id)
        const anySubChecked = parentCat.subcategories
          .filter(s => s.id !== sub.id)
          .some(s => next.has(s.id))
        if (!anySubChecked) next.delete(parentCat.id)
      } else {
        next.add(sub.id)
        next.add(parentCat.id)
      }
      return next
    })
  }

  const { start: rangeStart, end: rangeEnd } = getRange()
  const expandedEvents = events.flatMap(event =>
    expandRecurringEvent(event, rangeStart, rangeEnd)
  )

  const visibleEvents = expandedEvents.filter(event => {
    if (!event.category) return true
    return checkedIds.has(event.category)
  })

  async function createEvent(data) {
    await api.createEvent(data)
    await loadEvents()
  }

  async function updateEvent(id, data) {
    await api.updateEvent(id, data)
    await loadEvents()
  }

  async function deleteEvent(id) {
    await api.deleteEvent(id)
    await loadEvents()
  }

  async function createCategory(data) {
    await api.createCategory(data)
    await loadCategories()
  }

  async function deleteCategory(id) {
    await api.deleteCategory(id)
    await loadCategories()
    await loadEvents()
  }

  return {
    events: visibleEvents,
    categories,
    checkedIds,
    toggleCategory,
    toggleSubcategory,
    createEvent,
    updateEvent,
    deleteEvent,
    createCategory,
    deleteCategory,
  }
}