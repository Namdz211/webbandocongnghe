using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// Product API Controller
    /// Teaching: RESTful API, CRUD Operations, EF Core (Bài 10, 11)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepositoryEF _productRepository;
        private readonly ICategoryRepositoryEF _categoryRepository;
        private readonly MySqlDbContext _dbContext;

        public ProductsController(
            IProductRepositoryEF productRepository,
            ICategoryRepositoryEF categoryRepository,
            MySqlDbContext dbContext)
        {
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _dbContext = dbContext;
        }

        /// <summary>
        /// Get all products with pagination and search
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword,
            [FromQuery] int? categoryId,
            [FromQuery] string? manufacturer,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] string? sortBy,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            if (minPrice.HasValue && minPrice.Value < 0)
                return BadRequest(new { message = "Giá tối thiểu không được âm" });

            if (maxPrice.HasValue && maxPrice.Value < 0)
                return BadRequest(new { message = "Giá tối đa không được âm" });

            if (minPrice.HasValue && maxPrice.HasValue && minPrice.Value > maxPrice.Value)
                return BadRequest(new { message = "Giá tối thiểu không được lớn hơn giá tối đa" });

            var (products, totalCount) = await _productRepository.SearchAsync(
                keyword,
                categoryId,
                manufacturer,
                minPrice,
                maxPrice,
                sortBy,
                page,
                pageSize);

            var productIds = products.Select(p => p.Id).ToList();
            var reviewStats = await _dbContext.Reviews
                .Where(r => productIds.Contains(r.ProductId))
                .GroupBy(r => r.ProductId)
                .Select(g => new
                {
                    ProductId = g.Key,
                    AverageRating = g.Average(r => r.Rating),
                    ReviewsCount = g.Count()
                })
                .ToDictionaryAsync(x => x.ProductId, x => x);

            var items = products.Select(p => new
            {
                p.Id,
                p.Name,
                p.Price,
                p.Stock,
                p.ImageUrl,
                p.Description,
                p.CategoryId,
                p.ManufacturerId,
                p.Category,
                p.Manufacturer,
                AverageRating = reviewStats.ContainsKey(p.Id) ? Math.Round(reviewStats[p.Id].AverageRating, 1) : 0.0,
                ReviewsCount = reviewStats.ContainsKey(p.Id) ? reviewStats[p.Id].ReviewsCount : 0
            }).ToList();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        /// <summary>
        /// Get product by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Product not found" });

            var stats = await _dbContext.Reviews
                .Where(r => r.ProductId == id)
                .GroupBy(r => r.ProductId)
                .Select(g => new
                {
                    AverageRating = g.Average(r => r.Rating),
                    ReviewsCount = g.Count()
                })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                product.Id,
                product.Name,
                product.Price,
                product.Stock,
                product.ImageUrl,
                product.Description,
                product.CategoryId,
                product.ManufacturerId,
                product.Category,
                product.Manufacturer,
                AverageRating = stats != null ? Math.Round(stats.AverageRating, 1) : 0.0,
                ReviewsCount = stats != null ? stats.ReviewsCount : 0
            });
        }

        /// <summary>
        /// Create new product (Admin only)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
        {
            var validationMessage = ValidateCreateDto(dto);
            if (validationMessage != null)
                return BadRequest(new { message = validationMessage });

            // Validate category exists
            var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
            if (category == null)
                return BadRequest(new { message = "Danh mục không tồn tại" });

            if (dto.ManufacturerId.HasValue && !await ManufacturerExistsAsync(dto.ManufacturerId.Value))
                return BadRequest(new { message = "NhÃ  sáº£n xuáº¥t khÃ´ng tá»“n táº¡i" });

            var product = new Product
            {
                Name = dto.Name.Trim(),
                Price = dto.Price,
                Stock = dto.Stock,
                CategoryId = dto.CategoryId,
                ManufacturerId = dto.ManufacturerId,
                Description = dto.Description?.Trim() ?? "",
                ImageUrl = dto.ImageUrl?.Trim() ?? ""
            };

            await _productRepository.AddAsync(product);
            return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
        }

        /// <summary>
        /// Update product (Admin only)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductUpdateDto dto)
        {
            var product = await _productRepository.GetDetailByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            var validationMessage = ValidateUpdateDto(dto);
            if (validationMessage != null)
                return BadRequest(new { message = validationMessage });

            if (dto.CategoryId.HasValue)
            {
                var category = await _categoryRepository.GetByIdAsync(dto.CategoryId.Value);
                if (category == null)
                    return BadRequest(new { message = "Danh mục không tồn tại" });
            }

            if (dto.ManufacturerId.HasValue && !await ManufacturerExistsAsync(dto.ManufacturerId.Value))
                return BadRequest(new { message = "NhÃ  sáº£n xuáº¥t khÃ´ng tá»“n táº¡i" });

            product.Name = dto.Name?.Trim() ?? product.Name;
            product.Price = dto.Price ?? product.Price;
            product.Stock = dto.Stock ?? product.Stock;
            product.CategoryId = dto.CategoryId ?? product.CategoryId;
            product.ManufacturerId = dto.ManufacturerId ?? product.ManufacturerId;
            product.Description = dto.Description?.Trim() ?? product.Description;
            product.ImageUrl = dto.ImageUrl?.Trim() ?? product.ImageUrl;

            await _productRepository.UpdateAsync(product);
            return Ok(product);
        }

        /// <summary>
        /// Delete product (Admin only)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            var productHasOrders = await _dbContext.OrderDetails.AnyAsync(orderDetail => orderDetail.ProductId == id);
            if (productHasOrders)
                return BadRequest(new { message = "Không thể xóa sản phẩm đã có trong đơn hàng. Hãy sửa tồn kho hoặc thông tin sản phẩm thay vì xóa." });

            try
            {
                await _productRepository.DeleteAsync(product);
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { message = "Không thể xóa sản phẩm vì đang được dữ liệu khác sử dụng." });
            }

            return Ok(new { message = "Đã xóa sản phẩm thành công" });
        }

        /// <summary>
        /// Get products by category
        /// </summary>
        [HttpGet("category/{categoryId}")]
        public async Task<IActionResult> GetByCategory(int categoryId)
        {
            var products = await _productRepository.GetByCategoryAsync(categoryId);
            return Ok(products);
        }

        /// <summary>
        /// Get product reviews and the current user's review eligibility.
        /// </summary>
        [HttpGet("{id}/reviews")]
        public async Task<IActionResult> GetReviews(int id)
        {
            var productExists = await _dbContext.Products.AnyAsync(product => product.Id == id);
            if (!productExists)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            var reviews = await _dbContext.Reviews
                .Include(review => review.User)
                .AsNoTracking()
                .Where(review => review.ProductId == id)
                .OrderByDescending(review => review.CreatedDate)
                .ToListAsync();

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var myReview = string.IsNullOrEmpty(userId)
                ? null
                : reviews.FirstOrDefault(review => string.Equals(review.UserId, userId, StringComparison.Ordinal));
            var canReview = !string.IsNullOrEmpty(userId)
                && await HasCompletedOrderForProductAsync(userId, id);

            return Ok(new
            {
                items = reviews.Select(ToProductReviewResponse),
                totalCount = reviews.Count,
                averageRating = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(review => review.Rating), 1),
                canReview,
                myReview = myReview == null ? null : ToProductReviewResponse(myReview)
            });
        }

        /// <summary>
        /// Create or update the current user's review after a completed order.
        /// </summary>
        [HttpPost("{id}/reviews")]
        [Authorize]
        public async Task<IActionResult> SaveReview(int id, [FromBody] ProductReviewDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Dữ liệu đánh giá không hợp lệ" });

            if (dto.Rating < 1 || dto.Rating > 5)
                return BadRequest(new { message = "Số sao đánh giá phải từ 1 đến 5" });

            var content = (dto.Content ?? dto.Comment ?? "").Trim();
            if (string.IsNullOrWhiteSpace(content))
                return BadRequest(new { message = "Vui lòng nhập nội dung đánh giá" });

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var productExists = await _dbContext.Products.AnyAsync(product => product.Id == id);
            if (!productExists)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            if (!await HasCompletedOrderForProductAsync(userId, id))
                return BadRequest(new { message = "Bạn chỉ có thể đánh giá sau khi đã nhận đơn hàng có sản phẩm này" });

            var review = await _dbContext.Reviews
                .FirstOrDefaultAsync(item => item.ProductId == id && item.UserId == userId);
            var isNewReview = review == null;

            if (review == null)
            {
                review = new Review
                {
                    ProductId = id,
                    UserId = userId,
                    CreatedDate = DateTime.UtcNow
                };

                _dbContext.Reviews.Add(review);
            }

            review.Rating = dto.Rating;
            review.Comment = content;

            await _dbContext.SaveChangesAsync();

            var savedReview = await _dbContext.Reviews
                .Include(item => item.User)
                .AsNoTracking()
                .FirstAsync(item => item.Id == review.Id);

            return Ok(new
            {
                message = isNewReview ? "Đã gửi đánh giá sản phẩm" : "Đã cập nhật đánh giá sản phẩm",
                review = ToProductReviewResponse(savedReview)
            });
        }

        private static string? ValidateCreateDto(ProductCreateDto dto)
        {
            if (dto == null)
                return "Dữ liệu sản phẩm không hợp lệ";

            if (string.IsNullOrWhiteSpace(dto.Name))
                return "Tên sản phẩm không được để trống";

            if (dto.Price < 0)
                return "Giá sản phẩm không được âm";

            if (dto.Stock < 0)
                return "Tồn kho không được âm";

            if (dto.CategoryId <= 0)
                return "Vui lòng chọn danh mục hợp lệ";

            return null;
        }

        private static string? ValidateUpdateDto(ProductUpdateDto dto)
        {
            if (dto == null)
                return "Dữ liệu sản phẩm không hợp lệ";

            if (dto.Name != null && string.IsNullOrWhiteSpace(dto.Name))
                return "Tên sản phẩm không được để trống";

            if (dto.Price.HasValue && dto.Price.Value < 0)
                return "Giá sản phẩm không được âm";

            if (dto.Stock.HasValue && dto.Stock.Value < 0)
                return "Tồn kho không được âm";

            if (dto.CategoryId.HasValue && dto.CategoryId.Value <= 0)
                return "Vui lòng chọn danh mục hợp lệ";

            return null;
        }

        private async Task<bool> ManufacturerExistsAsync(int manufacturerId)
        {
            if (manufacturerId <= 0)
                return false;

            return await _dbContext.Manufacturers.AnyAsync(manufacturer => manufacturer.Id == manufacturerId);
        }

        private async Task<bool> HasCompletedOrderForProductAsync(string userId, int productId)
        {
            return await _dbContext.OrderDetails
                .Include(orderDetail => orderDetail.Order)
                .AnyAsync(orderDetail =>
                    orderDetail.ProductId == productId &&
                    orderDetail.Order.UserId == userId &&
                    orderDetail.Order.Status == "Completed");
        }

        private static object ToProductReviewResponse(Review review)
        {
            return new
            {
                review.Id,
                review.ProductId,
                review.UserId,
                review.Rating,
                Content = review.Comment,
                Comment = review.Comment,
                CreatedAt = review.CreatedDate,
                CreatedDate = review.CreatedDate,
                CustomerName = review.User?.Name,
                CustomerUserName = review.User?.UserName,
                UserName = review.User?.Name ?? review.User?.UserName ?? "Khách hàng"
            };
        }
    }

    // DTOs
    public class ProductCreateDto
    {
        public string Name { get; set; } = "";
        public decimal Price { get; set; }
        public int Stock { get; set; }
        public int CategoryId { get; set; }
        public int? ManufacturerId { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class ProductUpdateDto
    {
        public string? Name { get; set; }
        public decimal? Price { get; set; }
        public int? Stock { get; set; }
        public int? CategoryId { get; set; }
        public int? ManufacturerId { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class ProductReviewDto
    {
        public int Rating { get; set; }
        public string? Content { get; set; }
        public string? Comment { get; set; }
    }
}
