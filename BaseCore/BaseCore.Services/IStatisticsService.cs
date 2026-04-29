using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using BaseCore.DTO.Statistics;

namespace BaseCore.Services
{
    public interface IStatisticsService
    {
        Task<RevenueDto> GetRevenueAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<InventoryDto>> GetInventoryAsync();
        Task<IEnumerable<OrderByCategoryDto>> GetOrderStatsByCategoryAsync();
        Task<IEnumerable<InventoryDto>> GetInventoryByCategoryAsync();
    }
}
