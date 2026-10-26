import axios from "axios"

const api = axios.create({ baseURL: "http://localhost:8000/api" })

api.interceptors.request.use(config => {
  const token = localStorage.getItem("access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export const login = (identifier, password) =>
  axios.post("http://localhost:8000/api/auth/token/", {
    username: identifier,
    password,
  }).then(r => {
    localStorage.setItem("access_token", r.data.access)
    localStorage.setItem("refresh_token", r.data.refresh)
    return r.data
  })

export const signup = (username, email, password, first_name, last_name) =>
  axios.post("http://localhost:8000/api/auth/register/", {
    username, email, password, first_name, last_name,
  }).then(r => r.data)

export const logout = () => {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  window.location.href = "/login"
}

export const getGoogleLoginUrl = () =>
  axios.get("http://localhost:8000/api/auth/google/login/").then(r => r.data.url)

export const fetchProfile = () =>
  api.get("/auth/profile/").then(r => r.data)

export const updateProfile = (data) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      formData.append(key, value)
    }
  })
  return api.put("/auth/profile/", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }).then(r => r.data)
}

export const fetchEvents = (start, end) =>
  api.get(`/events/?start=${start}&end=${end}`).then(r => r.data.results ?? r.data)

export const fetchCategories = () =>
  api.get("/categories/").then(r => r.data.results ?? r.data)

export const createCategory = (data) =>
  api.post("/categories/", data).then(r => r.data)

export const deleteCategory = (id) =>
  api.delete(`/categories/${id}/`)

export const createEvent = (data) =>
  api.post("/events/", data).then(r => r.data)

export const updateEvent = (id, data) =>
  api.put(`/events/${id}/`, data).then(r => r.data)

export const deleteEvent = (id) =>
  api.delete(`/events/${id}/`)

export const fetchUpcomingReminders = () =>
  api.get("/events/upcoming-reminders/").then(r => r.data)

export const markReminderSent = (id) =>
  api.post(`/events/${id}/mark-reminder-sent/`)

export const fetchGoogleStatus = () =>
  api.get("/google/status/").then(r => r.data)

export const getGoogleAuthUrl = () =>
  api.get("/auth/google/").then(r => r.data.url)

export const syncGoogleNow = () =>
  api.post("/google/sync/").then(r => r.data)

export const disconnectGoogle = () =>
  api.delete("/google/disconnect/").then(r => r.data)