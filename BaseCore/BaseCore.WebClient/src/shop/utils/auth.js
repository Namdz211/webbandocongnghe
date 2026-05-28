export function getAuthToken(auth) {
  return auth?.token || auth?.Token || ''
}

export function getAuthUserId(auth) {
  return auth?.userId || auth?.UserId || auth?.id || auth?.Id || ''
}

export function getJwtPayload(token) {
  if (!token) {
    return null
  }

  try {
    const payload = token.split('.')[1]
    if (!payload) {
      return null
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    )

    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

export function isExpiredToken(token) {
  const payload = getJwtPayload(token)

  if (!payload?.exp) {
    return false
  }

  return payload.exp * 1000 <= Date.now()
}

export function isAdmin(auth) {
  return String(auth?.role || auth?.Role || '').toLowerCase() === 'admin'
}
