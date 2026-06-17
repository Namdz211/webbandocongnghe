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
    /// API Controller quản lý Sản phẩm (Products)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepositoryEF _productRepository;
        private readonly ICategoryRepositoryEF _categoryRepository;
        private readonly IManufacturerRepository _manufacturerRepository;
        private readonly IProductReviewRepository _productReviewRepository;
        private readonly IOrderRepositoryEF _orderRepository;

        public ProductsController(
            IProductRepositoryEF productRepository,
            ICategoryRepositoryEF categoryRepository,
            IManufacturerRepository manufacturerRepository,
            IProductReviewRepository productReviewRepository,
            IOrderRepositoryEF orderRepository)
        {
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _manufacturerRepository = manufacturerRepository;
            _productReviewRepository = productReviewRepository;
            _orderRepository = orderRepository;
        }

        /// <summary>
        /// Tìm kiếm và lấy danh sách sản phẩm có phân trang kèm theo bộ lọc (Giá, Danh mục, Hãng, Ngày tạo, Sắp xếp)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword,
            [FromQuery] int? categoryId,
            [FromQuery] string? manufacturer,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] string? sortBy,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            if (minPrice.HasValue && minPrice.Value < 0)
                return BadRequest(new { message = "Giá tối thiểu không được âm" });

            if (maxPrice.HasValue && maxPrice.Value < 0)
                return BadRequest(new { message = "Giá tối đa không được âm" });

            if (minPrice.HasValue && maxPrice.HasValue && minPrice.Value > maxPrice.Value)
                return BadRequest(new { message = "Giá tối thiểu không được lớn hơn giá tối đa" });

            if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
                return BadRequest(new { message = "Từ ngày không được lớn hơn đến ngày" });

            // Nếu đến ngày chỉ có ngày (không có giờ), điều chỉnh thành 23:59:59 của ngày đó
            if (endDate.HasValue && endDate.Value.TimeOfDay == TimeSpan.Zero)
                endDate = endDate.Value.AddDays(1).AddTicks(-1);

            // Tìm kiếm sản phẩm thông qua Repository
            var (products, totalCount) = await _productRepository.SearchAsync(
                keyword,
                categoryId,
                manufacturer,
                minPrice,
                maxPrice,
                sortBy,
                startDate,
                endDate,
                page,
                pageSize);
            
            var productIds = products.Select(product => product.Id).ToList();
            
            // Lấy số sao trung bình và số lượng đánh giá của từng sản phẩm
            var reviewStats = await GetReviewStatsAsync(productIds);
            
            // Kiểm tra xem có lọc/sắp xếp theo lượng bán chạy nhất không
            var useSalesDateRange = string.Equals(sortBy, "bestSelling", StringComparison.OrdinalIgnoreCase);
            var soldStats = await GetSoldStatsAsync(
                productIds,
                useSalesDateRange ? startDate : null,
                useSalesDateRange ? endDate : null);

            return Ok(new
            {
                items = products.Select(product => ToProductListResponse(product, reviewStats, soldStats)),
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        /// <summary>
        /// Lấy danh sách các Hãng sản xuất hiện có (có thể lọc theo Danh mục sản phẩm)
        /// </summary>
        [HttpGet("manufacturers")]
        public async Task<IActionResult> GetManufacturers([FromQuery] int? categoryId)
        {
            var manufacturers = await _productRepository.GetManufacturersAsync(categoryId);
            return Ok(manufacturers);
        }

        /// <summary>
        /// Lấy chi tiết thông tin một sản phẩm theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            var reviewStats = await GetReviewStatsAsync(new[] { product.Id });
            var soldStats = await GetSoldStatsAsync(new[] { product.Id });

            return Ok(ToProductListResponse(product, reviewStats, soldStats));
        }

        /// <summary>
        /// Lấy tất cả các lượt đánh giá và số sao trung bình của một sản phẩm
        /// </summary>
        [HttpGet("{id}/reviews")]
        public async Task<IActionResult> GetReviews(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            var reviews = await _productReviewRepository.GetByProductIdAsync(id);

            // Kiểm tra xem người dùng hiện tại đã đăng nhập chưa và lấy bình luận của họ nếu có
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
        /// Thêm mới hoặc cập nhật đánh giá sản phẩm của khách hàng sau khi nhận đơn hàng thành công
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

            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            // Xác định xem user đã mua và nhận thành công sản phẩm này chưa
            var completedOrder = await GetCompletedOrderForProductAsync(userId, id);
            if (completedOrder == null)
                return BadRequest(new { message = "Bạn chỉ có thể đánh giá sau khi đã nhận đơn hàng có sản phẩm này" });

            // Tìm đánh giá cũ để xem là sửa hay thêm mới
            var review = await _productReviewRepository.GetByUserAndProductAsync(userId, id);
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
            }
            else
            {
                review.OrderId = completedOrder.Id;
                review.UpdatedAt = DateTime.UtcNow;
            }

            review.Rating = dto.Rating;
            review.Content = content;

            if (isNewReview)
            {
                await _productReviewRepository.AddAsync(review);
            }
            else
            {
                await _productReviewRepository.UpdateAsync(review);
            }

            var reviews = await _productReviewRepository.GetByProductIdAsync(id);
            var savedReview = reviews.First(item => item.Id == review.Id);

            return Ok(new
            {
                message = isNewReview ? "Đã gửi đánh giá sản phẩm thành công" : "Đã cập nhật đánh giá sản phẩm thành công",
                review = ToProductReviewResponse(savedReview)
            });
        }

        /// <summary>
        /// Tạo mới một sản phẩm (Yêu cầu tài khoản Admin)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
        {
            var validationMessage = ValidateCreateDto(dto);
            if (validationMessage != null)
                return BadRequest(new { message = validationMessage });

            var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
            if (category == null)
                return BadRequest(new { message = "Danh mục không tồn tại" });

            var manufacturerName = dto.Manufacturer?.Trim() ?? "";
            if (dto.ManufacturerId.HasValue)
            {
                var manufacturer = await _manufacturerRepository.GetByIdAsync(dto.ManufacturerId.Value);
                if (manufacturer == null)
                    return BadRequest(new { message = "Nhà sản xuất không tồn tại" });

                manufacturerName = manufacturer.Name;
            }

            var product = new Product
            {
                Name = dto.Name.Trim(),
                Manufacturer = manufacturerName,
                ManufacturerId = dto.ManufacturerId,
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
        /// Cập nhật thông tin chi tiết của một sản phẩm (Yêu cầu tài khoản Admin)
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

            if (dto.ManufacturerId.HasValue)
            {
                var manufacturer = await _manufacturerRepository.GetByIdAsync(dto.ManufacturerId.Value);
                if (manufacturer == null)
                    return BadRequest(new { message = "Nhà sản xuất không tồn tại" });

                product.ManufacturerId = dto.ManufacturerId;
                product.Manufacturer = manufacturer.Name;
            }
            else if (dto.Manufacturer != null)
            {
                product.Manufacturer = dto.Manufacturer.Trim();
            }

            product.Name = dto.Name?.Trim() ?? product.Name;
            product.Price = dto.Price ?? product.Price;
            product.Stock = dto.Stock ?? product.Stock;
            product.CategoryId = dto.CategoryId ?? product.CategoryId;
            product.Description = dto.Description?.Trim() ?? product.Description;
            product.ImageUrl = dto.ImageUrl?.Trim() ?? product.ImageUrl;

            await _productRepository.UpdateAsync(product);
            return Ok(product);
        }

        /// <summary>
        /// Xóa bỏ hoàn toàn sản phẩm khỏi hệ thống (Yêu cầu tài khoản Admin và sản phẩm chưa có trong hóa đơn nào)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return NotFound(new { message = "Không tìm thấy sản phẩm" });

            // Kiểm tra ràng buộc đơn hàng trước khi xóa
            var productHasOrders = await _productRepository.HasOrdersAsync(id);
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
        /// Lấy tất cả sản phẩm thuộc về một danh mục cụ thể
        /// </summary>
        [HttpGet("category/{categoryId}")]
        public async Task<IActionResult> GetByCategory(int categoryId)
        {
            var products = await _productRepository.GetByCategoryAsync(categoryId);
            var productIds = products.Select(product => product.Id).ToList();
            var reviewStats = await GetReviewStatsAsync(productIds);
            var soldStats = await GetSoldStatsAsync(productIds);

            return Ok(products.Select(product => ToProductListResponse(product, reviewStats, soldStats)));
        }

        // ──────────────── Bộ điều hướng hợp lệ (Private Helpers) ────────────────

        private static string? ValidateCreateDto(ProductCreateDto dto)
        {
            if (dto == null)
                return "Dữ liệu sản phẩm không hợp lệ";

            if (string.IsNullOrWhiteSpace(dto.Name))
                return "Tên sản phẩm không được để trống";

            if (dto.Price < 0)
                return "Giá sản phẩm không được âm";

            if (dto.Manufacturer?.Length > 100)
                return "Hãng sản xuất không được vượt quá 100 ký tự";

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
                return "Hãng sản xuất không được vượt quá 100 ký tự";

            if (dto.Stock.HasValue && dto.Stock.Value < 0)
                return "Tồn kho không được âm";

            if (dto.CategoryId.HasValue && dto.CategoryId.Value <= 0)
                return "Vui lòng chọn danh mục hợp lệ";

            return null;
        }

        private async Task<bool> HasCompletedOrderForProductAsync(string userId, int productId)
        {
            return await _orderRepository.HasCompletedOrderForProductAsync(userId, productId);
        }

        private async Task<Order?> GetCompletedOrderForProductAsync(string userId, int productId)
        {
            return await _orderRepository.GetCompletedOrderForProductAsync(userId, productId);
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
            return await _productReviewRepository.GetReviewStatsAsync(productIds);
        }

        private async Task<Dictionary<int, int>> GetSoldStatsAsync(
            IEnumerable<int> productIds,
            DateTime? startDate = null,
            DateTime? endDate = null)
        {
            return await _productRepository.GetSoldStatsAsync(productIds, startDate, endDate);
        }

        private static object ToProductListResponse(
            Product product,
            IReadOnlyDictionary<int, ProductReviewStats> reviewStats,
            IReadOnlyDictionary<int, int> soldStats)
        {
            reviewStats.TryGetValue(product.Id, out var stats);
            soldStats.TryGetValue(product.Id, out var soldQuantity);

            return new
            {
                product.Id,
                product.Name,
                product.Manufacturer,
                ManufacturerName = product.Manufacturer,
                product.ManufacturerId,
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
                ReviewCount = stats?.ReviewCount ?? 0,
                ReviewsCount = stats?.ReviewCount ?? 0,
                SoldQuantity = soldQuantity
            };
        }
    }

    // ──────────────── Đối tượng DTO nhận dữ liệu ────────────────

    public class ProductCreateDto
    {
        public string Name { get; set; } = "";
        public string? Manufacturer { get; set; }
        public int? ManufacturerId { get; set; }
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
        public int? ManufacturerId { get; set; }
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
}
