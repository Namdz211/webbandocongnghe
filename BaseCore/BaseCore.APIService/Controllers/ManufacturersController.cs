using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// API Controller quản lý Nhà sản xuất (Manufacturers)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ManufacturersController : ControllerBase
    {
        private readonly MySqlDbContext _dbContext;

        public ManufacturersController(MySqlDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Lấy danh sách tất cả các nhà sản xuất, sắp xếp tăng dần theo tên
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var manufacturers = await _dbContext.Manufacturers
                .OrderBy(manufacturer => manufacturer.Name)
                .ToListAsync();

            return Ok(manufacturers);
        }

        /// <summary>
        /// Lấy thông tin nhà sản xuất theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var manufacturer = await _dbContext.Manufacturers.FindAsync(id);
            if (manufacturer == null)
                return NotFound(new { message = "Không tìm thấy nhà sản xuất" });

            return Ok(manufacturer);
        }

        /// <summary>
        /// Thêm mới một nhà sản xuất (Yêu cầu tài khoản Admin)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] ManufacturerDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Tên nhà sản xuất không được để trống" });

            var name = dto.Name.Trim();
            
            // Kiểm tra nhà sản xuất đã tồn tại chưa (không phân biệt hoa thường)
            var exists = await _dbContext.Manufacturers
                .AnyAsync(manufacturer => manufacturer.Name.ToLower() == name.ToLower());
            if (exists)
                return BadRequest(new { message = "Nhà sản xuất này đã tồn tại trong hệ thống" });

            var manufacturer = new Manufacturer { Name = name };
            _dbContext.Manufacturers.Add(manufacturer);
            await _dbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = manufacturer.Id }, manufacturer);
        }

        /// <summary>
        /// Cập nhật thông tin nhà sản xuất (Yêu cầu tài khoản Admin)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] ManufacturerDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Tên nhà sản xuất không được để trống" });

            var manufacturer = await _dbContext.Manufacturers.FindAsync(id);
            if (manufacturer == null)
                return NotFound(new { message = "Không tìm thấy nhà sản xuất để cập nhật" });

            manufacturer.Name = dto.Name.Trim();
            await _dbContext.SaveChangesAsync();

            return Ok(manufacturer);
        }

        /// <summary>
        /// Xóa nhà sản xuất (Yêu cầu tài khoản Admin và hãng chưa liên kết sản phẩm nào)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var manufacturer = await _dbContext.Manufacturers.FindAsync(id);
            if (manufacturer == null)
                return NotFound(new { message = "Không tìm thấy nhà sản xuất để xóa" });

            // Kiểm tra xem nhà sản xuất có đang liên kết với sản phẩm nào không
            var hasProducts = await _dbContext.Products.AnyAsync(product => product.ManufacturerId == id);
            if (hasProducts)
                return BadRequest(new { message = "Không thể xóa nhà sản xuất này vì đang có sản phẩm thuộc hãng." });

            _dbContext.Manufacturers.Remove(manufacturer);
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Đã xóa nhà sản xuất thành công" });
        }
    }

    /// <summary>
    /// Đối tượng DTO nhận dữ liệu nhà sản xuất từ client gửi lên
    /// </summary>
    public class ManufacturerDto
    {
        public string Name { get; set; } = "";
    }
}
