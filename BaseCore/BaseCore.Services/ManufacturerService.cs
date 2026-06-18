using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    /// <summary>
    /// Triển khai dịch vụ trung gian ManufacturerService
    /// </summary>
    public class ManufacturerService : IManufacturerService
    {
        private readonly IManufacturerRepository _manufacturerRepository;
        private readonly IProductRepositoryEF _productRepository;

        public ManufacturerService(IManufacturerRepository manufacturerRepository, IProductRepositoryEF productRepository)
        {
            _manufacturerRepository = manufacturerRepository;
            _productRepository = productRepository;
        }

        /// <inheritdoc />
        public async Task<IEnumerable<Manufacturer>> GetAllAsync()
        {
            var manufacturers = await _manufacturerRepository.GetAllAsync();
            return manufacturers.OrderBy(m => m.Name).ToList();
        }

        /// <inheritdoc />
        public async Task<Manufacturer?> GetByIdAsync(int id)
        {
            return await _manufacturerRepository.GetByIdAsync(id);
        }

        /// <inheritdoc />
        public async Task<Manufacturer> CreateAsync(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Tên nhà sản xuất không được để trống");

            var trimmedName = name.Trim();

            // Kiểm tra nhà sản xuất đã tồn tại chưa (không phân biệt hoa thường)
            var exists = (await _manufacturerRepository.FindAsync(m => m.Name.ToLower() == trimmedName.ToLower())).Any();
            if (exists)
                throw new InvalidOperationException("Nhà sản xuất này đã tồn tại trong hệ thống");

            var manufacturer = new Manufacturer { Name = trimmedName };
            return await _manufacturerRepository.AddAsync(manufacturer);
        }

        /// <inheritdoc />
        public async Task<Manufacturer> UpdateAsync(int id, string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Tên nhà sản xuất không được để trống");

            var manufacturer = await _manufacturerRepository.GetByIdAsync(id);
            if (manufacturer == null)
                throw new KeyNotFoundException("Không tìm thấy nhà sản xuất để cập nhật");

            var trimmedName = name.Trim();

            // Kiểm tra trùng tên với nhà sản xuất khác (nếu có đổi tên)
            var exists = (await _manufacturerRepository.FindAsync(m => m.Id != id && m.Name.ToLower() == trimmedName.ToLower())).Any();
            if (exists)
                throw new InvalidOperationException("Nhà sản xuất khác với tên này đã tồn tại trong hệ thống");

            manufacturer.Name = trimmedName;
            await _manufacturerRepository.UpdateAsync(manufacturer);

            return manufacturer;
        }

        /// <inheritdoc />
        public async Task DeleteAsync(int id)
        {
            var manufacturer = await _manufacturerRepository.GetByIdAsync(id);
            if (manufacturer == null)
                throw new KeyNotFoundException("Không tìm thấy nhà sản xuất để xóa");

            // Kiểm tra xem nhà sản xuất có đang liên kết với sản phẩm nào không
            var hasProducts = (await _productRepository.FindAsync(product => product.ManufacturerId == id)).Any();
            if (hasProducts)
                throw new InvalidOperationException("Không thể xóa nhà sản xuất này vì đang có sản phẩm thuộc hãng.");

            await _manufacturerRepository.DeleteAsync(manufacturer);
        }
    }
}
