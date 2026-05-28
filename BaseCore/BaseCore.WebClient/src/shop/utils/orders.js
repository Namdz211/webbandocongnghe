import { ACTIVE_ORDER_STATUSES } from '../constants/orders.js'

export function toOrderStatusLabel(status) {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return 'Ch\u1edd admin x\u00e1c nh\u1eadn'
    case 'confirmed':
      return 'Admin \u0111\u00e3 x\u00e1c nh\u1eadn'
    case 'shipping':
      return '\u0110ang giao h\u00e0ng'
    case 'completed':
      return '\u0110\u00e3 nh\u1eadn h\u00e0ng'
    case 'cancelled':
      return '\u0110\u00e3 h\u1ee7y'
    default:
      return '\u0110ang x\u1eed l\u00fd'
  }
}
export function countActiveOrders(orders) {
  return orders.filter((order) =>
    ACTIVE_ORDER_STATUSES.has((order.status || '').toLowerCase()),
  ).length
}
