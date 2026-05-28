using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// Coupon/Voucher Management API Controller
    /// Admin quản lý mã giảm giá, FE customer sẽ áp dụng khi đặt hàng
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class CouponsController : ControllerBase
    {
        private readonly MySqlDbContext _dbContext;

        public CouponsController(MySqlDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>Lấy danh sách tất cả coupon (Admin)</summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword = null,
            [FromQuery] bool? isActive = null)
        {
            var query = _dbContext.Coupons.AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(c =>
                    c.Code.ToLower().Contains(kw) ||
                    c.Description.ToLower().Contains(kw));
            }

            if (isActive.HasValue)
                query = query.Where(c => c.IsActive == isActive.Value);

            var coupons = await query
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return Ok(coupons);
        }

        /// <summary>Lấy chi tiết một coupon theo Id (Admin)</summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetById(int id)
        {
            var coupon = await _dbContext.Coupons.FindAsync(id);
            if (coupon == null)
                return NotFound(new { message = "Không tìm thấy mã giảm giá" });

            return Ok(coupon);
        }

        /// <summary>Kiểm tra và áp dụng coupon khi đặt hàng (Customer - không cần Admin)</summary>
        [HttpGet("validate/{code}")]
        [Authorize]
        public async Task<IActionResult> Validate(string code, [FromQuery] decimal orderAmount)
        {
            var coupon = await _dbContext.Coupons
                .FirstOrDefaultAsync(c => c.Code.ToUpper() == code.Trim().ToUpper());

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

            // Tính toán số tiền giảm thực tế
            decimal discountAmount;
            if (coupon.DiscountType == "percent")
            {
                discountAmount = orderAmount * coupon.DiscountValue / 100;
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

        /// <summary>Tạo mã giảm giá mới (Admin)</summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CouponCreateDto dto)
        {
            var validationMsg = ValidateDto(dto);
            if (validationMsg != null)
                return BadRequest(new { message = validationMsg });

            // Kiểm tra trùng code
            var exists = await _dbContext.Coupons.AnyAsync(c => c.Code == dto.Code.Trim().ToUpper());
            if (exists)
                return BadRequest(new { message = $"Mã '{dto.Code.ToUpper()}' đã tồn tại" });

            var coupon = new Coupon
            {
                Code = dto.Code.Trim().ToUpper(),
                Description = dto.Description?.Trim() ?? "",
                DiscountType = dto.DiscountType ?? "percent",
                DiscountValue = dto.DiscountValue,
                MaxDiscountAmount = dto.MaxDiscountAmount ?? 0,
                MinOrderAmount = dto.MinOrderAmount ?? 0,
                UsageLimit = dto.UsageLimit ?? 0,
                StartDate = dto.StartDate ?? DateTime.UtcNow,
                ExpiryDate = dto.ExpiryDate,
                IsActive = dto.IsActive ?? true,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.Coupons.Add(coupon);
            await _dbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = coupon.Id }, coupon);
        }

        /// <summary>Cập nhật mã giảm giá (Admin)</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] CouponUpdateDto dto)
        {
            var coupon = await _dbContext.Coupons.FindAsync(id);
            if (coupon == null)
                return NotFound(new { message = "Không tìm thấy mã giảm giá" });

            // Kiểm tra trùng code nếu thay đổi
            if (!string.IsNullOrWhiteSpace(dto.Code) &&
                dto.Code.Trim().ToUpper() != coupon.Code)
            {
                var exists = await _dbContext.Coupons
                    .AnyAsync(c => c.Code == dto.Code.Trim().ToUpper() && c.Id != id);
                if (exists)
                    return BadRequest(new { message = $"Mã '{dto.Code.ToUpper()}' đã tồn tại" });

                coupon.Code = dto.Code.Trim().ToUpper();
            }

            if (dto.Description != null) coupon.Description = dto.Description.Trim();
            if (dto.DiscountType != null) coupon.DiscountType = dto.DiscountType;
            if (dto.DiscountValue.HasValue) coupon.DiscountValue = dto.DiscountValue.Value;
            if (dto.MaxDiscountAmount.HasValue) coupon.MaxDiscountAmount = dto.MaxDiscountAmount.Value;
            if (dto.MinOrderAmount.HasValue) coupon.MinOrderAmount = dto.MinOrderAmount.Value;
            if (dto.UsageLimit.HasValue) coupon.UsageLimit = dto.UsageLimit.Value;
            if (dto.StartDate.HasValue) coupon.StartDate = dto.StartDate.Value;
            if (dto.ExpiryDate.HasValue) coupon.ExpiryDate = dto.ExpiryDate.Value;
            if (dto.IsActive.HasValue) coupon.IsActive = dto.IsActive.Value;

            await _dbContext.SaveChangesAsync();
            return Ok(coupon);
        }

        /// <summary>Bật/Tắt trạng thái coupon nhanh (Admin)</summary>
        [HttpPatch("{id}/toggle")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Toggle(int id)
        {
            var coupon = await _dbContext.Coupons.FindAsync(id);
            if (coupon == null)
                return NotFound(new { message = "Không tìm thấy mã giảm giá" });

            coupon.IsActive = !coupon.IsActive;
            await _dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = coupon.IsActive ? "Đã kích hoạt mã giảm giá" : "Đã vô hiệu hóa mã giảm giá",
                isActive = coupon.IsActive
            });
        }

        /// <summary>Xóa mã giảm giá (Admin)</summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var coupon = await _dbContext.Coupons.FindAsync(id);
            if (coupon == null)
                return NotFound(new { message = "Không tìm thấy mã giảm giá" });

            _dbContext.Coupons.Remove(coupon);
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Đã xóa mã giảm giá thành công" });
        }

        // ──────────────── Private Helpers ────────────────

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

            if (dto.DiscountType == "percent" && dto.DiscountValue > 100)
                return "Phần trăm giảm không được vượt quá 100%";

            if (dto.ExpiryDate <= DateTime.UtcNow)
                return "Ngày hết hạn phải lớn hơn ngày hiện tại";

            if (dto.StartDate.HasValue && dto.StartDate.Value >= dto.ExpiryDate)
                return "Ngày bắt đầu phải nhỏ hơn ngày hết hạn";

            return null;
        }
    }

    // ──────────────── DTOs ────────────────

    public class CouponCreateDto
    {
        public string Code { get; set; } = "";
        public string? Description { get; set; }
        public string? DiscountType { get; set; } = "percent"; // "percent" | "fixed"
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
