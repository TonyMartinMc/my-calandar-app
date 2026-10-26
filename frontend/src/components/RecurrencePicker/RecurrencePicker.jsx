import { useState } from "react"
import DatePicker from "../DatePicker/DatePicker"
import "./RecurrencePicker.css"

const DAYS = [
  { label: "S", value: "SU", full: "Sunday" },
  { label: "M", value: "MO", full: "Monday" },
  { label: "T", value: "TU", full: "Tuesday" },
  { label: "W", value: "WE", full: "Wednesday" },
  { label: "T", value: "TH", full: "Thursday" },
  { label: "F", value: "FR", full: "Friday" },
  { label: "S", value: "SA", full: "Saturday" },
]

export default function RecurrencePicker({ recurrence, recurrenceDays, recurrenceEnd, onChange }) {
  const [selectedDays, setSelectedDays] = useState(
    recurrenceDays ? recurrenceDays.split(",").filter(Boolean) : []
  )

  const STANDARD = ["none", "daily", "weekly", "monthly"]

  function toggleDay(val) {
    setSelectedDays(prev => {
      const next = prev.includes(val)
        ? prev.filter(d => d !== val)
        : [...prev, val]
      onChange({ recurrence: "custom", recurrenceDays: next.join(","), recurrenceEnd })
      return next
    })
  }

  function handleStandard(val) {
    setSelectedDays([])
    onChange({ recurrence: val, recurrenceDays: "", recurrenceEnd })
  }

  function handleEndDate(val) {
    onChange({ recurrence, recurrenceDays: selectedDays.join(","), recurrenceEnd: val })
  }

  function getDaySummary() {
    if (!selectedDays.length) return "Pick days below"
    return selectedDays
      .map(d => DAYS.find(day => day.value === d)?.full)
      .filter(Boolean)
      .join(", ")
  }

  return (
    <div className="rcp-wrapper">

      {/* STANDARD OPTIONS */}
      <div className="rcp-section-label">Frequency</div>
      <div className="rcp-options">
        {[
          { label: "Never", value: "none" },
          { label: "Daily", value: "daily" },
          { label: "Weekly", value: "weekly" },
          { label: "Monthly", value: "monthly" },
          { label: "Custom days", value: "custom" },
        ].map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`rcp-btn ${recurrence === opt.value ? "rcp-selected" : ""}`}
            onClick={() => opt.value === "custom"
              ? onChange({ recurrence: "custom", recurrenceDays: selectedDays.join(","), recurrenceEnd })
              : handleStandard(opt.value)
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* CUSTOM DAY PICKER */}
      {recurrence === "custom" && (
        <div className="rcp-custom">
          <div className="rcp-section-label" style={{ marginBottom: 8 }}>
            Repeat on · {getDaySummary()}
          </div>
          <div className="rcp-days">
            {DAYS.map(day => (
              <button
                key={day.value}
                type="button"
                className={`rcp-day-btn ${selectedDays.includes(day.value) ? "rcp-day-selected" : ""}`}
                onClick={() => toggleDay(day.value)}
                title={day.full}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* END DATE — show for any recurrence except none */}
      {recurrence !== "none" && (
        <div className="rcp-end-date">
          <div className="rcp-section-label">Until</div>
          <DatePicker value={recurrenceEnd} onChange={handleEndDate} />
        </div>
      )}

    </div>
  )
}