using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using BaseCore.DTO.Statistics;
using BaseCore.Repository;

namespace BaseCore.Services
{
    public class StatisticsService : IStatisticsService
    {
        private readonly IStatisticsRepository _repository;

        public StatisticsService(IStatisticsRepository repository)
        {
            _repository = repository;
        }

        public async Task<RevenueDto> GetRevenueAsync(DateTime startDate, DateTime endDate)
        {
            return await _repository.GetRevenueAsync(startDate, endDate);
        }

        public async Task<IEnumerable<InventoryDto>> GetInventoryAsync()
        {
            return await _repository.GetInventoryAsync();
        }

        public async Task<IEnumerable<OrderByCategoryDto>> GetOrderStatsByCategoryAsync()
        {
            return await _repository.GetOrderStatsByCategoryAsync();
        }

        public async Task<IEnumerable<InventoryDto>> GetInventoryByCategoryAsync()
        {
            return await _repository.GetInventoryByCategoryAsync();
        }

        public async Task<IEnumerable<ProductSalesDto>> GetTopSellingProductsAsync(DateTime? startDate, DateTime? endDate, int top)
        {
            return await _repository.GetTopSellingProductsAsync(startDate, endDate, top);
        }
    }
}
