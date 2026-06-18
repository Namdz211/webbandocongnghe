using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Defines product review-specific data access operations.
    /// </summary>
    public interface IProductReviewRepository : IRepository<ProductReview>
    {
        /// <summary>
        /// Gets all reviews for a product, including user information.
        /// </summary>
        Task<List<ProductReview>> GetByProductIdAsync(int productId);

        /// <summary>
        /// Gets a user's existing review for a product, when one exists.
        /// </summary>
        Task<ProductReview?> GetByUserAndProductAsync(string userId, int productId);

        /// <summary>
        /// Gets review counts and average ratings grouped by product id.
        /// </summary>
        Task<Dictionary<int, ProductReviewStats>> GetReviewStatsAsync(IEnumerable<int> productIds);
    }

    /// <summary>
    /// Aggregated review metrics for one product.
    /// </summary>
    public class ProductReviewStats
    {
        /// <summary>
        /// Product identifier for this aggregate row.
        /// </summary>
        public int ProductId { get; set; }

        /// <summary>
        /// Number of reviews for the product.
        /// </summary>
        public int ReviewCount { get; set; }

        /// <summary>
        /// Average rating rounded for display.
        /// </summary>
        public double AverageRating { get; set; }
    }
}
