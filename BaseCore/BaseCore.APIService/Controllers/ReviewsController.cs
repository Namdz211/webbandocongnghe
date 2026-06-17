using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using System.Security.Claims;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// API Controller quản lý Đánh giá sản phẩm (Reviews)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly MySqlDbContext _dbContext;

        public ReviewsController(MySqlDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Lấy danh sách đánh giá của một sản phẩm cụ thể
        /// </summary>
        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetByProduct(int productId)
        {
            var reviews = await _dbContext.ProductReviews
                .Include(r => r.User)
                .Where(r => r.ProductId == productId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Rating,
                    Comment = r.Content,
                    CreatedDate = r.CreatedAt,
                    UserName = r.User != null ? r.User.Name : "Khách hàng"
                })
                .ToListAsync();

            return Ok(reviews);
        }

        /// <summary>
        /// Kiểm tra xem người dùng hiện tại có thể đánh giá sản phẩm hay không (yêu cầu đã mua và nhận đơn Completed)
        /// </summary>
        [HttpGet("can-review/{productId}")]
        [Authorize] // Yêu cầu đăng nhập
        public async Task<IActionResult> CanReview(int productId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Ok(new { canReview = false });

            // Kiểm tra xem khách hàng đã từng có đơn hàng chứa sản phẩm này ở trạng thái Completed (Hoàn thành) chưa
            var hasBoughtAndReceived = await _dbContext.OrderDetails
                .Include(od => od.Order)
                .AnyAsync(od => od.ProductId == productId && 
                                od.Order.UserId == userId && 
                                od.Order.Status == "Completed");

            return Ok(new { canReview = hasBoughtAndReceived });
        }

        /// <summary>
        /// Thêm mới một đánh giá cho sản phẩm
        /// </summary>
        [HttpPost]
        [Authorize] // Yêu cầu đăng nhập
        public async Task<IActionResult> Create([FromBody] CreateReviewDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            // Xác thực xem người dùng đã mua và nhận sản phẩm này chưa
            var hasBoughtAndReceived = await _dbContext.OrderDetails
                .Include(od => od.Order)
                .AnyAsync(od => od.ProductId == dto.ProductId && 
                                od.Order.UserId == userId && 
                                od.Order.Status == "Completed");

            if (!hasBoughtAndReceived)
            {
                return BadRequest(new { message = "Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận hàng thành công." });
            }

            // Tìm đơn hàng đã hoàn thành gần nhất của user chứa sản phẩm này
            var completedOrder = await _dbContext.Orders
                .Where(o => o.UserId == userId && o.Status == "Completed")
                .Where(o => o.OrderDetails.Any(d => d.ProductId == dto.ProductId))
                .OrderByDescending(o => o.OrderDate)
                .FirstOrDefaultAsync();

            if (completedOrder == null)
            {
                return BadRequest(new { message = "Không tìm thấy đơn hàng tương ứng với sản phẩm này." });
            }

            var review = new ProductReview
            {
                ProductId = dto.ProductId,
                UserId = userId,
                Rating = Math.Clamp(dto.Rating, 1, 5), // Đảm bảo số sao đánh giá nằm trong khoảng 1 đến 5
                Content = dto.Comment?.Trim() ?? string.Empty,
                OrderId = completedOrder.Id,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.ProductReviews.Add(review);
            await _dbContext.SaveChangesAsync();

            return Ok(review);
        }

        /// <summary>
        /// Lấy tất cả danh sách đánh giá kèm bộ lọc phân trang (Chỉ dành cho Admin quản trị)
        /// </summary>
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
            var query = _dbContext.ProductReviews
                .Include(r => r.User)
                .AsQueryable();

            // Thực hiện Join bảng với Products để lấy tên sản phẩm
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
                                         Comment = r.Content,
                                         CreatedDate = r.CreatedAt
                                     };

            // Tìm kiếm theo tên sản phẩm, nội dung bình luận hoặc tên khách hàng
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                reviewsWithProduct = reviewsWithProduct.Where(r => 
                    r.ProductName.ToLower().Contains(searchLower) || 
                    r.Comment.ToLower().Contains(searchLower) || 
                    r.UserName.ToLower().Contains(searchLower));
            }

            // Lọc theo số sao đánh giá
            if (rating.HasValue)
            {
                reviewsWithProduct = reviewsWithProduct.Where(r => r.Rating == rating.Value);
            }
            // Chỉ lấy các đánh giá tiêu cực (từ 1 đến 3 sao)
            else if (negativeOnly == true)
            {
                reviewsWithProduct = reviewsWithProduct.Where(r => r.Rating <= 3);
            }

            // Sắp xếp kết quả
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
            else // Mặc định sắp xếp theo đánh giá mới nhất lên đầu
            {
                reviewsWithProduct = reviewsWithProduct.OrderByDescending(r => r.CreatedDate);
            }

            // Thực hiện tính toán phân trang
            var totalCount = await reviewsWithProduct.CountAsync();
            var items = await reviewsWithProduct
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Tính toán số liệu thống kê chung cho trang quản trị
            var statsQuery = _dbContext.ProductReviews.AsQueryable();
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

        /// <summary>
        /// Xóa bỏ một đánh giá sản phẩm (Yêu cầu tài khoản Admin)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var review = await _dbContext.ProductReviews.FindAsync(id);
            if (review == null)
            {
                return NotFound(new { message = "Không tìm thấy đánh giá." });
            }

            _dbContext.ProductReviews.Remove(review);
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Đã xóa đánh giá thành công." });
        }
    }

    /// <summary>
    /// Đối tượng DTO chứa dữ liệu tạo mới đánh giá sản phẩm
    /// </summary>
    public class CreateReviewDto
    {
        public int ProductId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}