export function calculateCartSummary(items = []) {
  return {
    count: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    total: items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
  }
}
