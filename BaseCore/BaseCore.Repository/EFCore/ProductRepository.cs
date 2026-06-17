using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Product Repository using Entity Framework Core
    /// </summary>
    public interface IProductRepositoryEF : IRepository<Product>
    {
        Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string? keyword,
            int? categoryId,
            string? manufacturer,
            decimal? minPrice,
            decimal? maxPrice,
            string? sortBy,
            int page,
            int pageSize);
        Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string? keyword,
            int? categoryId,
            string? manufacturer,
            decimal? minPrice,
            decimal? maxPrice,
            string? sortBy,
            DateTime? startDate,
            DateTime? endDate,
            int page,
            int pageSize);
        Task<(List<Product> Products, int TotalCount)> SearchAsync(string? keyword, int? categoryId, int page, int pageSize);
        Task<List<Product>> GetByCategoryAsync(int categoryId);
        Task<List<string>> GetManufacturersAsync(int? categoryId = null);
        Task<Product?> GetDetailByIdAsync(int id);
        Task<Dictionary<int, int>> GetSoldStatsAsync(
            IEnumerable<int> productIds,
            DateTime? startDate = null,
            DateTime? endDate = null);
        Task<bool> HasOrdersAsync(int productId);
    }

    public class ProductRepositoryEF : Repository<Product>, IProductRepositoryEF
    {
        public ProductRepositoryEF(MySqlDbContext context) : base(context)
        {
        }

        public async Task<Dictionary<int, int>> GetSoldStatsAsync(
            IEnumerable<int> productIds,
            DateTime? startDate = null,
            DateTime? endDate = null)
        {
            var ids = productIds.Distinct().ToList();
            if (ids.Count == 0)
                return new Dictionary<int, int>();

            return await _context.OrderDetails
                .AsNoTracking()
                .Join(
                    _context.Orders.AsNoTracking(),
                    detail => detail.OrderId,
                    order => order.Id,
                    (detail, order) => new { detail, order })
                .Where(item =>
                    ids.Contains(item.detail.ProductId) &&
                    item.order.Status == "Completed" &&
                    (!startDate.HasValue || item.order.OrderDate >= startDate.Value) &&
                    (!endDate.HasValue || item.order.OrderDate <= endDate.Value))
                .GroupBy(item => item.detail.ProductId)
                .Select(group => new
                {
                    ProductId = group.Key,
                    SoldQuantity = group.Sum(item => item.detail.Quantity)
                })
                .ToDictionaryAsync(item => item.ProductId, item => item.SoldQuantity);
        }

        public async Task<bool> HasOrdersAsync(int productId)
        {
            return await _context.OrderDetails.AnyAsync(orderDetail => orderDetail.ProductId == productId);
        }

        public override async Task<Product?> GetByIdAsync(object id)
        {
            if (id is int productId)
            {
                return await _dbSet
                    .Include(p => p.Category)
                    .FirstOrDefaultAsync(p => p.Id == productId);
            }

            return await base.GetByIdAsync(id);
        }

        public Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string? keyword,
            int? categoryId,
            string? manufacturer,
            decimal? minPrice,
            decimal? maxPrice,
            string? sortBy,
            int page,
            int pageSize)
        {
            return SearchAsync(
                keyword,
                categoryId,
                manufacturer,
                minPrice,
                maxPrice,
                sortBy,
                null,
                null,
                page,
                pageSize);
        }

        public async Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string? keyword,
            int? categoryId,
            string? manufacturer,
            decimal? minPrice,
            decimal? maxPrice,
            string? sortBy,
            DateTime? startDate,
            DateTime? endDate,
            int page,
            int pageSize)
        {
            var query = _dbSet.Include(p => p.Category).AsQueryable();

            if (!string.IsNullOrEmpty(keyword))
            {
                keyword = keyword.ToLower();
                query = query.Where(p =>
                    p.Name.ToLower().Contains(keyword) ||
                    p.Manufacturer.ToLower().Contains(keyword) ||
                    (p.Description != null && p.Description.ToLower().Contains(keyword)));
            }

            if (categoryId.HasValue && categoryId > 0)
            {
                query = query.Where(p => p.CategoryId == categoryId);
            }

            if (!string.IsNullOrWhiteSpace(manufacturer))
            {
                var normalizedManufacturer = manufacturer.Trim().ToLower();
                query = query.Where(p => p.Manufacturer.ToLower() == normalizedManufacturer);
            }

            if (minPrice.HasValue)
            {
                query = query.Where(p => p.Price >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= maxPrice.Value);
            }

            var normalizedSortBy = (sortBy ?? "recent").Trim().ToLowerInvariant();
            var completedSales = _context.OrderDetails.Where(detail =>
                _context.Orders.Any(order =>
                    order.Id == detail.OrderId &&
                    order.Status == "Completed" &&
                    (!startDate.HasValue || order.OrderDate >= startDate.Value) &&
                    (!endDate.HasValue || order.OrderDate <= endDate.Value)));

            if (normalizedSortBy == "bestselling")
            {
                query = query.Where(product =>
                    completedSales.Any(detail => detail.ProductId == product.Id));
            }

            var totalCount = await query.CountAsync();

            query = normalizedSortBy switch
            {
                "bestselling" => query
                    .OrderByDescending(p => completedSales
                        .Where(detail => detail.ProductId == p.Id)
                        .Sum(detail => (int?)detail.Quantity) ?? 0)
                    .ThenByDescending(p => completedSales
                        .Where(detail => detail.ProductId == p.Id)
                        .Sum(detail => (decimal?)(detail.Quantity * detail.UnitPrice)) ?? 0)
                    .ThenByDescending(p => p.Id),
                "priceasc" => query.OrderBy(p => p.Price).ThenByDescending(p => p.Id),
                "pricedesc" => query.OrderByDescending(p => p.Price).ThenByDescending(p => p.Id),
                _ => query.OrderByDescending(p => p.Id)
            };

            var products = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (products, totalCount);
        }

        public Task<(List<Product> Products, int TotalCount)> SearchAsync(string? keyword, int? categoryId, int page, int pageSize)
        {
            return SearchAsync(keyword, categoryId, null, null, null, null, page, pageSize);
        }

        public async Task<List<Product>> GetByCategoryAsync(int categoryId)
        {
            return await _dbSet
                .Where(p => p.CategoryId == categoryId)
                .Include(p => p.Category)
                .ToListAsync();
        }

        public async Task<List<string>> GetManufacturersAsync(int? categoryId = null)
        {
            var query = _dbSet.AsQueryable();

            if (categoryId.HasValue && categoryId > 0)
            {
                query = query.Where(p => p.CategoryId == categoryId);
            }

            return await query
                .Where(p => p.Manufacturer != "")
                .Select(p => p.Manufacturer)
                .Distinct()
                .OrderBy(manufacturer => manufacturer)
                .ToListAsync();
        }

        public async Task<Product?> GetDetailByIdAsync(int id)
        {
            return await _dbSet
                .Include(p => p.Category)
                .FirstOrDefaultAsync(p => p.Id == id);
        }
    }
}
