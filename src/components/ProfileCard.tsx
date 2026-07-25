import { useRef, useState } from 'react'
import { User, Check } from 'lucide-react'
import { useProfile } from '../lib/profile'

// Downscale + compress before storing — a raw phone photo can be several MB
// as base64, which silently blows past chrome.storage.local's quota. An
// avatar only ever renders at ~64px, so 160px is plenty.
function resizeImage(file: File, maxSize = 160, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas not supported'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ProfileCard() {
  const { name, photo, setName, setPhoto, loaded } = useProfile()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const resized = await resizeImage(file)
      await setPhoto(resized)
    } catch (err) {
      console.error('Failed to save profile photo:', err)
    }
  }

  function saveName() {
    setName(draft)
    setEditing(false)
  }

  if (!loaded) return null

  return (
    <div className="profile-card">
      <button
        onClick={() => fileRef.current?.click()}
        className="focus-ring profile-card__avatar"
        aria-label="Upload profile photo"
      >
        {photo ? (
          <img src={photo} alt="Profile" className="profile-card__avatar-img" />
        ) : (
          <User size={22} strokeWidth={1.75} />
        )}
        <span className="profile-card__avatar-overlay">Change</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="profile-card__file-input" onChange={onPickPhoto} />

      {editing ? (
        <div className="profile-card__edit-row">
          <input
            autoFocus
            defaultValue={name === 'there' ? '' : name}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            placeholder="Your name"
            className="focus-ring profile-card__name-input"
          />
          <button onClick={saveName} className="focus-ring profile-card__save-btn">
            <Check size={13} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="focus-ring profile-card__name-btn">
          <p className="profile-card__name">{name === 'there' ? 'Add your name' : name}</p>
          <p className="profile-card__edit-hint">tap to edit</p>
        </button>
      )}
    </div>
  )
}