using System.Collections.Generic;
using System.Threading.Tasks;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Defines coupon-specific data access operations.
    /// </summary>
    public interface ICouponRepository : IRepository<Coupon>
    {
        /// <summary>
        /// Gets a coupon by its normalized code.
        /// </summary>
        Task<Coupon?> GetByCodeAsync(string code);

        /// <summary>
        /// Attempts to consume one coupon usage and returns whether it succeeded.
        /// </summary>
        Task<bool> UseCouponAsync(int couponId);

        /// <summary>
        /// Lấy danh sách các mã giảm giá công khai, còn hiệu lực và còn lượt dùng.
        /// </summary>
        Task<List<Coupon>> GetPublicCouponsAsync();

        /// <summary>
        /// Lấy danh sách mã giảm giá theo từ khóa và trạng thái kích hoạt (cho quản trị viên).
        /// </summary>
        Task<List<Coupon>> GetAllCouponsAsync(string? keyword, bool? isActive);
    }
}
