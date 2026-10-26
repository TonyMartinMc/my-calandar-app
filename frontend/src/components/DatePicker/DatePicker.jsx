import { useState } from "react"
import dayjs from "dayjs"
import "./DatePicker.css"

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function DatePicker({ value, onChange }) {
  const selected = value ? dayjs(value) : null
  const [viewing, setViewing] = useState(selected || dayjs())
  const [open, setOpen] = useState(false)

  const startOfGrid = viewing.startOf("month").startOf("week")
  const days = Array.from({ length: 42 }, (_, i) => startOfGrid.add(i, "day"))
  const today = dayjs()

  function handleSelect(day) {
    onChange(day.format("YYYY-MM-DD"))
    setOpen(false)
  }

  function prevMonth() {
    setViewing(v => v.subtract(1, "month"))
  }

  function nextMonth() {
    setViewing(v => v.add(1, "month"))
  }

  return (
    <div className="datepicker-wrapper">
      <button
        type="button"
        className="datepicker-trigger"
        onClick={() => setOpen(o => !o)}
      >
        <span className="datepicker-value">
          {selected ? selected.format("MMMM D, YYYY") : "Pick a date"}
        </span>
        <span className="datepicker-caret">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="datepicker-popover">
          <div className="dp-header">
            <button className="dp-nav" onClick={prevMonth}>‹</button>
            <span className="dp-month-label">
              {MONTHS[viewing.month()]} {viewing.year()}
            </span>
            <button className="dp-nav" onClick={nextMonth}>›</button>
          </div>

          <div className="dp-day-headers">
            {DAYS.map(d => <span key={d}>{d}</span>)}
          </div>

          <div className="dp-grid">
            {days.map((day, i) => {
              const isToday = day.isSame(today, "day")
              const isSelected = selected && day.isSame(selected, "day")
              const isCurrentMonth = day.month() === viewing.month()

              return (
                <button
                  key={i}
                  type="button"
                  className={`dp-day
                    ${isToday ? "dp-today" : ""}
                    ${isSelected ? "dp-selected" : ""}
                    ${!isCurrentMonth ? "dp-other-month" : ""}
                  `}
                  onClick={() => handleSelect(day)}
                >
                  {day.date()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}