import { useState, useEffect, useRef } from "react"
import dayjs from "dayjs"
import DatePicker from "../DatePicker/DatePicker"
import TimePicker from "../TimePicker/TimePicker"
import ReminderPicker from "../ReminderPicker/ReminderPicker"
import RecurrencePicker from "../RecurrencePicker/RecurrencePicker"
import "./EventModal.css"

export default function EventModal({ event, selectedDate, categories, onClose, onCreate, onUpdate, onDelete }) {
  const isEditing = !!event

  const [form, setForm] = useState({
    title: "",
    start_date: "",
    end_date: "",
    start_time: "09:00",
    end_time: "10:00",
    color: "#F472B6",
    category: "",
    recurrence: "none",
    recurrence_days: "",
    recurrence_end: "",
    remind_at: "",
    notes: "",
  })

  const [expanded, setExpanded] = useState(null)
  const rowRefs = useRef({})
  const bodyRef = useRef(null)

  const allCategories = []
  categories.forEach(cat => {
    allCategories.push(cat)
    cat.subcategories?.forEach(sub => allCategories.push(sub))
  })

  useEffect(() => {
    if (isEditing) {
      const start = dayjs(event.start_time)
      const end = dayjs(event.end_time)
      setForm({
        title: event.title || "",
        start_date: start.format("YYYY-MM-DD"),
        end_date: event.end_date || start.format("YYYY-MM-DD"),
        start_time: start.format("HH:mm"),
        end_time: end.format("HH:mm"),
        color: event.color || "#F472B6",
        category: event.category || "",
        recurrence: event.recurrence || "none",
        recurrence_days: event.recurrence_days || "",
        recurrence_end: event.recurrence_end || "",
        remind_at: event.remind_at ? dayjs(event.remind_at).toISOString() : "",
        notes: event.notes || "",
      })
    } else if (selectedDate) {
      const dateStr = selectedDate.format("YYYY-MM-DD")
      setForm(f => ({
        ...f,
        start_date: dateStr,
        end_date: dateStr,
      }))
    }
  }, [event, selectedDate])

  useEffect(() => {
    if (expanded && rowRefs.current[expanded] && bodyRef.current) {
      setTimeout(() => {
        const row = rowRefs.current[expanded]
        const body = bodyRef.current
        const rowTop = row.offsetTop
        const rowHeight = row.offsetHeight
        const bodyHeight = body.offsetHeight
        body.scrollTo({
          top: rowTop - bodyHeight / 2 + rowHeight / 2,
          behavior: "smooth",
        })
      }, 80)
    }
  }, [expanded])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleExpand(key) {
    setExpanded(prev => prev === key ? null : key)
  }

  function handleCategoryChange(id) {
    set("category", id)
    if (id) {
      const match = allCategories.find(c => String(c.id) === String(id))
      if (match?.color) set("color", match.color)
    }
  }

  function handleRecurrenceChange({ recurrence, recurrenceDays, recurrenceEnd }) {
    setForm(f => ({
      ...f,
      recurrence,
      recurrence_days: recurrenceDays || "",
      recurrence_end: recurrenceEnd || "",
    }))
  }

  function handleStartDate(val) {
    set("start_date", val)
    if (form.end_date && dayjs(val).isAfter(dayjs(form.end_date))) {
      set("end_date", val)
    }
  }

  function handleEndDate(val) {
    set("end_date", val)
    if (form.start_date && dayjs(val).isBefore(dayjs(form.start_date))) {
      set("start_date", val)
    }
  }

  async function handleSubmit() {
    if (!form.title || !form.start_date || !form.start_time || !form.end_time) {
      alert("Please fill in title, date, and time.")
      return
    }

    try {
      const start = dayjs(`${form.start_date}T${form.start_time}`)
      const end = dayjs(`${form.end_date || form.start_date}T${form.end_time}`)
      const payload = {
        title: form.title,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        end_date: form.end_date || form.start_date,
        color: form.color,
        category: form.category || null,
        recurrence: form.recurrence,
        recurrence_days: form.recurrence_days || "",
        recurrence_end: form.recurrence_end || null,
        remind_at: form.remind_at && !form.remind_at.startsWith("offset:")
          ? form.remind_at
          : null,
        notes: form.notes,
        description: "",
      }

      console.log("Submitting payload:", payload)

      if (isEditing) {
        await onUpdate(event.id, payload)
      } else {
        await onCreate(payload)
      }
      onClose()
    } catch (err) {
      console.error("Save failed:", err.response?.data || err.message)
      alert("Failed to save: " + JSON.stringify(err.response?.data || err.message))
    }
  }

  async function handleDelete() {
    if (confirm("Delete this event?")) {
      await onDelete(event.id)
      onClose()
    }
  }

  function formatTime(t) {
    return dayjs(`2000-01-01T${t}`).format("h:mm A")
  }

  function getRecurrenceSummary() {
    if (form.recurrence === "none") return "Does not repeat"
    if (form.recurrence === "custom") {
      if (!form.recurrence_days) return "Custom — pick days"
      const days = form.recurrence_days.split(",").filter(Boolean)
      const DAY_MAP = { SU: "Sun", MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat" }
      return "Every " + days.map(d => DAY_MAP[d]).join(", ")
    }
    return `Repeats ${form.recurrence}`
  }

  function getReminderSummary() {
    if (!form.remind_at) return "Add reminder"
    if (form.remind_at.startsWith("offset:")) {
      const mins = parseInt(form.remind_at.replace("offset:", ""))
      if (mins === 0) return "At event time"
      if (mins < 60) return `${mins} min before`
      if (mins === 60) return "1 hour before"
      if (mins === 120) return "2 hours before"
      if (mins === 1440) return "1 day before"
      return `${mins} min before`
    }
    return dayjs(form.remind_at).format("MMM D [at] h:mm A")
  }

  const sameDay = form.start_date === form.end_date
  const dateSummary = sameDay
    ? (form.start_date ? dayjs(form.start_date).format("dddd, MMMM D") : "Add date")
    : `${form.start_date ? dayjs(form.start_date).format("MMM D") : "Start"} → ${form.end_date ? dayjs(form.end_date).format("MMM D") : "End"}`
  const timeSummary = `${formatTime(form.start_time)} – ${formatTime(form.end_time)}`

  const rows = [
    {
      key: "datetime",
      icon: "🕐",
      summary: `${dateSummary}  ·  ${timeSummary}`,
      content: (
        <div className="expanded-content">
          <div className="expanded-field">
            <span className="expanded-label">Start date</span>
            <DatePicker value={form.start_date} onChange={handleStartDate} />
          </div>
          <div className="expanded-divider" />
          <div className="expanded-field">
            <span className="expanded-label">End date</span>
            <DatePicker value={form.end_date} onChange={handleEndDate} />
          </div>
          <div className="expanded-divider" />
          <div className="expanded-field">
            <span className="expanded-label">Start time</span>
            <TimePicker value={form.start_time} onChange={val => set("start_time", val)} />
          </div>
          <div className="expanded-divider" />
          <div className="expanded-field">
            <span className="expanded-label">End time</span>
            <TimePicker value={form.end_time} onChange={val => set("end_time", val)} />
          </div>
        </div>
      ),
    },
    {
      key: "category",
      icon: "🏷️",
      summary: form.category
        ? allCategories.find(c => String(c.id) === String(form.category))?.name || "Category"
        : "Add category",
      content: (
        <div className="expanded-content">
          <div className="cat-option-list">
            <div
              className={`cat-option ${!form.category ? "cat-option-selected" : ""}`}
              onClick={() => handleCategoryChange("")}
            >
              No category
            </div>
            {categories.map(cat => (
              <div key={cat.id}>
                <div
                  className={`cat-option ${String(form.category) === String(cat.id) ? "cat-option-selected" : ""}`}
                  onClick={() => handleCategoryChange(String(cat.id))}
                >
                  <span className="cat-option-dot" style={{ background: cat.color }} />
                  {cat.name}
                </div>
                {cat.subcategories?.map(sub => (
                  <div
                    key={sub.id}
                    className={`cat-option cat-option-sub ${String(form.category) === String(sub.id) ? "cat-option-selected" : ""}`}
                    onClick={() => handleCategoryChange(String(sub.id))}
                  >
                    <span className="cat-option-dot" style={{ background: sub.color }} />
                    ↳ {sub.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "recurrence",
      icon: "🔁",
      summary: getRecurrenceSummary(),
      content: (
        <div className="expanded-content">
          <RecurrencePicker
            recurrence={form.recurrence}
            recurrenceDays={form.recurrence_days}
            recurrenceEnd={form.recurrence_end}
            onChange={handleRecurrenceChange}
          />
        </div>
      ),
    },
    {
      key: "color",
      icon: "🎨",
      summary: (
        <span className="color-summary">
          <span className="color-summary-dot" style={{ background: form.color }} />
          {form.color}
        </span>
      ),
      content: (
        <div className="expanded-content">
          <div className="expanded-field">
            <span className="expanded-label">Pick a color</span>
            <div className="color-picker-row">
              <input
                type="color"
                className="color-wheel"
                value={form.color}
                onChange={e => set("color", e.target.value)}
              />
              <span className="color-hex">{form.color}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "reminder",
      icon: "⏰",
      summary: getReminderSummary(),
      content: (
        <div className="expanded-content">
          <ReminderPicker
            value={form.remind_at}
            eventDate={form.start_date}
            eventStartTime={form.start_time}
            onChange={val => set("remind_at", val)}
          />
        </div>
      ),
    },
    {
      key: "notes",
      icon: "📝",
      summary: form.notes
        ? form.notes.slice(0, 40) + (form.notes.length > 40 ? "…" : "")
        : "Add notes",
      content: (
        <div className="expanded-content">
          <textarea
            className="notes-textarea"
            placeholder="Add notes..."
            rows={4}
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            autoFocus
          />
        </div>
      ),
    },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        <div className="modal-color-bar" style={{ background: form.color }} />

        <div className="modal-header">
          <input
            className="title-input"
            placeholder="Add title"
            value={form.title}
            onChange={e => set("title", e.target.value)}
            autoFocus
          />
        </div>

        <div className="modal-body" ref={bodyRef}>
          {rows.map(row => (
            <div key={row.key} ref={el => rowRefs.current[row.key] = el}>
              <div
                className={`modal-row ${expanded === row.key ? "modal-row-active" : ""}`}
                onClick={() => toggleExpand(row.key)}
              >
                <span className="modal-row-icon">{row.icon}</span>
                <span className="modal-row-summary">{row.summary}</span>
                <span className="modal-row-chevron">{expanded === row.key ? "▴" : "▾"}</span>
              </div>

              {expanded === row.key && (
                <div className="modal-row-expanded">
                  {row.content}
                </div>
              )}

              <div className="modal-row-divider" />
            </div>
          ))}
        </div>

        <div className="modal-footer">
          {isEditing && (
            <button className="delete-btn" onClick={handleDelete}>Delete</button>
          )}
          <div className="footer-right">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <button
              className="save-btn"
              style={{ background: form.color }}
              onClick={handleSubmit}
            >
              {isEditing ? "Save" : "Save"}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}