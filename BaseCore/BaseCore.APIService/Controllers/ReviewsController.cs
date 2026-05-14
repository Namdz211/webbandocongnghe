using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using System.Security.Claims;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly MySqlDbContext _dbContext;

        public ReviewsController(MySqlDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetByProduct(int productId)
        {
            var reviews = await _dbContext.Reviews
                .Include(r => r.User)
                .Where(r => r.ProductId == productId)
                .OrderByDescending(r => r.CreatedDate)
                .Select(r => new
                {
                    r.Id,
                    r.Rating,
                    r.Comment,
                    r.CreatedDate,
                    UserName = r.User != null ? r.User.Name : "Khách hàng"
                })
                .ToListAsync();

            return Ok(reviews);
        }

        [HttpGet("can-review/{productId}")]
        [Authorize]
        public async Task<IActionResult> CanReview(int productId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Ok(new { canReview = false });

            var hasBoughtAndReceived = await _dbContext.OrderDetails
                .Include(od => od.Order)
                .AnyAsync(od => od.ProductId == productId && 
                                od.Order.UserId == userId && 
                                od.Order.Status == "Completed");

            return Ok(new { canReview = hasBoughtAndReceived });
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] CreateReviewDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var hasBoughtAndReceived = await _dbContext.OrderDetails
                .Include(od => od.Order)
                .AnyAsync(od => od.ProductId == dto.ProductId && 
                                od.Order.UserId == userId && 
                                od.Order.Status == "Completed");

            if (!hasBoughtAndReceived)
            {
                return BadRequest(new { message = "Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận hàng thành công." });
            }

            var review = new Review
            {
                ProductId = dto.ProductId,
                UserId = userId,
                Rating = Math.Clamp(dto.Rating, 1, 5),
                Comment = dto.Comment?.Trim() ?? string.Empty
            };

            _dbContext.Reviews.Add(review);
            await _dbContext.SaveChangesAsync();

            return Ok(review);
        }
    }

    public class CreateReviewDto
    {
        public int ProductId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}