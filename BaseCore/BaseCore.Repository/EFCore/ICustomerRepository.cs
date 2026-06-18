using System.Collections.Generic;
using System.Threading.Tasks;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Định nghĩa các thao tác truy cập dữ liệu liên quan đến khách hàng và đơn hàng của họ.
    /// </summary>
    public interface ICustomerRepository : IRepository<User>
    {
        /// <summary>
        /// Tìm kiếm danh sách khách hàng (User có UserType == 0) theo từ khóa.
        /// </summary>
        Task<List<User>> GetCustomersAsync(string keyword);

        /// <summary>
        /// Lấy thông tin chi tiết của khách hàng theo ID.
        /// </summary>
        Task<User?> GetCustomerByIdAsync(string id);

        /// <summary>
        /// Lấy toàn bộ đơn hàng của danh sách khách hàng dựa trên danh sách UserId.
        /// </summary>
        Task<List<Order>> GetOrdersByUserIdsAsync(List<string> userIds);

        /// <summary>
        /// Lấy danh sách đơn hàng của một khách hàng cụ thể theo UserId (mới nhất xếp trước).
        /// </summary>
        Task<List<Order>> GetOrdersByUserIdAsync(string userId);
    }
}
