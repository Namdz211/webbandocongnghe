using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Handles product review queries and review aggregate statistics.
    /// </summary>
    public class ProductReviewRepository : Repository<ProductReview>, IProductReviewRepository
    {
        /// <summary>
        /// Creates a product review repository backed by the MySQL EF Core context.
        /// </summary>
        public ProductReviewRepository(AppDbContext context) : base(context)
        {
        }

        /// <inheritdoc />
        public async Task<List<ProductReview>> GetByProductIdAsync(int productId)
        {
            return await _dbSet
                .Where(r => r.ProductId == productId)
                .Include(r => r.User)
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<ProductReview?> GetByUserAndProductAsync(string userId, int productId)
        {
            return await _dbSet
                .FirstOrDefaultAsync(r => r.UserId == userId && r.ProductId == productId);
        }

        /// <inheritdoc />
        public async Task<Dictionary<int, ProductReviewStats>> GetReviewStatsAsync(IEnumerable<int> productIds)
        {
            var ids = productIds.Distinct().ToList();
            if (ids.Count == 0)
                return new Dictionary<int, ProductReviewStats>();

            // Group reviews in the database to avoid loading every review into memory.
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

        /// <inheritdoc />
        public async Task<(List<AdminReviewSearchResult> Items, int TotalCount, AdminReviewSummary Summary)> GetAdminReviewsAsync(
            string? search,
            int? rating,
            string? sortBy,
            bool? negativeOnly,
            int page,
            int pageSize)
        {
            var query = _dbSet
                .Include(r => r.User)
                .AsQueryable();

            // Thực hiện Join bảng với Products để lấy tên sản phẩm
            var reviewsWithProduct = from r in query
                                     join p in _context.Products on r.ProductId equals p.Id
                                     select new AdminReviewSearchResult
                                     {
                                         Id = r.Id,
                                         ProductId = r.ProductId,
                                         ProductName = p.Name,
                                         UserId = r.UserId,
                                         UserName = r.User != null ? r.User.Name : "Khách hàng",
                                         Rating = r.Rating,
                                         Comment = r.Content,
                                         CreatedDate = r.CreatedAt
                                     };

            // Tìm kiếm theo tên sản phẩm, nội dung bình luận hoặc tên khách hàng
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                reviewsWithProduct = reviewsWithProduct.Where(r => 
                    r.ProductName.ToLower().Contains(searchLower) || 
                    r.Comment.ToLower().Contains(searchLower) || 
                    r.UserName.ToLower().Contains(searchLower));
            }

            // Lọc theo số sao đánh giá
            if (rating.HasValue)
            {
                reviewsWithProduct = reviewsWithProduct.Where(r => r.Rating == rating.Value);
            }
            // Chỉ lấy các đánh giá tiêu cực (từ 1 đến 3 sao)
            else if (negativeOnly == true)
            {
                reviewsWithProduct = reviewsWithProduct.Where(r => r.Rating <= 3);
            }

            // Sắp xếp kết quả
            if (sortBy == "rating_desc")
            {
                reviewsWithProduct = reviewsWithProduct.OrderByDescending(r => r.Rating).ThenByDescending(r => r.CreatedDate);
            }
            else if (sortBy == "rating_asc")
            {
                reviewsWithProduct = reviewsWithProduct.OrderBy(r => r.Rating).ThenByDescending(r => r.CreatedDate);
            }
            else if (sortBy == "oldest")
            {
                reviewsWithProduct = reviewsWithProduct.OrderBy(r => r.CreatedDate);
            }
            else // Mặc định sắp xếp theo đánh giá mới nhất lên đầu
            {
                reviewsWithProduct = reviewsWithProduct.OrderByDescending(r => r.CreatedDate);
            }

            // Thực hiện tính toán phân trang
            var totalCount = await reviewsWithProduct.CountAsync();
            var items = await reviewsWithProduct
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Tính toán số liệu thống kê chung cho trang quản trị
            var statsQuery = _dbSet.AsQueryable();
            var totalCountGlobal = await statsQuery.CountAsync();
            var averageRatingGlobal = totalCountGlobal > 0 ? await statsQuery.AverageAsync(r => r.Rating) : 0;
            var negativeCountGlobal = await statsQuery.CountAsync(r => r.Rating <= 3);

            var summary = new AdminReviewSummary
            {
                TotalReviews = totalCountGlobal,
                AverageRating = Math.Round(averageRatingGlobal, 1),
                NegativeCount = negativeCountGlobal
            };

            return (items, totalCount, summary);
        }
    }
}
