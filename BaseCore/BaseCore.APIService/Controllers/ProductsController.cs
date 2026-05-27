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
            var reviewStats = await GetReviewStatsAsync(products.Select(product => product.Id));

            return Ok(new
            {
                items = products.Select(product => ToProductListResponse(product, reviewStats)),
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        /// <summary>
        /// Get distinct product manufacturers
        /// </summary>
        [HttpGet("manufacturers")]
        public async Task<IActionResult> GetManufacturers([FromQuery] int? categoryId)
        {
            var manufacturers = await _productRepository.GetManufacturersAsync(categoryId);
            return Ok(manufacturers);
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

            return Ok(product);
        }

        /// <summary>
        /// Get public reviews for a product. If a valid customer token is provided,
        /// the response also tells the frontend whether that customer can review.
        /// </summary>
        [HttpGet("{id}/reviews")]
        public async Task<IActionResult> GetReviews(int id)
        {
            var productExists = await _dbContext.Products.AnyAsync(product => product.Id == id);
            if (!productExists)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            var reviews = await _dbContext.ProductReviews
                .Include(review => review.User)
                .AsNoTracking()
                .Where(review => review.ProductId == id)
                .OrderByDescending(review => review.CreatedAt)
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
        /// Create or update a customer's product review after they have received the order.
        /// </summary>
        [HttpPost("{id}/reviews")]
        [Authorize]
        public async Task<IActionResult> SaveReview(int id, [FromBody] ProductReviewDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Dữ liệu đánh giá không hợp lệ" });

            if (dto.Rating < 1 || dto.Rating > 5)
                return BadRequest(new { message = "Số sao đánh giá phải từ 1 đến 5" });

            var content = dto.Content?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(content))
                return BadRequest(new { message = "Vui lòng nhập nội dung đánh giá" });

            if (content.Length > 1000)
                return BadRequest(new { message = "Nội dung đánh giá tối đa 1000 ký tự" });

            var productExists = await _dbContext.Products.AnyAsync(product => product.Id == id);
            if (!productExists)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var completedOrder = await GetCompletedOrderForProductAsync(userId, id);
            if (completedOrder == null)
                return BadRequest(new { message = "Bạn chỉ có thể đánh giá sau khi đã nhận đơn hàng có sản phẩm này" });

            var review = await _dbContext.ProductReviews
                .FirstOrDefaultAsync(item => item.ProductId == id && item.UserId == userId);
            var isNewReview = review == null;

            if (review == null)
            {
                review = new ProductReview
                {
                    ProductId = id,
                    UserId = userId,
                    OrderId = completedOrder.Id,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.ProductReviews.Add(review);
            }
            else
            {
                review.OrderId = completedOrder.Id;
                review.UpdatedAt = DateTime.UtcNow;
            }

            review.Rating = dto.Rating;
            review.Content = content;

            await _dbContext.SaveChangesAsync();

            var savedReview = await _dbContext.ProductReviews
                .Include(item => item.User)
                .AsNoTracking()
                .FirstAsync(item => item.Id == review.Id);

            return Ok(new
            {
                message = isNewReview ? "Đã gửi đánh giá sản phẩm" : "Đã cập nhật đánh giá sản phẩm",
                review = ToProductReviewResponse(savedReview)
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

            var product = new Product
            {
                Name = dto.Name.Trim(),
                Manufacturer = dto.Manufacturer?.Trim() ?? "",
                Price = dto.Price,
                Stock = dto.Stock,
                CategoryId = dto.CategoryId,
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
            var product = await _productRepository.GetByIdAsync(id);
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

            product.Name = dto.Name?.Trim() ?? product.Name;
            product.Manufacturer = dto.Manufacturer?.Trim() ?? product.Manufacturer;
            product.Price = dto.Price ?? product.Price;
            product.Stock = dto.Stock ?? product.Stock;
            product.CategoryId = dto.CategoryId ?? product.CategoryId;
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
            var reviewStats = await GetReviewStatsAsync(products.Select(product => product.Id));
            return Ok(products.Select(product => ToProductListResponse(product, reviewStats)));
        }

        private static string? ValidateCreateDto(ProductCreateDto dto)
        {
            if (dto == null)
                return "Dữ liệu sản phẩm không hợp lệ";

            if (string.IsNullOrWhiteSpace(dto.Name))
                return "Tên sản phẩm không được để trống";

            if (dto.Price < 0)
                return "Giá sản phẩm không được âm";

            if (dto.Manufacturer?.Length > 100)
                return "Hang san xuat khong duoc vuot qua 100 ky tu";

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

            if (dto.Manufacturer?.Length > 100)
                return "Hang san xuat khong duoc vuot qua 100 ky tu";

            if (dto.Stock.HasValue && dto.Stock.Value < 0)
                return "Tồn kho không được âm";

            if (dto.CategoryId.HasValue && dto.CategoryId.Value <= 0)
                return "Vui lòng chọn danh mục hợp lệ";

            return null;
        }

        private async Task<bool> HasCompletedOrderForProductAsync(string userId, int productId)
        {
            return await _dbContext.Orders
                .Where(order => order.UserId == userId && order.Status == "Completed")
                .AnyAsync(order => order.OrderDetails.Any(detail => detail.ProductId == productId));
        }

        private async Task<Order?> GetCompletedOrderForProductAsync(string userId, int productId)
        {
            return await _dbContext.Orders
                .Where(order => order.UserId == userId && order.Status == "Completed")
                .Where(order => order.OrderDetails.Any(detail => detail.ProductId == productId))
                .OrderByDescending(order => order.OrderDate)
                .FirstOrDefaultAsync();
        }

        private static object ToProductReviewResponse(ProductReview review)
        {
            return new
            {
                review.Id,
                review.ProductId,
                review.OrderId,
                review.Rating,
                review.Content,
                review.CreatedAt,
                review.UpdatedAt,
                CustomerName = review.User?.Name,
                CustomerUserName = review.User?.UserName
            };
        }

        private async Task<Dictionary<int, ProductReviewStats>> GetReviewStatsAsync(IEnumerable<int> productIds)
        {
            var ids = productIds.Distinct().ToList();
            if (ids.Count == 0)
                return new Dictionary<int, ProductReviewStats>();

            return await _dbContext.ProductReviews
                .AsNoTracking()
                .Where(review => ids.Contains(review.ProductId))
                .GroupBy(review => review.ProductId)
                .Select(group => new ProductReviewStats
                {
                    ProductId = group.Key,
                    ReviewCount = group.Count(),
                    AverageRating = Math.Round(group.Average(review => review.Rating), 1)
                })
                .ToDictionaryAsync(item => item.ProductId);
        }

        private static object ToProductListResponse(
            Product product,
            IReadOnlyDictionary<int, ProductReviewStats> reviewStats)
        {
            reviewStats.TryGetValue(product.Id, out var stats);

            return new
            {
                product.Id,
                product.Name,
                product.Manufacturer,
                product.Price,
                product.Stock,
                product.ImageUrl,
                product.Description,
                product.CategoryId,
                product.Cpu,
                product.Gpu,
                product.Ram,
                product.Storage,
                product.Screen,
                product.Camera,
                product.Battery,
                product.Weight,
                product.OperatingSystem,
                product.Connectivity,
                product.Sensors,
                product.WaterResistance,
                product.Category,
                AverageRating = stats?.AverageRating ?? 0,
                ReviewCount = stats?.ReviewCount ?? 0
            };
        }
    }

    // DTOs
    public class ProductCreateDto
    {
        public string Name { get; set; } = "";
        public string? Manufacturer { get; set; }
        public decimal Price { get; set; }
        public int Stock { get; set; }
        public int CategoryId { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class ProductUpdateDto
    {
        public string? Name { get; set; }
        public string? Manufacturer { get; set; }
        public decimal? Price { get; set; }
        public int? Stock { get; set; }
        public int? CategoryId { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class ProductReviewDto
    {
        public int Rating { get; set; }
        public string? Content { get; set; }
    }

    public class ProductReviewStats
    {
        public int ProductId { get; set; }
        public int ReviewCount { get; set; }
        public double AverageRating { get; set; }
    }
}
