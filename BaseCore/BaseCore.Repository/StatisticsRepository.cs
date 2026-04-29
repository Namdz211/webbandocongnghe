using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using BaseCore.DTO.Statistics;
using BaseCore.Entities;

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
            var inventory = await (from p in _context.Products
                                  join c in _context.Categories on p.CategoryId equals c.Id into catGroup
                                  from c in catGroup.DefaultIfEmpty()
                                  group p by c.Name ?? "Uncategorized" into g
                                  select new InventoryDto
                                  {
                                      CategoryName = g.Key,
                                      QuantityInStock = g.Sum(p => p.Stock)
                                  }).ToListAsync();

            return inventory;
        }

        public async Task<IEnumerable<InventoryDto>> GetInventoryByCategoryAsync()
        {
            return await GetInventoryAsync();
        }

        public async Task<IEnumerable<OrderByCategoryDto>> GetOrderStatsByCategoryAsync()
        {
            var orderStats = await (from od in _context.OrderDetails
                                   join p in _context.Products on od.ProductId equals p.Id
                                   join c in _context.Categories on p.CategoryId equals c.Id into catGroup
                                   from c in catGroup.DefaultIfEmpty()
                                   join o in _context.Orders on od.OrderId equals o.Id
                                   where o.Status == "Completed"
                                   group new { od, p, c } by c.Name ?? "Uncategorized" into g
                                   select new OrderByCategoryDto
                                   {
                                       CategoryName = g.Key,
                                       OrderCount = g.Select(x => x.od.OrderId).Distinct().Count(),
                                       TotalQuantitySold = g.Sum(x => x.od.Quantity),
                                       TotalRevenue = g.Sum(x => x.od.Quantity * x.od.UnitPrice)
                                   }).ToListAsync();

            return orderStats;
        }
    }
}
