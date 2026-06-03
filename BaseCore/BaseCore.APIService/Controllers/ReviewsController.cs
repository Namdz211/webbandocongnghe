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

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search, 
            [FromQuery] int? rating, 
            [FromQuery] string? sortBy, 
            [FromQuery] bool? negativeOnly,
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 10)
        {
            var query = _dbContext.Reviews
                .Include(r => r.User)
                .AsQueryable();

            var reviewsWithProduct = from r in query
                                     join p in _dbContext.Products on r.ProductId equals p.Id
                                     select new
                                     {
                                         r.Id,
                                         r.ProductId,
                                         ProductName = p.Name,
                                         r.UserId,
                                         UserName = r.User != null ? r.User.Name : "Khách hàng",
                                         r.Rating,
                                         r.Comment,
                                         r.CreatedDate
                                     };

            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                reviewsWithProduct = reviewsWithProduct.Where(r => 
                    r.ProductName.ToLower().Contains(searchLower) || 
                    r.Comment.ToLower().Contains(searchLower) || 
                    r.UserName.ToLower().Contains(searchLower));
            }

            if (rating.HasValue)
            {
                reviewsWithProduct = reviewsWithProduct.Where(r => r.Rating == rating.Value);
            }
            else if (negativeOnly == true)
            {
                reviewsWithProduct = reviewsWithProduct.Where(r => r.Rating <= 3);
            }

            if (sortBy == "rating_desc")
            {
                reviewsWithProduct = reviewsWithProduct.OrderByDescending(r => r.Rating).ThenByDescending(r => r.CreatedDate);
            }
            else if (sortBy == "rating_asc")
            {
                reviewsWithProduct = reviewsWithProduct.OrderBy(r => r.Rating).ThenByDescending(r => r.CreatedDate);
            }
            else if (sortBy == "oldest")
            {
                reviewsWithProduct = reviewsWithProduct.OrderBy(r => r.CreatedDate);
            }
            else
            {
                reviewsWithProduct = reviewsWithProduct.OrderByDescending(r => r.CreatedDate);
            }

            var totalCount = await reviewsWithProduct.CountAsync();
            var items = await reviewsWithProduct
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Calculate global stats for admin dashboard summary
            var statsQuery = _dbContext.Reviews.AsQueryable();
            var totalCountGlobal = await statsQuery.CountAsync();
            var averageRatingGlobal = totalCountGlobal > 0 ? await statsQuery.AverageAsync(r => r.Rating) : 0;
            var negativeCountGlobal = await statsQuery.CountAsync(r => r.Rating <= 3);

            return Ok(new
            {
                totalCount,
                page,
                pageSize,
                items,
                summary = new
                {
                    totalReviews = totalCountGlobal,
                    averageRating = Math.Round(averageRatingGlobal, 1),
                    negativeCount = negativeCountGlobal
                }
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var review = await _dbContext.Reviews.FindAsync(id);
            if (review == null)
            {
                return NotFound(new { message = "Không tìm thấy đánh giá." });
            }

            _dbContext.Reviews.Remove(review);
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Đã xóa đánh giá thành công." });
        }
    }

    public class CreateReviewDto
    {
        public int ProductId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}