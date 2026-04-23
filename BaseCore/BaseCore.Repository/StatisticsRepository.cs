using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using BaseCore.DTO.Statistics;

namespace BaseCore.Repository
{
    public class StatisticsRepository : IStatisticsRepository
    {
        private readonly MySqlDbContext _context;

        public StatisticsRepository(MySqlDbContext context)
        {
            _context = context;
        }

        public async Task<RevenueDto> GetRevenueAsync(DateTime startDate, DateTime endDate)
        {
            // Cần đảm bảo endDate bao gồm cả ngày cuối cùng bằng cách đặt thời gian là cuối ngày nếu cần
            var completedOrders = await _context.Orders
                .Where(o => o.Status == "Completed" && o.OrderDate >= startDate && o.OrderDate <= endDate)
                .ToListAsync();

            return new RevenueDto
            {
                TotalRevenue = completedOrders.Sum(o => o.TotalAmount),
                OrderCount = completedOrders.Count
            };
        }

        public async Task<IEnumerable<InventoryDto>> GetInventoryAsync()
        {
            var inventory = await _context.Products
                .Include(p => p.Category)
                .GroupBy(p => p.Category.Name)
                .Select(g => new InventoryDto
                {
                    CategoryName = g.Key,
                    QuantityInStock = g.Sum(p => p.Stock)
                })
                .ToListAsync();

            return inventory;
        }
    }
}
