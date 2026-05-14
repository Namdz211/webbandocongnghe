import { useMemo, useState } from 'react'

export default function useCart(initialItems = []) {
  const [items, setItems] = useState(initialItems)

  const summary = useMemo(
    () => ({
      count: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      total: items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    }),
    [items],
  )

  return { items, setItems, summary }
}
