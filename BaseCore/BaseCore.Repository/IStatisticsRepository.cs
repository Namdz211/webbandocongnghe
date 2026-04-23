using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using BaseCore.DTO.Statistics;

namespace BaseCore.Repository
{
    public interface IStatisticsRepository
    {
        Task<RevenueDto> GetRevenueAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<InventoryDto>> GetInventoryAsync();
    }
}
