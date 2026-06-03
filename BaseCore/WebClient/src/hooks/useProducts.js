import { useEffect, useState } from 'react'
import { productApi } from '../api/productApi'

export default function useProducts(params = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const data = await productApi.getAll(params)
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : data?.items || [])
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [JSON.stringify(params)])

  return { products, loading, error }
}
