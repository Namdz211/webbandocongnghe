using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// API Controller quản lý Mã giảm giá/Khuyến mãi (Coupons)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class CouponsController : ControllerBase
    {
        private readonly ICouponRepository _couponRepository;

        public CouponsController(ICouponRepository couponRepository)
        {
            _couponRepository = couponRepository;
        }

        /// <summary>
        /// Lấy danh sách mã giảm giá công khai còn hiệu lực để khách hàng xem ngoài trang chủ
        /// </summary>
        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicCoupons()
        {
            var coupons = await _couponRepository.GetPublicCouponsAsync();

            var result = coupons.Select(c => new
            {
                c.Id,
                c.Code,
                c.Description,
                c.DiscountType,
                c.DiscountValue,
                c.MaxDiscountAmount,
                c.MinOrderAmount,
                c.UsageLimit,
                c.UsedCount,
                c.ExpiryDate
            });

            return Ok(result);
        }

        /// <summary>
        /// Lấy toàn bộ danh sách mã giảm giá kèm bộ lọc (Chỉ dành cho Admin)
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword = null,
            [FromQuery] bool? isActive = null)
        {
            var coupons = await _couponRepository.GetAllCouponsAsync(keyword, isActive);
            return Ok(coupons);
        }

        /// <summary>
        /// Lấy chi tiết thông tin một mã giảm giá theo ID (Chỉ dành cho Admin)
        /// </summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetById(int id)
        {
            var coupon = await _couponRepository.GetByIdAsync(id);
            if (coupon == null)
                return NotFound(new { message = "Không tìm thấy mã giảm giá" });

            return Ok(coupon);
        }

        /// <summary>
        /// Kiểm tra tính hợp lệ và tính số tiền giảm của mã giảm giá khi đặt hàng
        /// </summary>
        [HttpGet("validate/{code}")]
        [Authorize]
        public async Task<IActionResult> Validate(string code, [FromQuery] decimal orderAmount)
        {
            var coupon = await _couponRepository.GetByCodeAsync(code);

            if (coupon == null)
                return NotFound(new { message = "Mã giảm giá không tồn tại" });

            if (!coupon.IsActive)
                return BadRequest(new { message = "Mã giảm giá đã bị vô hiệu hóa" });

            if (DateTime.UtcNow < coupon.StartDate)
                return BadRequest(new { message = "Mã giảm giá chưa đến thời gian sử dụng" });

            if (DateTime.UtcNow > coupon.ExpiryDate)
                return BadRequest(new { message = "Mã giảm giá đã hết hạn" });

            if (coupon.UsageLimit > 0 && coupon.UsedCount >= coupon.UsageLimit)
                return BadRequest(new { message = "Mã giảm giá đã hết lượt sử dụng" });

            if (orderAmount < coupon.MinOrderAmount)
                return BadRequest(new { message = $"Đơn hàng tối thiểu {coupon.MinOrderAmount:N0}đ mới được dùng mã này" });

            // Tính toán số tiền giảm thực tế dựa vào phần trăm hoặc giá tiền cố định
            decimal discountAmount;
            if (coupon.DiscountType == "percent")
            {
                discountAmount = orderAmount * coupon.DiscountValue / 100;
                // Áp dụng mức giảm tối đa nếu có cấu hình
                if (coupon.MaxDiscountAmount > 0)
                    discountAmount = Math.Min(discountAmount, coupon.MaxDiscountAmount);
            }
            else
            {
                discountAmount = coupon.DiscountValue;
            }

            return Ok(new
            {
                valid = true,
                couponId = coupon.Id,
                code = coupon.Code,
                description = coupon.Description,
                discountType = coupon.DiscountType,
                discountValue = coupon.DiscountValue,
                discountAmount = Math.Round(discountAmount, 0),
                finalAmount = Math.Max(0, orderAmount - discountAmount)
            });
        }

        /// <summary>
        /// Tạo mới một mã giảm giá (Chỉ dành cho Admin)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CouponCreateDto dto)
        {
            var validationMsg = ValidateDto(dto);
            if (validationMsg != null)
                return BadRequest(new { message = validationMsg });

            // Kiểm tra trùng code (mã code viết hoa làm chuẩn)
            var existing = await _couponRepository.GetByCodeAsync(dto.Code);
            if (existing != null)
                return BadRequest(new { message = $"Mã '{dto.Code.ToUpper()}' đã tồn tại" });

            var coupon = new Coupon
            {
                Code = dto.Code.Trim().ToUpper(),
                Description = dto.Description?.Trim() ?? "",
                DiscountType = dto.DiscountType ?? "percent",
                DiscountValue = dto.DiscountValue,
                MaxDiscountAmount = dto.MaxDiscountAmount ?? 0,
                MinOrderAmount = dto.MinOrderAmount ?? 0,
                UsageLimit = Math.Max(0, dto.UsageLimit ?? 0),
                StartDate = dto.StartDate ?? DateTime.UtcNow,
                ExpiryDate = dto.ExpiryDate,
                IsActive = dto.IsActive ?? true,
                CreatedAt = DateTime.UtcNow
            };

            await _couponRepository.AddAsync(coupon);

            return CreatedAtAction(nameof(GetById), new { id = coupon.Id }, coupon);
        }

        /// <summary>
        /// Cập nhật thông tin mã giảm giá (Chỉ dành cho Admin)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] CouponUpdateDto dto)
        {
            var coupon = await _couponRepository.GetByIdAsync(id);
            if (coupon == null)
                return NotFound(new { message = "Không tìm thấy mã giảm giá" });

            // Kiểm tra trùng code nếu admin cập nhật mã code mới
            if (!string.IsNullOrWhiteSpace(dto.Code) &&
                dto.Code.Trim().ToUpper() != coupon.Code)
            {
                var existing = await _couponRepository.GetByCodeAsync(dto.Code);
                if (existing != null && existing.Id != id)
                    return BadRequest(new { message = $"Mã '{dto.Code.ToUpper()}' đã tồn tại" });

                coupon.Code = dto.Code.Trim().ToUpper();
            }

            if (dto.Description != null) coupon.Description = dto.Description.Trim();
            if (dto.DiscountType != null) coupon.DiscountType = dto.DiscountType;
            if (dto.DiscountValue.HasValue) coupon.DiscountValue = dto.DiscountValue.Value;
            if (dto.MaxDiscountAmount.HasValue) coupon.MaxDiscountAmount = dto.MaxDiscountAmount.Value;
            if (dto.MinOrderAmount.HasValue) coupon.MinOrderAmount = dto.MinOrderAmount.Value;
            if (dto.UsageLimit.HasValue)
            {
                if (dto.UsageLimit.Value < 0)
                    return BadRequest(new { message = "Giới hạn sử dụng không được âm" });

                coupon.UsageLimit = dto.UsageLimit.Value;
            }
            if (dto.StartDate.HasValue) coupon.StartDate = dto.StartDate.Value;
            if (dto.ExpiryDate.HasValue) coupon.ExpiryDate = dto.ExpiryDate.Value;
            if (dto.IsActive.HasValue) coupon.IsActive = dto.IsActive.Value;

            await _couponRepository.UpdateAsync(coupon);
            return Ok(coupon);
        }

        /// <summary>
        /// Bật/Tắt trạng thái kích hoạt của mã giảm giá nhanh (Chỉ dành cho Admin)
        /// </summary>
        [HttpPatch("{id}/toggle")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Toggle(int id)
        {
            var coupon = await _couponRepository.GetByIdAsync(id);
            if (coupon == null)
                return NotFound(new { message = "Không tìm thấy mã giảm giá" });

            coupon.IsActive = !coupon.IsActive;
            await _couponRepository.UpdateAsync(coupon);

            return Ok(new
            {
                message = coupon.IsActive ? "Đã kích hoạt mã giảm giá" : "Đã vô hiệu hóa mã giảm giá",
                isActive = coupon.IsActive
            });
        }

        /// <summary>
        /// Xóa bỏ hoàn toàn mã giảm giá khỏi cơ sở dữ liệu (Chỉ dành cho Admin)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var coupon = await _couponRepository.GetByIdAsync(id);
            if (coupon == null)
                return NotFound(new { message = "Không tìm thấy mã giảm giá" });

            await _couponRepository.DeleteAsync(coupon);

            return Ok(new { message = "Đã xóa mã giảm giá thành công" });
        }

        // ──────────────── Bộ điều hướng hợp lệ (Private Helpers) ────────────────

        private static string? ValidateDto(CouponCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Code))
                return "Mã coupon không được để trống";

            if (dto.Code.Length > 50)
                return "Mã coupon tối đa 50 ký tự";

            if (dto.DiscountType != "percent" && dto.DiscountType != "fixed")
                return "Loại giảm giá phải là 'percent' hoặc 'fixed'";

            if (dto.DiscountValue <= 0)
                return "Giá trị giảm phải lớn hơn 0";

            if (dto.UsageLimit.HasValue && dto.UsageLimit.Value < 0)
                return "Giới hạn sử dụng không được âm";

            if (dto.DiscountType == "percent" && dto.DiscountValue > 100)
                return "Phần trăm giảm không được vượt quá 100%";

            if (dto.ExpiryDate <= DateTime.UtcNow)
                return "Ngày hết hạn phải lớn hơn ngày hiện tại";

            if (dto.StartDate.HasValue && dto.StartDate.Value >= dto.ExpiryDate)
                return "Ngày bắt đầu phải nhỏ hơn ngày hết hạn";

            return null;
        }
    }

    // ──────────────── Đối tượng DTO nhận dữ liệu ────────────────

    public class CouponCreateDto
    {
        public string Code { get; set; } = "";
        public string? Description { get; set; }
        public string? DiscountType { get; set; } = "percent";
        public decimal DiscountValue { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? UsageLimit { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public bool? IsActive { get; set; }
    }

    public class CouponUpdateDto
    {
        public string? Code { get; set; }
        public string? Description { get; set; }
        public string? DiscountType { get; set; }
        public decimal? DiscountValue { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? UsageLimit { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public bool? IsActive { get; set; }
    }
}
