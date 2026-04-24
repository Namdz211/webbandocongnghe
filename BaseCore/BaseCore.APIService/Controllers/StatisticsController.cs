using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.Services;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class StatisticsController : ControllerBase
    {
        private readonly IStatisticsService _statisticsService;

        public StatisticsController(IStatisticsService statisticsService)
        {
            _statisticsService = statisticsService;
        }

        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenue([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            if (startDate > endDate)
            {
                return BadRequest("Start date cannot be after end date.");
            }

            // Đảm bảo endDate bao gồm đến hết ngày nếu client chỉ gửi yyyy-MM-dd
            if (endDate.TimeOfDay == TimeSpan.Zero)
            {
                endDate = endDate.AddDays(1).AddTicks(-1);
            }

            var revenue = await _statisticsService.GetRevenueAsync(startDate, endDate);
            return Ok(revenue);
        }

        [HttpGet("inventory")]
        public async Task<IActionResult> GetInventory()
        {
            var inventory = await _statisticsService.GetInventoryAsync();
            return Ok(inventory);
        }
    }
}
