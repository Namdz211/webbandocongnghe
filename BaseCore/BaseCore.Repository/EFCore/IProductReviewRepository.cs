using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IProductReviewRepository : IRepository<ProductReview>
    {
        Task<List<ProductReview>> GetByProductIdAsync(int productId);
        Task<ProductReview?> GetByUserAndProductAsync(string userId, int productId);
        Task<Dictionary<int, ProductReviewStats>> GetReviewStatsAsync(IEnumerable<int> productIds);
    }

    public class ProductReviewStats
    {
        public int ProductId { get; set; }
        public int ReviewCount { get; set; }
        public double AverageRating { get; set; }
    }
}
