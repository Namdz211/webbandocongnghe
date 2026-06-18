using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Services;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// API Controller quản lý Nhà sản xuất (Manufacturers)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ManufacturersController : ControllerBase
    {
        private readonly IManufacturerService _manufacturerService;

        public ManufacturersController(IManufacturerService manufacturerService)
        {
            _manufacturerService = manufacturerService;
        }

        /// <summary>
        /// Lấy danh sách tất cả các nhà sản xuất, sắp xếp tăng dần theo tên
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var manufacturers = await _manufacturerService.GetAllAsync();
            return Ok(manufacturers);
        }

        /// <summary>
        /// Lấy thông tin nhà sản xuất theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var manufacturer = await _manufacturerService.GetByIdAsync(id);
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

            try
            {
                var manufacturer = await _manufacturerService.CreateAsync(dto.Name);
                return CreatedAtAction(nameof(GetById), new { id = manufacturer.Id }, manufacturer);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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

            try
            {
                var manufacturer = await _manufacturerService.UpdateAsync(id, dto.Name);
                return Ok(manufacturer);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa nhà sản xuất (Yêu cầu tài khoản Admin và hãng chưa liên kết sản phẩm nào)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _manufacturerService.DeleteAsync(id);
                return Ok(new { message = "Đã xóa nhà sản xuất thành công" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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
