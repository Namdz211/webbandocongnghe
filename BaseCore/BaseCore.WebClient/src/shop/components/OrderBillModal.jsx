import { formatCurrency } from '../utils/formatters.js'

const SELLER_STAMP_TEXT = 'C\u00d4NG TY TNHH HN MOBILE'

const STORE_INFO = {
  name: SELLER_STAMP_TEXT,
  address: '236 Hoàng Quốc Việt, Cổ Nhuế, Nghĩa Đô, Hà Nội',
  phone: '0975274355',
  //businessLine: 'M\u1eb7t h\u00e0ng c\u00f4ng ngh\u1ec7',
}

function formatBillDate(value) {
  const date = value ? new Date(value) : new Date()

  if (Number.isNaN(date.getTime())) {
    return { day: '...', month: '...', year: '...' }
  }

  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: date.getFullYear(),
  }
}

const ITEM_ROWS_PER_PAGE = 10

function buildBillPages(items) {
  const normalizedItems = Array.isArray(items) ? items : []
  const pageCount = Math.max(1, Math.ceil(normalizedItems.length / ITEM_ROWS_PER_PAGE))

  return Array.from({ length: pageCount }, (_, pageIndex) => {
    const startIndex = pageIndex * ITEM_ROWS_PER_PAGE
    const pageItems = normalizedItems.slice(startIndex, startIndex + ITEM_ROWS_PER_PAGE)
    const rows = Array.from(
      { length: ITEM_ROWS_PER_PAGE },
      (_, index) => pageItems[index] || null,
    )

    return {
      pageIndex,
      rows,
      startIndex,
      isLastPage: pageIndex === pageCount - 1,
    }
  })
}

const PROMOTION_LABELS = {
  'VIP customer discount': '\u01afu \u0111\u00e3i kh\u00e1ch VIP',
  'Loyal customer discount': '\u01afu \u0111\u00e3i kh\u00e1ch th\u00e2n thi\u1ebft',
  'Potential customer discount': '\u01afu \u0111\u00e3i kh\u00e1ch ti\u1ec1m n\u0103ng',
  'New customer discount': '\u01afu \u0111\u00e3i kh\u00e1ch m\u1edbi',
}

function formatPromotionName(value) {
  return String(value || '')
    .split(' + ')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      const couponMatch = name.match(/^Coupon\s+(.+)$/i)

      if (couponMatch) {
        return `M\u00e3 ${couponMatch[1].trim()}`
      }

      return PROMOTION_LABELS[name] || name
    })
    .join(' + ')
}

function formatCustomerAddress(value) {
  const address = String(value || '').trim()
  const addressMatch = address.match(/(?:^|\|\s*)\u0110\u1ecba ch\u1ec9:\s*(.+)$/i)

  return addressMatch ? addressMatch[1].trim() : address
}

export default function OrderBillModal({
  bill,
  onClose,
  onGoNext,
  goNextLabel,
}) {
  if (!bill) {
    return null
  }

  const pages = buildBillPages(bill.items)
  const dateParts = formatBillDate(bill.orderDate)
  const customerAddress = formatCustomerAddress(bill.customerAddress || bill.shippingAddress)
  const totalQuantity = (Array.isArray(bill.items) ? bill.items : [])
    .reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
  const promotionLabel = formatPromotionName(bill.promotionName)
  const discountLabel = promotionLabel
    ? `Gi\u1ea3m gi\u00e1 (${promotionLabel}):`
    : 'Gi\u1ea3m gi\u00e1:'

  function handlePrint() {
    const originalTitle = document.title

    document.title = ''

    const restoreTitle = () => {
      document.title = originalTitle
      window.removeEventListener('afterprint', restoreTitle)
    }

    window.addEventListener('afterprint', restoreTitle)
    window.print()
    window.setTimeout(restoreTitle, 1000)
  }

  return (
    <div className="bill-modal-backdrop" role="dialog" aria-modal="true">
      <div className="bill-modal">
        <div className="bill-modal-actions no-print">
          <button className="secondary-btn" type="button" onClick={handlePrint}>
            <i className="fa fa-print" />
            {'In h\u00f3a \u0111\u01a1n'}
          </button>
          <button className="primary-btn" type="button" onClick={onGoNext}>
            {goNextLabel || 'Xem \u0111\u01a1n h\u00e0ng'}
          </button>
          <button className="bill-close-btn" type="button" onClick={onClose} aria-label="\u0110\u00f3ng h\u00f3a \u0111\u01a1n">
            <i className="fa fa-times" />
          </button>
        </div>

        <div className="sales-bill-pages">
          {pages.map((page) => (
            <div
              className={`sales-bill invoice-print-area ${page.isLastPage ? 'last-page' : ''}`}
              key={page.pageIndex}
            >
              <div className="sales-bill-heading">
                <div className="sales-bill-store">
                  <h2>{STORE_INFO.name}</h2>
                  <p>
                    <strong>{'\u0110\u1ecba ch\u1ec9:'}</strong>
                    <span>{STORE_INFO.address}</span>
                  </p>
                  <p>
                    <strong>{'\u0110T:'}</strong>
                    <span>{STORE_INFO.phone}</span>
                  </p>
                </div>
                <div className="sales-bill-title">
                  <h1>{'H\u00d3A \u0110\u01a0N B\u00c1N H\u00c0NG'}</h1>
                  <p>{STORE_INFO.businessLine}</p>
                  {bill.orderId && <small>{`M\u00e3 \u0111\u01a1n: #${bill.orderId}`}</small>}
                  <div className="sales-bill-payment">
                    <small>
                      <span>{'H\u00ecnh th\u1ee9c thanh to\u00e1n:'}</span>
                      <strong>{bill.paymentMethodLabel || 'Ch\u01b0a x\u00e1c \u0111\u1ecbnh'}</strong>
                    </small>
                    <small>
                      <span>{'Tr\u1ea1ng th\u00e1i thanh to\u00e1n:'}</span>
                      <strong>{bill.paymentStatusLabel || 'Ch\u01b0a x\u00e1c \u0111\u1ecbnh'}</strong>
                    </small>
                  </div>
                </div>
              </div>

              <div className="sales-bill-customer">
                <p>
                  <span>{'T\u00ean kh\u00e1ch h\u00e0ng:'}</span>
                  <strong>{bill.customerName || '................................................'}</strong>
                </p>
                <p>
                  <span>{'\u0110\u1ecba ch\u1ec9:'}</span>
                  <strong>{customerAddress || '................................................'}</strong>
                </p>
                {bill.customerPhone && (
                  <p>
                    <span>{'\u0110i\u1ec7n tho\u1ea1i:'}</span>
                    <strong>{bill.customerPhone}</strong>
                  </p>
                )}
              </div>

              <table className="sales-bill-table">
                <thead>
                  <tr>
                    <th>{'STT'}</th>
                    <th>{'T\u00caN H\u00c0NG'}</th>
                    <th>{'S\u1ed0 L\u01af\u1ee2NG'}</th>
                    <th>{'\u0110\u01a0N GI\u00c1'}</th>
                    <th>{'TH\u00c0NH TI\u1ec0N'}</th>
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((item, index) => (
                    <tr key={`${item?.id || 'blank'}-${page.pageIndex}-${index}`}>
                      <td>{page.startIndex + index + 1}</td>
                      <td>{item?.name || ''}</td>
                      <td>{item ? item.quantity : ''}</td>
                      <td>{item ? formatCurrency(item.unitPrice) : ''}</td>
                      <td>{item ? formatCurrency(item.amount) : ''}</td>
                    </tr>
                  ))}
                  {page.isLastPage && (
                    <tr className="sales-bill-sum-row">
                      <td colSpan="2">{'C\u1ed8NG'}</td>
                      <td>{totalQuantity || ''}</td>
                      <td />
                      <td>{formatCurrency(bill.subtotalAmount)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {page.isLastPage && Number(bill.discountAmount || 0) > 0 && (
                <div className="sales-bill-discount">
                  <span>{discountLabel}</span>
                  <strong>-{formatCurrency(bill.discountAmount)}</strong>
                </div>
              )}

              {page.isLastPage && (
                <>
                  <div className="sales-bill-total-line">
                    <span>{'Th\u00e0nh ti\u1ec1n:'}</span>
                    <strong>{formatCurrency(bill.totalAmount)}</strong>
                  </div>

                  <div className="sales-bill-signatures">
                    <div className="sales-bill-signature-cell">
                      <strong>{'KH\u00c1CH H\u00c0NG'}</strong>
                    </div>
                    <div className="sales-bill-signature-cell seller">
                      <div className="sales-bill-date">
                        {'Ng\u00e0y'} {dateParts.day} {'th\u00e1ng'} {dateParts.month} {'n\u0103m'} {dateParts.year}
                      </div>
                      <strong>{'NG\u01af\u1edcI B\u00c1N H\u00c0NG'}</strong>
                      <div className="sales-bill-stamp" aria-label="D\u1ea5u c\u00f4ng ty">
                        <span>{SELLER_STAMP_TEXT}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* <div className="sales-bill-page-number">
                {`Trang ${page.pageIndex + 1}/${pages.length}`}
              </div> */}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
