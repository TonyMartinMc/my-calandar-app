import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const access = searchParams.get("access")
    const refresh = searchParams.get("refresh")
    const error = searchParams.get("error")

    console.log("AuthCallback params:", { access: !!access, refresh: !!refresh, error })

    if (error) {
      navigate("/login?error=" + error)
      return
    }

    if (access && refresh) {
      localStorage.setItem("access_token", access)
      localStorage.setItem("refresh_token", refresh)
      navigate("/")
    } else {
      navigate("/login")
    }
  }, [searchParams])

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "DM Sans, sans-serif",
      color: "#A1A1AA",
      fontSize: "0.9rem",
    }}>
      Signing you in...
    </div>
  )
}