using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Order Repository using Entity Framework Core
    /// </summary>
    public interface IOrderRepositoryEF : IRepository<Order>
    {
        Task<List<Order>> GetByUserAsync(string userId);
        Task<Order?> GetWithDetailsAsync(int orderId);
        Task<bool> HasCompletedOrderForProductAsync(string userId, int productId);
        Task<Order?> GetCompletedOrderForProductAsync(string userId, int productId);
        Task<IDbContextTransaction> BeginTransactionAsync();
        Task<int> CancelOrderAsync(int orderId);
        Task<List<Order>> GetCompletedOrdersByUserIdAsync(string userId);
        Task<List<Order>> GetAllOrdersWithUsersAsync(DateTime? fromDate = null, DateTime? toDate = null, string? keyword = null, string? status = null);
    }

    public class OrderRepositoryEF : Repository<Order>, IOrderRepositoryEF
    {
        public OrderRepositoryEF(MySqlDbContext context) : base(context)
        {
        }

        public async Task<List<Order>> GetByUserAsync(string userId)
        {
            return await _dbSet
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
        }

        public async Task<Order?> GetWithDetailsAsync(int orderId)
        {
            return await _dbSet
                .FirstOrDefaultAsync(o => o.Id == orderId);
        }

        public async Task<bool> HasCompletedOrderForProductAsync(string userId, int productId)
        {
            return await _dbSet
                .Where(order => order.UserId == userId && order.Status == "Completed")
                .AnyAsync(order => order.OrderDetails.Any(detail => detail.ProductId == productId));
        }

        public async Task<Order?> GetCompletedOrderForProductAsync(string userId, int productId)
        {
            return await _dbSet
                .Where(order => order.UserId == userId && order.Status == "Completed")
                .Where(order => order.OrderDetails.Any(detail => detail.ProductId == productId))
                .OrderByDescending(order => order.OrderDate)
                .FirstOrDefaultAsync();
        }

        public async Task<IDbContextTransaction> BeginTransactionAsync()
        {
            return await _context.Database.BeginTransactionAsync();
        }

        public async Task<int> CancelOrderAsync(int orderId)
        {
            return await _dbSet
                .Where(currentOrder => currentOrder.Id == orderId && currentOrder.Status == "Pending")
                .ExecuteUpdateAsync(setters => setters.SetProperty(
                    currentOrder => currentOrder.Status,
                    "Cancelled"));
        }

        public async Task<List<Order>> GetCompletedOrdersByUserIdAsync(string userId)
        {
            return await _dbSet
                .Where(order => order.UserId == userId && order.Status == "Completed")
                .ToListAsync();
        }

        public async Task<List<Order>> GetAllOrdersWithUsersAsync(DateTime? fromDate = null, DateTime? toDate = null, string? keyword = null, string? status = null)
        {
            var query = _dbSet
                .Include(o => o.User)
                .AsNoTracking()
                .AsQueryable();

            if (fromDate.HasValue) query = query.Where(o => o.OrderDate >= fromDate.Value.Date);
            if (toDate.HasValue) query = query.Where(o => o.OrderDate < toDate.Value.Date.AddDays(1));
            if (!string.IsNullOrEmpty(keyword)) query = query.Where(o => o.Id.ToString().Contains(keyword));
            if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);

            return await query.OrderByDescending(o => o.OrderDate).ToListAsync();
        }
    }

    /// <summary>
    /// OrderDetail Repository using Entity Framework Core
    /// </summary>
    public interface IOrderDetailRepositoryEF : IRepository<OrderDetail>
    {
        Task<List<OrderDetail>> GetByOrderAsync(int orderId);
    }

    public class OrderDetailRepositoryEF : Repository<OrderDetail>, IOrderDetailRepositoryEF
    {
        public OrderDetailRepositoryEF(MySqlDbContext context) : base(context)
        {
        }

        public async Task<List<OrderDetail>> GetByOrderAsync(int orderId)
        {
            return await _dbSet
                .Where(od => od.OrderId == orderId)
                .Include(od => od.Product)
                .ToListAsync();
        }
    }
}
