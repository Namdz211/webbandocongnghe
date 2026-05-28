using System;
using System.ComponentModel.DataAnnotations;

namespace BaseCore.Entities
{
    /// <summary>
    /// Coupon - Mã giảm giá / Voucher
    /// </summary>
    public class Coupon
    {
        public int Id { get; set; }

        /// <summary>Mã coupon (duy nhất, viết hoa): SALE50, NEWUSER20...</summary>
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        /// <summary>Mô tả chương trình khuyến mãi</summary>
        [MaxLength(200)]
        public string Description { get; set; } = string.Empty;

        /// <summary>Loại giảm: "percent" (%) hoặc "fixed" (VND cố định)</summary>
        [MaxLength(10)]
        public string DiscountType { get; set; } = "percent"; // "percent" | "fixed"

        /// <summary>Giá trị giảm: nếu percent thì 10 = 10%, nếu fixed thì 50000 = 50.000đ</summary>
        public decimal DiscountValue { get; set; }

        /// <summary>Giảm tối đa (áp dụng cho percent, 0 = không giới hạn)</summary>
        public decimal MaxDiscountAmount { get; set; } = 0;

        /// <summary>Đơn hàng tối thiểu để áp dụng coupon</summary>
        public decimal MinOrderAmount { get; set; } = 0;

        /// <summary>Tổng số lần coupon có thể được dùng (0 = không giới hạn)</summary>
        public int UsageLimit { get; set; } = 0;

        /// <summary>Số lần đã được sử dụng</summary>
        public int UsedCount { get; set; } = 0;

        /// <summary>Ngày bắt đầu có hiệu lực</summary>
        public DateTime StartDate { get; set; } = DateTime.UtcNow;

        /// <summary>Ngày hết hạn</summary>
        public DateTime ExpiryDate { get; set; }

        /// <summary>Trạng thái kích hoạt</summary>
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
