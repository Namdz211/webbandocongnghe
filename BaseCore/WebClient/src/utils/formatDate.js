const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDate(value) {
  if (!value) {
    return 'N/A'
  }

  try {
    return dateFormatter.format(new Date(value))
  } catch {
    return value
  }
}
