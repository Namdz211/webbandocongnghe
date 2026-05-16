export function readStorage(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallbackValue
  } catch {
    return fallbackValue
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}
