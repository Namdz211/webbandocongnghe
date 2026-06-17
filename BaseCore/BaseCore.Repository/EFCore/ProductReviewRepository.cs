using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public class ProductReviewRepository : Repository<ProductReview>, IProductReviewRepository
    {
        public ProductReviewRepository(MySqlDbContext context) : base(context)
        {
        }

        public async Task<List<ProductReview>> GetByProductIdAsync(int productId)
        {
            return await _dbSet
                .Where(r => r.ProductId == productId)
                .Include(r => r.User)
                .ToListAsync();
        }

        public async Task<ProductReview?> GetByUserAndProductAsync(string userId, int productId)
        {
            return await _dbSet
                .FirstOrDefaultAsync(r => r.UserId == userId && r.ProductId == productId);
        }

        public async Task<Dictionary<int, ProductReviewStats>> GetReviewStatsAsync(IEnumerable<int> productIds)
        {
            var ids = productIds.Distinct().ToList();
            if (ids.Count == 0)
                return new Dictionary<int, ProductReviewStats>();

            return await _dbSet
                .AsNoTracking()
                .Where(review => ids.Contains(review.ProductId))
                .GroupBy(review => review.ProductId)
                .Select(group => new ProductReviewStats
                {
                    ProductId = group.Key,
                    ReviewCount = group.Count(),
                    AverageRating = Math.Round(group.Average(review => review.Rating), 1)
                })
                .ToDictionaryAsync(item => item.ProductId);
        }
    }
}
