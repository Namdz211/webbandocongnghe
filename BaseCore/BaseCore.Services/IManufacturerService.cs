using BaseCore.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    /// <summary>
    /// Định nghĩa các nghiệp vụ xử lý trung gian cho Nhà sản xuất (Manufacturer)
    /// </summary>
    public interface IManufacturerService
    {
        /// <summary>
        /// Lấy danh sách tất cả các nhà sản xuất, sắp xếp tăng dần theo tên
        /// </summary>
        Task<IEnumerable<Manufacturer>> GetAllAsync();

        /// <summary>
        /// Lấy thông tin nhà sản xuất theo ID
        /// </summary>
        Task<Manufacturer?> GetByIdAsync(int id);

        /// <summary>
        /// Thêm mới một nhà sản xuất (Kiểm tra trùng tên)
        /// </summary>
        Task<Manufacturer> CreateAsync(string name);

        /// <summary>
        /// Cập nhật thông tin nhà sản xuất
        /// </summary>
        Task<Manufacturer> UpdateAsync(int id, string name);

        /// <summary>
        /// Xóa nhà sản xuất (Kiểm tra xem có liên kết sản phẩm hay không)
        /// </summary>
        Task DeleteAsync(int id);
    }
}
