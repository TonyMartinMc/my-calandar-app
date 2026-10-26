import dayjs from "dayjs"
import "./CalendarGrid.css"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function CalendarGrid({ currentDate, view, events, onDayClick, onEventClick }) {
  if (view === "month") return <MonthView currentDate={currentDate} events={events} onDayClick={onDayClick} onEventClick={onEventClick} />
  if (view === "week") return <WeekView currentDate={currentDate} events={events} onDayClick={onDayClick} onEventClick={onEventClick} />
  return <DayView currentDate={currentDate} events={events} onDayClick={onDayClick} onEventClick={onEventClick} />
}

function MonthView({ currentDate, events, onDayClick, onEventClick }) {
  const startOfMonth = currentDate.startOf("month")
  const startOfGrid = startOfMonth.startOf("week")
  const days = Array.from({ length: 42 }, (_, i) => startOfGrid.add(i, "day"))
  const today = dayjs()

  return (
    <div className="calendar-grid">
      <div className="day-headers">
        {DAYS.map(d => <div key={d} className="day-header">{d}</div>)}
      </div>
      <div className="month-grid">
        {days.map(day => {
          const dayEvents = events.filter(e => dayjs(e.start_time).isSame(day, "day"))
          const isToday = day.isSame(today, "day")
          const isCurrentMonth = day.month() === currentDate.month()

          return (
            <div
              key={day.toString()}
              className={`day-cell ${isToday ? "today" : ""} ${!isCurrentMonth ? "other-month" : ""}`}
              onClick={() => onDayClick(day)}
            >
              <span className="day-number">{day.date()}</span>
              <div className="day-events">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="event-chip"
                    style={{ borderLeftColor: event.color || "#F472B6" }}
                    onClick={e => { e.stopPropagation(); onEventClick(event) }}
                  >
                    <span className="event-chip-time">
                      {dayjs(event.start_time).format("h:mm A")}
                    </span>
                    <span className="event-chip-title">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="more-events">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ currentDate, events, onDayClick, onEventClick }) {
  const startOfWeek = currentDate.startOf("week")
  const days = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, "day"))
  const today = dayjs()

  return (
    <div className="week-view">
      {days.map(day => {
        const dayEvents = events.filter(e => dayjs(e.start_time).isSame(day, "day"))
        const isToday = day.isSame(today, "day")

        return (
          <div
            key={day.toString()}
            className={`week-day ${isToday ? "today" : ""}`}
            onClick={() => onDayClick(day)}
          >
            <div className="week-day-header">
              <span className="week-day-name">{day.format("ddd")}</span>
              <span className={`week-day-number ${isToday ? "today-dot" : ""}`}>{day.date()}</span>
            </div>
            <div className="week-events">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className="week-event-chip"
                  style={{ borderLeftColor: event.color || "#F472B6" }}
                  onClick={e => { e.stopPropagation(); onEventClick(event) }}
                >
                  <span className="event-time">{dayjs(event.start_time).format("h:mm A")}</span>
                  <span>{event.title}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayView({ currentDate, events, onDayClick, onEventClick }) {
  const dayEvents = events.filter(e => dayjs(e.start_time).isSame(currentDate, "day"))

  return (
    <div className="day-view" onClick={() => onDayClick(currentDate)}>
      <div className="day-view-header">
        {currentDate.format("dddd, MMMM D")}
      </div>
      {dayEvents.length === 0 && (
        <div className="no-events">No events — click anywhere to add one!</div>
      )}
      {dayEvents.map(event => (
        <div
          key={event.id}
          className="day-event-block"
          style={{ borderLeftColor: event.color || "#F472B6" }}
          onClick={e => { e.stopPropagation(); onEventClick(event) }}
        >
          <div className="day-event-time">
            {dayjs(event.start_time).format("h:mm A")} – {dayjs(event.end_time).format("h:mm A")}
          </div>
          <div className="day-event-title">{event.title}</div>
          {event.notes && <div className="day-event-notes">{event.notes}</div>}
        </div>
      ))}
    </div>
  )
}