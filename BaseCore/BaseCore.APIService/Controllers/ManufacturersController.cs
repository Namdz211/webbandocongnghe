using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ManufacturersController : ControllerBase
    {
        private readonly MySqlDbContext _dbContext;

        public ManufacturersController(MySqlDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var manufacturers = await _dbContext.Manufacturers
                .OrderBy(manufacturer => manufacturer.Name)
                .ToListAsync();

            return Ok(manufacturers);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var manufacturer = await _dbContext.Manufacturers.FindAsync(id);
            if (manufacturer == null)
                return NotFound(new { message = "Manufacturer not found" });

            return Ok(manufacturer);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] ManufacturerDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Tên nhà sản xuất không được để trống" });

            var name = dto.Name.Trim();
            var exists = await _dbContext.Manufacturers
                .AnyAsync(manufacturer => manufacturer.Name.ToLower() == name.ToLower());
            if (exists)
                return BadRequest(new { message = "Nhà sản xuất đã tồn tại" });

            var manufacturer = new Manufacturer { Name = name };
            _dbContext.Manufacturers.Add(manufacturer);
            await _dbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = manufacturer.Id }, manufacturer);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] ManufacturerDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Tên nhà sản xuất không được để trống" });

            var manufacturer = await _dbContext.Manufacturers.FindAsync(id);
            if (manufacturer == null)
                return NotFound(new { message = "Manufacturer not found" });

            manufacturer.Name = dto.Name.Trim();
            await _dbContext.SaveChangesAsync();

            return Ok(manufacturer);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var manufacturer = await _dbContext.Manufacturers.FindAsync(id);
            if (manufacturer == null)
                return NotFound(new { message = "Manufacturer not found" });

            var hasProducts = await _dbContext.Products.AnyAsync(product => product.ManufacturerId == id);
            if (hasProducts)
                return BadRequest(new { message = "Không thể xóa nhà sản xuất đang có sản phẩm." });

            _dbContext.Manufacturers.Remove(manufacturer);
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Đã xóa nhà sản xuất thành công" });
        }
    }

    public class ManufacturerDto
    {
        public string Name { get; set; } = "";
    }
}
