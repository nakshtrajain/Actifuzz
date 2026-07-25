import { useEffect, useState } from 'react'
import { getItem, setItem } from './storage'

const NAME_KEY = 'actifuzz:profileName'
const PHOTO_KEY = 'actifuzz:profilePhoto'

export function useProfile() {
  const [name, setNameState] = useState('there')
  const [photo, setPhotoState] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([getItem<string>(NAME_KEY, ''), getItem<string | null>(PHOTO_KEY, null)]).then(
      ([n, p]) => {
        setNameState(n || 'there')
        setPhotoState(p)
        setLoaded(true)
      },
    )
  }, [])

  function setName(n: string) {
    const v = n.trim() || 'there'
    setNameState(v)
    return setItem(NAME_KEY, v).catch((err) => console.error('Failed to save name:', err))
  }

  function setPhoto(dataUrl: string | null) {
    setPhotoState(dataUrl)
    return setItem(PHOTO_KEY, dataUrl).catch((err) => console.error('Failed to save photo:', err))
  }

  return { name, photo, setName, setPhoto, loaded }
}
