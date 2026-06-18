using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// API Controller quản lý Đánh giá sản phẩm (Reviews)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly IProductReviewRepository _productReviewRepository;
        private readonly IOrderRepositoryEF _orderRepository;

        public ReviewsController(
            IProductReviewRepository productReviewRepository,
            IOrderRepositoryEF orderRepository)
        {
            _productReviewRepository = productReviewRepository;
            _orderRepository = orderRepository;
        }

        /// <summary>
        /// Lấy danh sách đánh giá của một sản phẩm cụ thể
        /// </summary>
        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetByProduct(int productId)
        {
            var rawReviews = await _productReviewRepository.GetByProductIdAsync(productId);
            var reviews = rawReviews
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Rating,
                    Comment = r.Content,
                    CreatedDate = r.CreatedAt,
                    UserName = r.User != null ? r.User.Name : "Khách hàng"
                })
                .ToList();

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
            var hasBoughtAndReceived = await _orderRepository.HasCompletedOrderForProductAsync(userId, productId);

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
            var hasBoughtAndReceived = await _orderRepository.HasCompletedOrderForProductAsync(userId, dto.ProductId);

            if (!hasBoughtAndReceived)
            {
                return BadRequest(new { message = "Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận hàng thành công." });
            }

            // Tìm đơn hàng đã hoàn thành gần nhất của user chứa sản phẩm này
            var completedOrder = await _orderRepository.GetCompletedOrderForProductAsync(userId, dto.ProductId);

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

            await _productReviewRepository.AddAsync(review);

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
            var (items, totalCount, summary) = await _productReviewRepository.GetAdminReviewsAsync(
                search,
                rating,
                sortBy,
                negativeOnly,
                page,
                pageSize);

            return Ok(new
            {
                totalCount,
                page,
                pageSize,
                items,
                summary = new
                {
                    totalReviews = summary.TotalReviews,
                    averageRating = summary.AverageRating,
                    negativeCount = summary.NegativeCount
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
            var review = await _productReviewRepository.GetByIdAsync(id);
            if (review == null)
            {
                return NotFound(new { message = "Không tìm thấy đánh giá." });
            }

            await _productReviewRepository.DeleteAsync(review);

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