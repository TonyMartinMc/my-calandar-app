import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import "./AvatarCropper.css"

export default function AvatarCropper({ imageSrc, onCropComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropCompleteCallback = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  async function handleApply() {
    const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
    onCropComplete(croppedBlob)
  }

  return (
    <div className="cropper-overlay">
      <div className="cropper-modal">
        <div className="cropper-header">
          <span className="cropper-title">Crop Photo</span>
          <button className="cropper-close" onClick={onCancel}>✕</button>
        </div>

        <div className="cropper-area">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteCallback}
          />
        </div>

        <div className="cropper-zoom">
          <span className="cropper-zoom-label">🔍</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="cropper-zoom-slider"
          />
        </div>

        <div className="cropper-actions">
          <button className="cropper-cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="cropper-apply-btn" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  )
}

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.95)
  })
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener("load", () => resolve(img))
    img.addEventListener("error", reject)
    img.setAttribute("crossOrigin", "anonymous")
    img.src = url
  })
}