import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { FALLBACK_IMAGES } from '../constants/images.js'
import LinkButton from '../components/LinkButton.jsx'
import ProductCard from '../components/ProductCard.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import { getAuthToken } from '../utils/auth.js'
import { formatCurrency, formatDate } from '../utils/formatters.js'
import { getProductImage, handleProductImageError } from '../utils/productImages.js'

const SPEC_SOURCE_KEYS = [
  'technicalSpecifications',
  'technicalSpecification',
  'technicalSpecs',
  'technicalSpec',
  'specifications',
  'specification',
  'specs',
  'attributes',
]

const SPEC_LABELS = {
  battery: 'Pin',
  brand: 'Thương hiệu',
  camera: 'Camera',
  category: 'Danh mục',
  categoryid: 'Danh mục',
  chipset: 'Chipset',
  color: 'Màu sắc',
  connection: 'Kết nối',
  connectivity: 'Kết nối',
  cpu: 'CPU',
  dimension: 'Kích thước',
  dimensions: 'Kích thước',
  display: 'Màn hình',
  frontcamera: 'Camera trước',
  gpu: 'GPU',
  graphics: 'Card đồ họa',
  harddrive: 'Ổ cứng',
  manufacturer: 'Hãng sản xuất',
  material: 'Chất liệu',
  memory: 'Bộ nhớ',
  operatingsystem: 'Hệ điều hành',
  os: 'Hệ điều hành',
  ports: 'Cổng kết nối',
  processor: 'Bộ xử lý',
  ram: 'RAM',
  rearcamera: 'Camera sau',
  refreshrate: 'Tần số quét',
  resolution: 'Độ phân giải',
  screen: 'Màn hình',
  stock: 'Tồn kho',
  storage: 'Bộ nhớ trong',
  warranty: 'Bảo hành',
  weight: 'Khối lượng',
}

const PRODUCT_SPEC_FIELDS = [
  { id: 'cpu', label: 'CPU', keys: ['cpu', 'Cpu'] },
  { id: 'gpu', label: 'GPU', keys: ['gpu', 'Gpu'] },
  { id: 'ram', label: 'RAM', keys: ['ram', 'Ram'] },
  { id: 'storage', label: 'Bộ nhớ', keys: ['storage', 'Storage'] },
  { id: 'screen', label: 'Màn hình', keys: ['screen', 'Screen'] },
  { id: 'camera', label: 'Camera', keys: ['camera', 'Camera'] },
  { id: 'battery', label: 'Pin', keys: ['battery', 'Battery'] },
  { id: 'weight', label: 'Khối lượng', keys: ['weight', 'Weight'] },
  { id: 'operatingSystem', label: 'Hệ điều hành', keys: ['operatingSystem', 'OperatingSystem'] },
  { id: 'connectivity', label: 'Kết nối', keys: ['connectivity', 'Connectivity'] },
  { id: 'sensors', label: 'Cảm biến', keys: ['sensors', 'Sensors'] },
  { id: 'waterResistance', label: 'Kháng nước', keys: ['waterResistance', 'WaterResistance'] },
]

const VARIANT_SPEC_IDS = new Set(['cpu', 'gpu', 'ram', 'storage', 'screen'])

const VARIANT_PRICE_STEP_PERCENT = {
  cpu: 0.1,
  gpu: 0.07,
  ram: 0.06,
  screen: 0.12,
  storage: 0.08,
}

const EMPTY_REVIEW_DATA = {
  items: [],
  totalCount: 0,
  averageRating: 0,
  canReview: false,
  myReview: null,
}

const RATING_STARS = [1, 2, 3, 4, 5]

function normalizeReviewData(data) {
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    totalCount: Number(data?.totalCount || 0),
    averageRating: Number(data?.averageRating || 0),
    canReview: Boolean(data?.canReview),
    myReview: data?.myReview || null,
  }
}

async function getMergedProductReviewData(productId, authToken) {
  const publicReviewData = normalizeReviewData(await api.getProductReviews(productId))

  if (!authToken) {
    return publicReviewData
  }

  try {
    const authReviewData = normalizeReviewData(await api.getProductReviews(productId, authToken))

    return {
      ...publicReviewData,
      canReview: authReviewData.canReview,
      myReview: authReviewData.myReview,
    }
  } catch {
    return publicReviewData
  }
}

function renderRatingStars(rating) {
  const safeRating = Number(rating || 0)

  return RATING_STARS.map((star) => {
    const iconClass = safeRating >= star
      ? 'fa-star'
      : safeRating >= star - 0.5
        ? 'fa-star-half-o'
        : 'fa-star-o'

    return <i className={`fa ${iconClass}`} key={star} />
  })
}

function getReviewCustomerName(review) {
  return review?.customerName || review?.CustomerName || review?.customerUserName || review?.CustomerUserName || 'Khách hàng'
}

function hasSpecValue(value) {
  if (value === null || value === undefined) {
    return false
  }

  if (Array.isArray(value)) {
    return value.some(hasSpecValue)
  }

  return String(value).trim() !== ''
}

function formatSpecLabel(label) {
  const text = String(label || '').trim()
  if (!text) {
    return 'Thông số'
  }

  const normalizedKey = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

  if (SPEC_LABELS[normalizedKey]) {
    return SPEC_LABELS[normalizedKey]
  }

  const readableLabel = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()

  return readableLabel.charAt(0).toUpperCase() + readableLabel.slice(1)
}

function stringifySpecValue(value) {
  if (!hasSpecValue(value)) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.map(stringifySpecValue).filter(Boolean).join(', ')
  }

  if (typeof value === 'object') {
    const nestedRows = normalizeSpecRows(value)
    return nestedRows.map((row) => `${row.label}: ${row.value}`).join(', ')
  }

  return String(value).trim()
}

function parseSpecLine(line) {
  const text = String(line || '').trim()
  const separatorMatch = text.match(/^(.{2,45}?)(?:[:：]|\s-\s)(.+)$/)

  if (!separatorMatch) {
    return hasSpecValue(text) ? { label: 'Thông tin', value: text } : null
  }

  return {
    label: formatSpecLabel(separatorMatch[1]),
    value: separatorMatch[2].trim(),
  }
}

function normalizeSpecRows(source) {
  if (!hasSpecValue(source)) {
    return []
  }

  if (typeof source === 'string') {
    return source
      .split(/\r?\n|;/)
      .map(parseSpecLine)
      .filter((row) => row && hasSpecValue(row.value))
  }

  if (Array.isArray(source)) {
    return source
      .flatMap((item) => {
        if (typeof item === 'string') {
          return parseSpecLine(item) || []
        }

        if (item && typeof item === 'object') {
          const label = item.label || item.name || item.key || item.title
          const value = item.value ?? item.content ?? item.text

          if (label && hasSpecValue(value)) {
            return [{ label: formatSpecLabel(label), value: stringifySpecValue(value) }]
          }

          return normalizeSpecRows(item)
        }

        return []
      })
      .filter((row) => row && hasSpecValue(row.value))
  }

  if (typeof source === 'object') {
    return Object.entries(source)
      .filter(([, value]) => hasSpecValue(value))
      .map(([key, value]) => ({
        label: formatSpecLabel(key),
        value: stringifySpecValue(value),
      }))
      .filter((row) => hasSpecValue(row.value))
  }

  return []
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function inferCategoryName(product) {
  const text = normalizeSearchText(`${product?.name || ''} ${product?.description || ''}`)

  if (text.includes('laptop') || text.includes('macbook') || text.includes('thinkpad')) {
    return 'Laptop'
  }

  if (text.includes('watch') || text.includes('dong ho') || text.includes('smartwatch')) {
    return 'Smartwatch'
  }

  if (text.includes('tablet') || text.includes('ipad') || text.includes('pad ')) {
    return 'Tablet'
  }

  if (text.includes('iphone') || text.includes('galaxy') || text.includes('dien thoai')) {
    return 'Điện thoại'
  }

  return 'Không xác định'
}

function getProductCategoryName(product, categories = []) {
  const categoryFromList = categories.find(
    (category) => Number(category.id) === Number(product?.categoryId),
  )

  return product?.category?.name || categoryFromList?.name || inferCategoryName(product)
}

function getProductType(product, categoryName) {
  const text = normalizeSearchText(`${categoryName} ${product?.name || ''} ${product?.description || ''}`)

  if (text.includes('laptop') || text.includes('macbook') || text.includes('thinkpad')) {
    return 'laptop'
  }

  if (text.includes('smartwatch') || text.includes('watch') || text.includes('dong ho')) {
    return 'watch'
  }

  if (text.includes('tablet') || text.includes('ipad') || text.includes('pad ')) {
    return 'tablet'
  }

  if (text.includes('dien thoai') || text.includes('iphone') || text.includes('galaxy')) {
    return 'phone'
  }

  return 'default'
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword))
}

function getSpecText(product) {
  return normalizeSearchText(
    `${product?.name || ''} ${product?.manufacturer || ''} ${product?.description || ''}`,
  )
}

function inferScreen(product, type) {
  const source = `${product?.name || ''} ${product?.description || ''}`
  const inchMatch = source.match(/(\d{1,2}(?:[.,]\d)?)\s*(?:inch|")/i)

  if (inchMatch) {
    return `${inchMatch[1].replace(',', '.')} inch`
  }

  if (type === 'laptop') {
    return 'Màn hình laptop theo dòng sản phẩm'
  }

  if (type === 'phone') {
    return 'Màn hình cảm ứng, phù hợp giải trí và làm việc hằng ngày'
  }

  if (type === 'tablet') {
    return 'Màn hình lớn, phù hợp học tập, ghi chú và giải trí'
  }

  if (type === 'watch') {
    return 'Màn hình đồng hồ thông minh'
  }

  return 'Theo mô tả sản phẩm'
}

function inferCpu(product, type) {
  const text = getSpecText(product)
  const chipMatch = product?.description?.match(/chip\s+([^,.]+)/i)

  if (chipMatch) {
    return chipMatch[1].trim()
  }

  if (type === 'laptop') {
    if (text.includes('macbook')) {
      const appleChipMatch = product.name.match(/\bM\d(?:\sPro|\sMax)?\b/i)
      return appleChipMatch ? `Apple ${appleChipMatch[0]}` : 'Apple Silicon'
    }

    if (includesAny(text, ['gaming', 'rog', 'tuf', 'legion', 'nitro', 'katana'])) {
      return 'Intel Core i7 / AMD Ryzen 7 theo dòng máy'
    }

    return 'Intel Core / AMD Ryzen theo dòng máy'
  }

  if (type === 'phone') {
    if (text.includes('iphone')) {
      return text.includes('15 pro') ? 'Apple A17 Pro' : 'Apple A-series'
    }

    if (text.includes('galaxy s24') || text.includes('xiaomi 14')) {
      return 'Snapdragon 8 series'
    }

    return 'Snapdragon / MediaTek theo phiên bản'
  }

  if (type === 'tablet') {
    if (text.includes('ipad')) {
      const appleChipMatch = product.name.match(/\bM\d\b/i)
      return appleChipMatch ? `Apple ${appleChipMatch[0]}` : 'Apple A/M-series'
    }

    return 'Snapdragon / MediaTek theo phiên bản'
  }

  if (type === 'watch') {
    return text.includes('apple watch') ? 'Apple S-series' : 'Chip xử lý smartwatch'
  }

  return 'Theo dòng sản phẩm'
}

function inferGpu(product, type) {
  const text = getSpecText(product)

  if (type === 'laptop') {
    if (text.includes('macbook')) {
      return 'Apple GPU'
    }

    if (includesAny(text, ['gaming', 'rog', 'tuf', 'legion', 'nitro', 'katana'])) {
      return 'NVIDIA GeForce RTX theo dòng máy'
    }

    return 'GPU tích hợp / GPU rời tùy phiên bản'
  }

  if (type === 'phone' || type === 'tablet') {
    return text.includes('ipad') || text.includes('iphone') ? 'Apple GPU' : 'GPU tích hợp trong chipset'
  }

  return 'Theo dòng sản phẩm'
}

function inferRam(product, type) {
  const text = getSpecText(product)

  if (type === 'laptop') {
    return includesAny(text, ['gaming', 'pro', 'xps', 'thinkpad']) ? '16GB hoặc cao hơn' : '8GB - 16GB'
  }

  if (type === 'phone') {
    return '8GB - 12GB tùy phiên bản'
  }

  if (type === 'tablet') {
    return '4GB - 8GB tùy phiên bản'
  }

  return 'Theo dòng sản phẩm'
}

function inferBattery(product, type) {
  const text = getSpecText(product)

  if (text.includes('pin lau') || text.includes('pin tot')) {
    return 'Pin lâu theo mô tả sản phẩm'
  }

  if (text.includes('sac nhanh')) {
    return 'Pin hỗ trợ sạc nhanh'
  }

  if (type === 'laptop') {
    return 'Pin phù hợp làm việc di động'
  }

  if (type === 'watch') {
    return 'Pin dùng nhiều ngày tùy chế độ'
  }

  if (type === 'tablet') {
    return 'Pin phục vụ học tập và giải trí hằng ngày'
  }

  return 'Pin dùng hằng ngày'
}

function inferWeight(product, type) {
  const text = getSpecText(product)

  if (text.includes('rat nhe')) {
    return 'Rất nhẹ theo mô tả sản phẩm'
  }

  if (text.includes('mong nhe') || text.includes('gon nhe')) {
    return 'Thiết kế mỏng nhẹ'
  }

  if (type === 'laptop') {
    return 'Khối lượng theo dòng máy'
  }

  if (type === 'watch') {
    return 'Nhẹ, phù hợp đeo hằng ngày'
  }

  if (type === 'tablet') {
    return 'Dễ cầm, phù hợp dùng di động'
  }

  return 'Theo dòng sản phẩm'
}

function inferStorage(product, type) {
  if (type === 'laptop') {
    return 'SSD theo phiên bản bán'
  }

  if (type === 'watch') {
    return 'Bộ nhớ trong theo phiên bản'
  }

  return '128GB - 256GB tùy phiên bản'
}

function inferCamera(product, type) {
  const description = product?.description || ''

  if (description.toLowerCase().includes('camera')) {
    return description
  }

  if (type === 'phone') {
    return 'Camera sau và camera trước phục vụ chụp ảnh hằng ngày'
  }

  if (type === 'tablet') {
    return 'Camera hỗ trợ học online, gọi video và quét tài liệu'
  }

  return 'Theo mô tả sản phẩm'
}

function inferOperatingSystem(product, type) {
  const text = getSpecText(product)

  if (type === 'laptop') {
    return text.includes('macbook') ? 'macOS' : 'Windows'
  }

  if (type === 'phone') {
    return text.includes('iphone') ? 'iOS' : 'Android'
  }

  if (type === 'tablet') {
    return text.includes('ipad') ? 'iPadOS' : 'Android'
  }

  if (type === 'watch') {
    return text.includes('apple watch') ? 'watchOS' : 'Hệ điều hành smartwatch của hãng'
  }

  return 'Theo dòng sản phẩm'
}

function getTypeSpecificationRows(product, type) {
  if (type === 'laptop') {
    return [
      { label: 'CPU', value: inferCpu(product, type) },
      { label: 'GPU', value: inferGpu(product, type) },
      { label: 'RAM', value: inferRam(product, type) },
      { label: 'Màn hình', value: inferScreen(product, type) },
      { label: 'Pin', value: inferBattery(product, type) },
      { label: 'Khối lượng', value: inferWeight(product, type) },
    ]
  }

  if (type === 'phone') {
    return [
      { label: 'CPU', value: inferCpu(product, type) },
      { label: 'GPU', value: inferGpu(product, type) },
      { label: 'RAM', value: inferRam(product, type) },
      { label: 'Bộ nhớ', value: inferStorage(product, type) },
      { label: 'Màn hình', value: inferScreen(product, type) },
      { label: 'Camera', value: inferCamera(product, type) },
      { label: 'Pin', value: inferBattery(product, type) },
      { label: 'Hệ điều hành', value: inferOperatingSystem(product, type) },
      { label: 'Khối lượng', value: inferWeight(product, type) },
    ]
  }

  if (type === 'tablet') {
    return [
      { label: 'CPU', value: inferCpu(product, type) },
      { label: 'GPU', value: inferGpu(product, type) },
      { label: 'RAM', value: inferRam(product, type) },
      { label: 'Bộ nhớ', value: inferStorage(product, type) },
      { label: 'Màn hình', value: inferScreen(product, type) },
      { label: 'Camera', value: inferCamera(product, type) },
      { label: 'Pin', value: inferBattery(product, type) },
      { label: 'Hệ điều hành', value: inferOperatingSystem(product, type) },
      { label: 'Khối lượng', value: inferWeight(product, type) },
    ]
  }

  if (type === 'watch') {
    return [
      { label: 'Màn hình', value: inferScreen(product, type) },
      { label: 'Pin', value: inferBattery(product, type) },
      { label: 'Bộ nhớ', value: inferStorage(product, type) },
      { label: 'Hệ điều hành', value: inferOperatingSystem(product, type) },
      { label: 'Kết nối', value: 'Bluetooth, Wi-Fi, GPS tùy phiên bản' },
      { label: 'Cảm biến', value: 'Theo dõi sức khỏe, luyện tập và giấc ngủ' },
      { label: 'Kháng nước', value: 'Theo chuẩn của từng dòng đồng hồ' },
      { label: 'Khối lượng', value: inferWeight(product, type) },
    ]
  }

  return [
    { label: 'Màn hình', value: inferScreen(product, type) },
    { label: 'Pin', value: inferBattery(product, type) },
    { label: 'Khối lượng', value: inferWeight(product, type) },
  ]
}

function getProductField(product, keys) {
  const key = keys.find((fieldKey) => hasSpecValue(product?.[fieldKey]))
  return key ? product[key] : ''
}

function splitSpecOptions(value) {
  const text = stringifySpecValue(value)

  if (!text.includes('/') && !text.includes('|')) {
    return []
  }

  return text
    .split(/\s*(?:\/|\|)\s*/)
    .map((option) => option.trim())
    .filter(Boolean)
}

function readMoneyAmount(value) {
  const text = String(value || '')
  const match = text.match(/(\d{1,3}(?:[.,]\d{3}){2,}|\d{7,})/)

  if (!match) {
    return null
  }

  return Number(match[1].replace(/[.,]/g, ''))
}

function cleanVariantOptionLabel(value) {
  return String(value || '')
    .replace(/\(?\s*[+-]\s*(?:\d{1,3}(?:[.,]\d{3}){2,}|\d{7,})\s*(?:đ|vnd)?\s*\)?/gi, '')
    .replace(/\(?\s*(?:=|:)\s*(?:\d{1,3}(?:[.,]\d{3}){2,}|\d{7,})\s*(?:đ|vnd)?\s*\)?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[-–]\s*$/g, '')
    .trim()
}

function parseVariantOptionPrice(optionText, basePrice) {
  const text = String(optionText || '').trim()
  const deltaMatch = text.match(/([+-])\s*(\d{1,3}(?:[.,]\d{3}){2,}|\d{7,})\s*(?:đ|vnd)?/i)

  if (deltaMatch) {
    const amount = readMoneyAmount(deltaMatch[2]) || 0
    return {
      label: cleanVariantOptionLabel(text),
      priceDelta: deltaMatch[1] === '-' ? -amount : amount,
    }
  }

  const absoluteMatch = text.match(/(?:=|:|\()\s*(\d{1,3}(?:[.,]\d{3}){2,}|\d{7,})\s*(?:đ|vnd)?\)?/i)

  if (absoluteMatch) {
    const absolutePrice = readMoneyAmount(absoluteMatch[1]) || basePrice
    return {
      label: cleanVariantOptionLabel(text),
      priceDelta: absolutePrice - basePrice,
    }
  }

  return {
    label: cleanVariantOptionLabel(text) || text,
    priceDelta: null,
  }
}

function readCapacityGb(optionText) {
  const match = String(optionText || '').match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)\b/i)

  if (!match) {
    return 0
  }

  const amount = Number(match[1].replace(',', '.'))
  return match[2].toUpperCase() === 'TB' ? amount * 1024 : amount
}

function roundVariantDelta(value) {
  return Math.max(0, Math.round(value / 100000) * 100000)
}

function inferVariantPriceDelta(product, fieldId, optionText, optionIndex, optionTexts) {
  if (optionIndex <= 0) {
    return 0
  }

  const basePrice = Number(product?.price || 0)
  const percent = VARIANT_PRICE_STEP_PERCENT[fieldId] || 0.05
  const optionCapacity = readCapacityGb(optionText)
  const baseCapacity = readCapacityGb(optionTexts[0])
  const capacitySteps = optionCapacity > baseCapacity && baseCapacity > 0
    ? Math.max(1, Math.round(Math.log2(optionCapacity / baseCapacity)))
    : optionIndex

  return roundVariantDelta(basePrice * percent * capacitySteps)
}

function getVariantGroups(product) {
  return PRODUCT_SPEC_FIELDS
    .filter((field) => VARIANT_SPEC_IDS.has(field.id))
    .map((field) => {
      const rawValue = getProductField(product, field.keys)
      const optionTexts = splitSpecOptions(rawValue)

      if (optionTexts.length < 2) {
        return null
      }

      const basePrice = Number(product?.price || 0)
      const options = optionTexts.map((optionText, optionIndex) => {
        const parsed = parseVariantOptionPrice(optionText, basePrice)
        const priceDelta = parsed.priceDelta ?? inferVariantPriceDelta(
          product,
          field.id,
          parsed.label,
          optionIndex,
          optionTexts,
        )

        const optionPrice = Math.max(basePrice, basePrice + priceDelta)

        return {
          id: `${field.id}-${optionIndex}-${normalizeSearchText(parsed.label).replace(/\s+/g, '-')}`,
          label: parsed.label,
          value: parsed.label,
          priceDelta: optionPrice - basePrice,
          price: optionPrice,
        }
      })

      return {
        id: field.id,
        label: field.label,
        options,
      }
    })
    .filter(Boolean)
}

function getInitialSelectedSpecValues(product) {
  return getVariantGroups(product).reduce((result, group) => ({
    ...result,
    [group.id]: group.options[0]?.value || '',
  }), {})
}

function getSelectedVariantOption(group, selectedSpecValues) {
  return group.options.find((option) => option.value === selectedSpecValues[group.id]) || group.options[0]
}

function getSelectedVariantPrice(product, variantGroups, selectedSpecValues) {
  const basePrice = Number(product?.price || 0)
  const totalDelta = variantGroups.reduce((sum, group) => {
    const selectedOption = getSelectedVariantOption(group, selectedSpecValues)
    return sum + Number(selectedOption?.priceDelta || 0)
  }, 0)

  return Math.max(basePrice, basePrice + totalDelta)
}

function getSelectedSpecSummary(variantGroups, selectedSpecValues) {
  return variantGroups
    .map((group) => {
      const selectedOption = getSelectedVariantOption(group, selectedSpecValues)
      return selectedOption ? `${group.label}: ${selectedOption.label}` : ''
    })
    .filter(Boolean)
    .join(', ')
}

function getSelectedCartProduct(product, variantGroups, selectedSpecValues, selectedPrice) {
  const selectedSpecifications = variantGroups
    .map((group) => {
      const selectedOption = getSelectedVariantOption(group, selectedSpecValues)

      return selectedOption
        ? { id: group.id, label: group.label, value: selectedOption.label }
        : null
    })
    .filter(Boolean)
  const variantKey = selectedSpecifications
    .map((spec) => `${spec.id}:${normalizeSearchText(spec.value).replace(/\s+/g, '-')}`)
    .join('|')
  const cartKey = variantKey ? `${product.id}:${variantKey}` : String(product.id)

  return {
    ...product,
    basePrice: product.price,
    cartKey,
    price: selectedPrice,
    selectedSpecifications,
    selectedSpecSummary: getSelectedSpecSummary(variantGroups, selectedSpecValues),
  }
}

function getDatabaseSpecificationRows(product, selectedSpecValues = {}) {
  return PRODUCT_SPEC_FIELDS
    .map((field) => ({
      label: field.label,
      value: selectedSpecValues[field.id] || stringifySpecValue(getProductField(product, field.keys)),
    }))
    .filter((row) => hasSpecValue(row.value))
}

function isProductIdentitySpec(row) {
  const normalizedLabel = normalizeSearchText(row?.label).replace(/[\s_-]+/g, '')
  return ['id', 'productid', 'product', 'masanpham'].includes(normalizedLabel)
}

function getProductSpecificationRows(product, categories = [], selectedSpecValues = {}) {
  const databaseRows = getDatabaseSpecificationRows(product, selectedSpecValues)

  if (databaseRows.length > 0) {
    return databaseRows
  }

  const backendRows = SPEC_SOURCE_KEYS
    .flatMap((key) => normalizeSpecRows(product?.[key]))
    .filter((row) => row && hasSpecValue(row.value) && !isProductIdentitySpec(row))

  if (backendRows.length > 0) {
    return backendRows
  }

  const categoryName = getProductCategoryName(product, categories)
  const type = getProductType(product, categoryName)

  return getTypeSpecificationRows(product, type)
}

export default function ProductPage({
  productId,
  reviewTarget = '',
  auth,
  categories = [],
  onNavigate,
  onAddToCart,
  onBuyNow,
  onNotify,
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [selectedSpecValues, setSelectedSpecValues] = useState({})
  const [quantity, setQuantity] = useState(1)
  const [reviewData, setReviewData] = useState(EMPTY_REVIEW_DATA)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState('')
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const authToken = getAuthToken(auth)

  useEffect(() => {
    let cancelled = false

    async function loadProduct() {
      setLoading(true)
      setError('')
      setQuantity(1)
      setSelectedSpecValues({})

      try {
        const currentProduct = await api.getProduct(productId)

        if (cancelled) {
          return
        }

        setProduct(currentProduct)
        setSelectedSpecValues(getInitialSelectedSpecValues(currentProduct))

        const relatedResponse = await api.getProducts({
          categoryId: currentProduct.categoryId,
          page: 1,
          pageSize: 4,
        })

        if (!cancelled) {
          setRelatedProducts(
            (relatedResponse.items || []).filter((item) => item.id !== currentProduct.id),
          )
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

    loadProduct()

    return () => {
      cancelled = true
    }
  }, [productId])

  useEffect(() => {
    let cancelled = false

    async function loadReviews() {
      setReviewsLoading(true)
      setReviewsError('')

      try {
        const nextReviewData = await getMergedProductReviewData(productId, authToken)
        const myReview = nextReviewData.myReview

        if (!cancelled) {
          setReviewData(nextReviewData)
          setReviewForm({
            rating: Number(myReview?.rating || myReview?.Rating || 5),
            content: myReview?.content || myReview?.Content || '',
          })
        }
      } catch (requestError) {
        if (!cancelled) {
          setReviewData(EMPTY_REVIEW_DATA)
          setReviewsError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false)
        }
      }
    }

    loadReviews()

    return () => {
      cancelled = true
    }
  }, [productId, authToken])

  useEffect(() => {
    if (loading || !product || reviewTarget !== '#reviews') {
      return undefined
    }

    const scrollTimer = window.setTimeout(() => {
      const reviewSection = document.getElementById('reviews')

      if (reviewSection) {
        reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        reviewSection.focus({ preventScroll: true })
      }
    }, 100)

    return () => window.clearTimeout(scrollTimer)
  }, [loading, product, reviewTarget])

  const variantGroups = product ? getVariantGroups(product) : []
  const selectedPrice = product
    ? getSelectedVariantPrice(product, variantGroups, selectedSpecValues)
    : 0
  const selectedCartProduct = product
    ? getSelectedCartProduct(product, variantGroups, selectedSpecValues, selectedPrice)
    : null
  const specificationRows = product
    ? getProductSpecificationRows(product, categories, selectedSpecValues)
    : []
  const maxQuantity = product ? Math.max(1, product.stock || 1) : 1
  const averageRatingLabel = reviewData.totalCount > 0
    ? reviewData.averageRating.toFixed(1)
    : '0.0'
  const canWriteReview = Boolean(authToken && reviewData.canReview)
  const hasMyReview = Boolean(reviewData.myReview)
  const changeQuantity = (nextQuantity) => {
    const safeQuantity = Number(nextQuantity || 1)
    setQuantity(Math.max(1, Math.min(safeQuantity, maxQuantity)))
  }

  async function submitReview(event) {
    event.preventDefault()

    if (!authToken) {
      onNavigate(`/login?redirect=${encodeURIComponent(`/product/${productId}`)}`)
      return
    }

    if (!product) {
      return
    }

    const content = reviewForm.content.trim()
    if (!content) {
      onNotify?.('error', 'Vui lòng nhập nội dung đánh giá.')
      return
    }

    setSubmittingReview(true)
    setReviewsError('')

    try {
      const response = await api.saveProductReview(
        product.id,
        {
          rating: Number(reviewForm.rating),
          content,
        },
        authToken,
      )
      const refreshedReviews = await getMergedProductReviewData(product.id, authToken)
      const myReview = refreshedReviews.myReview

      setReviewData(refreshedReviews)
      setReviewForm({
        rating: Number(myReview?.rating || myReview?.Rating || reviewForm.rating),
        content: myReview?.content || myReview?.Content || content,
      })
      onNotify?.('success', response?.message || 'Đã gửi đánh giá sản phẩm.')
    } catch (requestError) {
      setReviewsError(requestError.message)
      onNotify?.('error', requestError.message)
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">Chi tiết sản phẩm</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chủ
                  </LinkButton>
                </li>
                <li>
                  <LinkButton to="/store" onNavigate={onNavigate}>
                    Cửa hàng
                  </LinkButton>
                </li>
                <li className="active">{product?.name || 'Đang tải'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {loading ? (
            <div className="empty-state">Đang tải chi tiết sản phẩm...</div>
          ) : error || !product ? (
            <div className="empty-state error-state">{error || 'Không tìm thấy sản phẩm.'}</div>
          ) : (
            <>
              <div className="row">
                <div className="col-md-5 col-md-push-2">

                  <div id="product-main-img" className="product-preview">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      onError={(event) => handleProductImageError(event, product)}
                    />
                  </div>
                </div>

                <div className="col-md-2 col-md-pull-5">
                  <div id="product-imgs" className="product-preview-nav">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      onError={(event) => handleProductImageError(event, product)}
                    />
                    <img
                      src={FALLBACK_IMAGES[(Number(product.id) + 1) % FALLBACK_IMAGES.length]}
                      alt={`${product.name} gallery`}
                    />
                    <img
                      src={FALLBACK_IMAGES[(Number(product.id) + 2) % FALLBACK_IMAGES.length]}
                      alt={`${product.name} gallery`}
                    />
                  </div>
                </div>

                <div className="col-md-5">
                  <div className="product-details">
                    <h2 className="product-name">{product.name}</h2>
                    {product.manufacturer && (
                      <p className="product-manufacturer detail-manufacturer">
                        <span>{'H\u00e3ng'}: </span>{product.manufacturer}
                      </p>
                    )}
                    <div>
                      <div className="product-rating product-rating-summary">
                        {renderRatingStars(reviewData.averageRating)}
                        <span>
                          {reviewData.totalCount > 0
                            ? `${averageRatingLabel} (${reviewData.totalCount} đánh giá)`
                            : 'Chưa có đánh giá'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="product-price">{formatCurrency(selectedPrice)}</h3>
                      <span className="product-available">
                        {product.stock > 0
                          ? `Còn ${product.stock} sản phẩm`
                          : 'Tạm hết hàng'}
                      </span>
                    </div>
                    <p>{product.description || 'Chưa có mô tả cho sản phẩm này.'}</p>
                    {variantGroups.length > 0 && (
                      <div className="product-variant-section" aria-label="Chọn thông số kỹ thuật">
                        {variantGroups.map((group) => (
                          <div className="variant-option-group" key={group.id}>
                            <div className="variant-option-label">{group.label}</div>
                            <div className="variant-option-list">
                              {group.options.map((option) => {
                                const active = getSelectedVariantOption(group, selectedSpecValues)?.value === option.value

                                return (
                                  <button
                                    className={`variant-option-btn ${active ? 'active' : ''}`}
                                    key={option.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedSpecValues((current) => ({
                                        ...current,
                                        [group.id]: option.value,
                                      }))
                                    }
                                  >
                                    <span>{option.label}</span>
                                    <small>{formatCurrency(option.price)}</small>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                        <div className="variant-price-note">Giá bán thay đổi theo thông số đã chọn.</div>
                      </div>
                    )}

                    <div className="product-spec-section product-spec-section-inline">
                      <div className="section-title">
                        <h3 className="title">Thông số kỹ thuật</h3>
                      </div>
                      <div className="product-spec-table" aria-label="Thông số kỹ thuật">
                        {specificationRows.map((spec) => (
                          <div className="product-spec-row" key={`${spec.label}-${spec.value}`}>
                            <div className="product-spec-label">{spec.label}</div>
                            <div className="product-spec-value">{spec.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="add-to-cart product-cart-panel">
                      <div className="qty-label">
                        Số lượng
                        <div className="detail-quantity-control">
                          <button
                            className="detail-quantity-btn"
                            type="button"
                            disabled={quantity <= 1}
                            onClick={() => changeQuantity(quantity - 1)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={maxQuantity}
                            value={quantity}
                            onChange={(event) => changeQuantity(event.target.value)}
                          />
                          <button
                            className="detail-quantity-btn"
                            type="button"
                            disabled={quantity >= maxQuantity}
                            onClick={() => changeQuantity(quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="product-detail-actions">
                        <button
                          className="add-to-cart-btn"
                          type="button"
                          disabled={product.stock <= 0}
                          onClick={() => onAddToCart(selectedCartProduct, quantity)}
                        >
                          <i className="fa fa-shopping-cart" /> Thêm vào giỏ
                        </button>
                        <button
                          className="buy-now-detail-btn"
                          type="button"
                          disabled={product.stock <= 0}
                          onClick={() => onBuyNow(selectedCartProduct, quantity)}
                        >
                          Mua ngay
                        </button>
                      </div>
                    </div>

                    {/* <ul className="product-links">
                      <li>Danh mục:</li>
                      <li>
                        <LinkButton
                          to={buildStorePath({ categoryId: product.categoryId })}
                          onNavigate={onNavigate}
                        >
                          {categoryName}
                        </LinkButton>
                      </li>
                    </ul> */}
                  </div>
                </div>
              </div>

              <div className="product-review-section" id="reviews" tabIndex="-1">
                <div className="product-review-header">
                  <div>
                    <h3>Đánh giá sản phẩm</h3>
                    <p>{reviewData.totalCount} đánh giá từ khách đã mua hàng</p>
                  </div>
                  <div className="product-review-score">
                    <strong>{averageRatingLabel}</strong>
                    <span>{renderRatingStars(reviewData.averageRating)}</span>
                  </div>
                </div>

                {reviewsError && (
                  <div className="empty-state compact error-state">{reviewsError}</div>
                )}

                {auth ? (
                  canWriteReview ? (
                    <form className="product-review-form" onSubmit={submitReview}>
                      <div className="review-form-title">
                        {hasMyReview ? 'Cập nhật đánh giá của bạn' : 'Đánh giá của bạn'}
                      </div>
                      <div className="review-star-input" aria-label="Chọn số sao">
                        {RATING_STARS.map((star) => (
                          <button
                            className={star <= Number(reviewForm.rating) ? 'active' : ''}
                            key={star}
                            type="button"
                            onClick={() =>
                              setReviewForm((current) => ({
                                ...current,
                                rating: star,
                              }))
                            }
                          >
                            <i className="fa fa-star" />
                          </button>
                        ))}
                      </div>
                      <textarea
                        maxLength="1000"
                        placeholder="Chia sẻ trải nghiệm thực tế của bạn về sản phẩm"
                        value={reviewForm.content}
                        onChange={(event) =>
                          setReviewForm((current) => ({
                            ...current,
                            content: event.target.value,
                          }))
                        }
                      />
                      <div className="review-form-actions">
                        <small>{reviewForm.content.length}/1000</small>
                        <button className="primary-btn" type="submit" disabled={submittingReview}>
                          {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="review-note">
                      Bạn có thể đánh giá sau khi đơn hàng chứa sản phẩm này được xác nhận đã nhận hàng.
                    </div>
                  )
                ) : (
                  <div className="review-note review-login-note">
                    <span>Đăng nhập bằng tài khoản đã mua hàng để gửi đánh giá.</span>
                    <LinkButton
                      className="secondary-btn"
                      to={`/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`}
                      onNavigate={onNavigate}
                    >
                      Đăng nhập
                    </LinkButton>
                  </div>
                )}

                <div className="product-review-list">
                  {reviewsLoading ? (
                    <div className="empty-state compact">Đang tải đánh giá...</div>
                  ) : reviewData.items.length === 0 ? (
                    <div className="empty-state compact">Chưa có đánh giá nào cho sản phẩm này.</div>
                  ) : (
                    reviewData.items.map((review) => (
                      <article className="product-review-item" key={review.id || review.Id}>
                        <div className="review-item-header">
                          <div>
                            <strong>{getReviewCustomerName(review)}</strong>
                            <span>{formatDate(review.createdAt || review.CreatedAt)}</span>
                          </div>
                          <div className="product-rating">
                            {renderRatingStars(review.rating || review.Rating)}
                          </div>
                        </div>
                        <p>{review.content || review.Content}</p>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="section">
                <SectionHeader
                  title="Sản phẩm liên quan"
                  //description="Lấy theo danh mục từ backend hiện tại"
                  onNavigate={onNavigate}
                />
                <div className="row">
                  {relatedProducts.length === 0 ? (
                    <div className="empty-state">Chưa có sản phẩm liên quan.</div>
                  ) : (
                    relatedProducts.map((item) => (
                      <ProductCard
                        key={item.id}
                        product={item}
                        onNavigate={onNavigate}
                        onAddToCart={onAddToCart}
                        onBuyNow={onBuyNow}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
