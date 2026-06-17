using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface ICouponRepository : IRepository<Coupon>
    {
        Task<Coupon?> GetByCodeAsync(string code);
        Task<bool> UseCouponAsync(int couponId);
    }
}
