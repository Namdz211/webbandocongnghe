using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public class CouponRepository : Repository<Coupon>, ICouponRepository
    {
        public CouponRepository(MySqlDbContext context) : base(context)
        {
        }

        public async Task<Coupon?> GetByCodeAsync(string code)
        {
            var normalizedCode = code.Trim().ToUpper();
            return await _dbSet.FirstOrDefaultAsync(c => c.Code.ToUpper() == normalizedCode);
        }

        public async Task<bool> UseCouponAsync(int couponId)
        {
            var now = DateTime.UtcNow;
            var updatedRows = await _dbSet
                .Where(coupon =>
                    coupon.Id == couponId &&
                    coupon.IsActive &&
                    (coupon.UsageLimit == 0 || coupon.UsedCount < coupon.UsageLimit) &&
                    coupon.StartDate <= now &&
                    coupon.ExpiryDate >= now)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(coupon => coupon.UsedCount, coupon => coupon.UsedCount + 1));

            return updatedRows == 1;
        }
    }
}
