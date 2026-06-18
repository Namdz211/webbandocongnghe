using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Hiện thực các tác vụ truy vấn dữ liệu liên quan đến khách hàng trực tiếp trên DbContext.
    /// </summary>
    public class CustomerRepository : Repository<User>, ICustomerRepository
    {
        /// <summary>
        /// Khởi tạo một phiên bản của CustomerRepository.
        /// </summary>
        public CustomerRepository(AppDbContext context) : base(context)
        {
        }

        /// <inheritdoc />
        public async Task<List<User>> GetCustomersAsync(string keyword)
        {
            var query = _context.Users.Where(u => u.UserType == 0 && u.Id != "guest_checkout");

            if (!string.IsNullOrEmpty(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(u =>
                    (u.Name != null && u.Name.ToLower().Contains(kw)) ||
                    (u.UserName != null && u.UserName.ToLower().Contains(kw)) ||
                    (u.Email != null && u.Email.ToLower().Contains(kw)) ||
                    (u.Phone != null && u.Phone.ToLower().Contains(kw))
                );
            }

            return await query.ToListAsync();
        }

        /// <inheritdoc />
        public async Task<(List<User> Items, int TotalCount)> GetCustomersPagedAsync(
            string keyword,
            int page,
            int pageSize)
        {
            var query = _context.Users
                .Where(u => u.UserType == 0 && u.Id != "guest_checkout");

            if (!string.IsNullOrEmpty(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(u =>
                    (u.Name != null && u.Name.ToLower().Contains(kw)) ||
                    (u.UserName != null && u.UserName.ToLower().Contains(kw)) ||
                    (u.Email != null && u.Email.ToLower().Contains(kw)) ||
                    (u.Phone != null && u.Phone.ToLower().Contains(kw))
                );
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(u => u.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        /// <inheritdoc />
        public async Task<User?> GetCustomerByIdAsync(string id)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.UserType == 0 && u.Id != "guest_checkout");
        }

        /// <inheritdoc />
        public async Task<List<Order>> GetOrdersByUserIdsAsync(List<string> userIds)
        {
            return await _context.Orders
                .Where(o => userIds.Contains(o.UserId))
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<List<Order>> GetOrdersByUserIdAsync(string userId)
        {
            return await _context.Orders
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
        }
    }
}
