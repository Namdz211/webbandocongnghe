export const ORDER_REFRESH_INTERVAL_MS = 5000

export const ACTIVE_ORDER_STATUSES = new Set(['pending', 'confirmed', 'shipping'])

export const ORDER_STATUS_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'shipping', label: 'Đang giao' },
  { id: 'completed', label: 'Đã nhận' },
  { id: 'cancelled', label: 'Đã hủy' },
]

export const PAYMENT_METHODS = [
  {
    id: 'cod',
    name: 'Thanh to\u00e1n khi nh\u1eadn h\u00e0ng (COD)',
    description: 'Tr\u1ea3 ti\u1ec1n m\u1eb7t cho nh\u00e2n vi\u00ean giao h\u00e0ng sau khi nh\u1eadn s\u1ea3n ph\u1ea9m.',
    icon: 'fa-truck',
  },
  {
    id: 'bank_transfer',
    name: 'Chuy\u1ec3n kho\u1ea3n ng\u00e2n h\u00e0ng',
    description: 'Chuy\u1ec3n kho\u1ea3n theo m\u00e3 thanh to\u00e1n c\u1ee7a \u0111\u01a1n h\u00e0ng.',
    icon: 'fa-university',
  },
  {
    id: 'e_wallet',
    name: 'V\u00ed \u0111i\u1ec7n t\u1eed',
    description: 'Thanh to\u00e1n qua v\u00ed \u0111i\u1ec7n t\u1eed v\u00e0 h\u1ec7 th\u1ed1ng ghi nh\u1eadn thanh to\u00e1n ngay.',
    icon: 'fa-credit-card',
  },
]
