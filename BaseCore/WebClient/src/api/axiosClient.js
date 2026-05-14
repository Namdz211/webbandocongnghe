const API_BASE_URL = '/api'

async function parseResponse(response) {
  const raw = await response.text()

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function getErrorMessage(data, response) {
  if (data?.message) {
    return data.message
  }

  if (data?.title) {
    return data.title
  }

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  return `Request failed with status ${response.status}.`
}

export async function apiRequest(path, options = {}) {
  const { token, headers, ...restOptions } = options
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      ...restOptions,
    })
  } catch {
    throw new Error('Cannot connect to backend.')
  }

  const data = await parseResponse(response)

  if (!response.ok) {
    throw new Error(getErrorMessage(data, response))
  }

  return data
}

export function toQueryString(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  return searchParams.toString()
}
