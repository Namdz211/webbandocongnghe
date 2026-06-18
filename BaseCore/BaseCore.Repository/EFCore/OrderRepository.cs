using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Defines order-specific data access operations.
    /// </summary>
    public interface IOrderRepositoryEF : IRepository<Order>
    {
        /// <summary>
        /// Gets orders that belong to one user, newest first.
        /// </summary>
        Task<List<Order>> GetByUserAsync(string userId);

        /// <summary>
        /// Gets a single order by id.
        /// </summary>
        Task<Order?> GetWithDetailsAsync(int orderId);

        /// <summary>
        /// Checks whether the user has completed an order containing the product.
        /// </summary>
        Task<bool> HasCompletedOrderForProductAsync(string userId, int productId);

        /// <summary>
        /// Gets the newest completed order containing the product for the user.
        /// </summary>
        Task<Order?> GetCompletedOrderForProductAsync(string userId, int productId);

        /// <summary>
        /// Starts a database transaction for multi-step order operations.
        /// </summary>
        Task<IDbContextTransaction> BeginTransactionAsync();

        /// <summary>
        /// Cancels a pending order and returns the number of updated rows.
        /// </summary>
        Task<int> CancelOrderAsync(int orderId);

        /// <summary>
        /// Gets all completed orders for one user.
        /// </summary>
        Task<List<Order>> GetCompletedOrdersByUserIdAsync(string userId);

        /// <summary>
        /// Gets orders with user data, filtered for the admin order list.
        /// </summary>
        Task<List<Order>> GetAllOrdersWithUsersAsync(DateTime? fromDate = null, DateTime? toDate = null, string? keyword = null, string? status = null);
    }

    /// <summary>
    /// Handles order queries, status updates, and transaction creation.
    /// </summary>
    public class OrderRepositoryEF : Repository<Order>, IOrderRepositoryEF
    {
        /// <summary>
        /// Creates an order repository backed by the MySQL EF Core context.
        /// </summary>
        public OrderRepositoryEF(AppDbContext context) : base(context)
        {
        }

        /// <inheritdoc />
        public async Task<List<Order>> GetByUserAsync(string userId)
        {
            return await _dbSet
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<Order?> GetWithDetailsAsync(int orderId)
        {
            return await _dbSet
                .FirstOrDefaultAsync(o => o.Id == orderId);
        }

        /// <inheritdoc />
        public async Task<bool> HasCompletedOrderForProductAsync(string userId, int productId)
        {
            return await _dbSet
                .Where(order => order.UserId == userId && order.Status == "Completed")
                .AnyAsync(order => order.OrderDetails.Any(detail => detail.ProductId == productId));
        }

        /// <inheritdoc />
        public async Task<Order?> GetCompletedOrderForProductAsync(string userId, int productId)
        {
            return await _dbSet
                .Where(order => order.UserId == userId && order.Status == "Completed")
                .Where(order => order.OrderDetails.Any(detail => detail.ProductId == productId))
                .OrderByDescending(order => order.OrderDate)
                .FirstOrDefaultAsync();
        }

        /// <inheritdoc />
        public async Task<IDbContextTransaction> BeginTransactionAsync()
        {
            return await _context.Database.BeginTransactionAsync();
        }

        /// <inheritdoc />
        public async Task<int> CancelOrderAsync(int orderId)
        {
            // ExecuteUpdateAsync avoids loading the order when only the status changes.
            return await _dbSet
                .Where(currentOrder => currentOrder.Id == orderId && currentOrder.Status == "Pending")
                .ExecuteUpdateAsync(setters => setters.SetProperty(
                    currentOrder => currentOrder.Status,
                    "Cancelled"));
        }

        /// <inheritdoc />
        public async Task<List<Order>> GetCompletedOrdersByUserIdAsync(string userId)
        {
            return await _dbSet
                .Where(order => order.UserId == userId && order.Status == "Completed")
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<List<Order>> GetAllOrdersWithUsersAsync(DateTime? fromDate = null, DateTime? toDate = null, string? keyword = null, string? status = null)
        {
            var query = _dbSet
                .Include(o => o.User)
                .AsNoTracking()
                .AsQueryable();

            // Date filters are inclusive for the selected calendar days.
            if (fromDate.HasValue) query = query.Where(o => o.OrderDate >= fromDate.Value.Date);
            if (toDate.HasValue) query = query.Where(o => o.OrderDate < toDate.Value.Date.AddDays(1));
            if (!string.IsNullOrEmpty(keyword)) query = query.Where(o => o.Id.ToString().Contains(keyword));
            if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);

            return await query.OrderByDescending(o => o.OrderDate).ToListAsync();
        }
    }

    /// <summary>
    /// Defines order-detail-specific data access operations.
    /// </summary>
    public interface IOrderDetailRepositoryEF : IRepository<OrderDetail>
    {
        /// <summary>
        /// Gets all line items for one order, including product data.
        /// </summary>
        Task<List<OrderDetail>> GetByOrderAsync(int orderId);
    }

    /// <summary>
    /// Handles order detail queries.
    /// </summary>
    public class OrderDetailRepositoryEF : Repository<OrderDetail>, IOrderDetailRepositoryEF
    {
        /// <summary>
        /// Creates an order detail repository backed by the MySQL EF Core context.
        /// </summary>
        public OrderDetailRepositoryEF(AppDbContext context) : base(context)
        {
        }

        /// <inheritdoc />
        public async Task<List<OrderDetail>> GetByOrderAsync(int orderId)
        {
            return await _dbSet
                .Where(od => od.OrderId == orderId)
                .Include(od => od.Product)
                .ToListAsync();
        }
    }
}
