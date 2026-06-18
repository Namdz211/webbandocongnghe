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
    name: 'Thanh toán khi nhận hàng (COD)',
    description: 'Trả tiền mặt cho nhân viên giao hàng sau khi nhận sản phẩm.',
    icon: 'fa-truck',
  },
  {
    id: 'bank_transfer',
    name: 'Chuyển khoản ngân hàng',
    description: 'Chuyển khoản theo mã thanh toán của đơn hàng.',
    icon: 'fa-university',
  },
  {
    id: 'e_wallet',
    name: 'Ví điện tử',
    description: 'Thanh toán qua ví điện tử và hệ thống ghi nhận thanh toán ngay.',
    icon: 'fa-credit-card',
  },
]
