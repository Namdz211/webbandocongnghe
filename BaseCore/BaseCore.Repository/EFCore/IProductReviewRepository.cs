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

        /// <summary>
        /// Gets paged reviews for the admin management view, with filters and global statistics.
        /// </summary>
        Task<(List<AdminReviewSearchResult> Items, int TotalCount, AdminReviewSummary Summary)> GetAdminReviewsAsync(
            string? search,
            int? rating,
            string? sortBy,
            bool? negativeOnly,
            int page,
            int pageSize);
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

    /// <summary>
    /// Search result for admin reviews management.
    /// </summary>
    public class AdminReviewSearchResult
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = "";
        public string UserId { get; set; } = "";
        public string UserName { get; set; } = "";
        public int Rating { get; set; }
        public string Comment { get; set; } = "";
        public DateTime CreatedDate { get; set; }
    }

    /// <summary>
    /// Summary statistics of reviews for admin.
    /// </summary>
    public class AdminReviewSummary
    {
        public int TotalReviews { get; set; }
        public double AverageRating { get; set; }
        public int NegativeCount { get; set; }
    }
}
