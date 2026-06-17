using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// API Controller quản lý Danh mục sản phẩm (Categories)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryRepositoryEF _categoryRepository;

        public CategoriesController(ICategoryRepositoryEF categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        /// <summary>
        /// Lấy danh sách tất cả danh mục sản phẩm
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _categoryRepository.GetAllAsync();
            return Ok(categories);
        }

        /// <summary>
        /// Lấy chi tiết danh mục sản phẩm theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                return NotFound(new { message = "Không tìm thấy danh mục" });

            return Ok(category);
        }

        /// <summary>
        /// Tạo mới một danh mục sản phẩm
        /// </summary>
        [HttpPost]
        [Authorize] // Yêu cầu xác thực tài khoản trước khi thực hiện
        public async Task<IActionResult> Create([FromBody] CategoryDto dto)
        {
            // Kiểm tra trùng tên danh mục
            var existing = await _categoryRepository.GetByNameAsync(dto.Name);
            if (existing != null)
                return BadRequest(new { message = "Tên danh mục này đã tồn tại" });

            var category = new Category
            {
                Name = dto.Name,
                Description = dto.Description ?? ""
            };

            await _categoryRepository.AddAsync(category);
            return CreatedAtAction(nameof(GetById), new { id = category.Id }, category);
        }

        /// <summary>
        /// Cập nhật thông tin danh mục sản phẩm
        /// </summary>
        [HttpPut("{id}")]
        [Authorize] // Yêu cầu xác thực tài khoản
        public async Task<IActionResult> Update(int id, [FromBody] CategoryDto dto)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                return NotFound(new { message = "Không tìm thấy danh mục để cập nhật" });

            category.Name = dto.Name ?? category.Name;
            category.Description = dto.Description ?? category.Description;

            await _categoryRepository.UpdateAsync(category);
            return Ok(category);
        }

        /// <summary>
        /// Xóa danh mục sản phẩm
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize] // Yêu cầu xác thực tài khoản
        public async Task<IActionResult> Delete(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                return NotFound(new { message = "Không tìm thấy danh mục để xóa" });

            await _categoryRepository.DeleteAsync(category);
            return Ok(new { message = "Đã xóa danh mục thành công" });
        }
    }

    /// <summary>
    /// Đối tượng DTO nhận dữ liệu gửi lên từ client để tạo/sửa danh mục
    /// </summary>
    public class CategoryDto
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }
}
