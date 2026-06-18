using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Handles coupon lookup and usage updates with Entity Framework Core.
    /// </summary>
    public class CouponRepository : Repository<Coupon>, ICouponRepository
    {
        /// <summary>
        /// Creates a coupon repository backed by the MySQL EF Core context.
        /// </summary>
        public CouponRepository(MySqlDbContext context) : base(context)
        {
        }

        /// <inheritdoc />
        public async Task<Coupon?> GetByCodeAsync(string code)
        {
            var normalizedCode = code.Trim().ToUpper();
            return await _dbSet.FirstOrDefaultAsync(c => c.Code.ToUpper() == normalizedCode);
        }

        /// <inheritdoc />
        public async Task<bool> UseCouponAsync(int couponId)
        {
            var now = DateTime.UtcNow;

            // Atomically increments usage only when the coupon is currently valid.
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

        /// <inheritdoc />
        public async Task<List<Coupon>> GetPublicCouponsAsync()
        {
            var now = DateTime.UtcNow;
            return await _dbSet
                .Where(c =>
                    c.IsActive &&
                    (c.UsageLimit == 0 || c.UsedCount < c.UsageLimit) &&
                    c.StartDate <= now &&
                    c.ExpiryDate >= now)
                .OrderBy(c => c.ExpiryDate)
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<List<Coupon>> GetAllCouponsAsync(string? keyword, bool? isActive)
        {
            var query = _dbSet.AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(c =>
                    c.Code.ToLower().Contains(kw) ||
                    c.Description.ToLower().Contains(kw));
            }

            if (isActive.HasValue)
                query = query.Where(c => c.IsActive == isActive.Value);

            return await query
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }
    }
}
