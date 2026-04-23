using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;

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
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var (products, totalCount) = await _productRepository.SearchAsync(keyword, categoryId, page, pageSize);

            return Ok(new
            {
                items = products,
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

            return Ok(product);
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
            return Ok(products);
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
    }

    // DTOs
    public class ProductCreateDto
    {
        public string Name { get; set; } = "";
        public decimal Price { get; set; }
        public int Stock { get; set; }
        public int CategoryId { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class ProductUpdateDto
    {
        public string? Name { get; set; }
        public decimal? Price { get; set; }
        public int? Stock { get; set; }
        public int? CategoryId { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }
}
