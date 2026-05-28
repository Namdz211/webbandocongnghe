export function getResponseMessage(data, response) {
  if (response.status === 401) {
    return 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Hãy đăng nhập lại bằng tài khoản admin.'
  }

  if (response.status === 403) {
    return 'Tài khoản hiện tại không có quyền admin để thực hiện thao tác này.'
  }

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message
    }

    if (data.errors && typeof data.errors === 'object') {
      const validationMessages = Object.values(data.errors)
        .flat()
        .filter(Boolean)

      if (validationMessages.length > 0) {
        return validationMessages.join(' ')
      }
    }

    if (typeof data.title === 'string' && data.title.trim()) {
      return data.title
    }
  }

  return `Backend trả lỗi ${response.status}. Kiểm tra lại API/gateway và dữ liệu SQL Server.`
}
