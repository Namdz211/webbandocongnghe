using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.Services;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// API Controller quản lý Thống kê và Báo cáo (Statistics)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")] // Chỉ có tài khoản Admin mới được truy cập các thông tin thống kê
    public class StatisticsController : ControllerBase
    {
        private readonly IStatisticsService _statisticsService;

        public StatisticsController(IStatisticsService statisticsService)
        {
            _statisticsService = statisticsService;
        }

        /// <summary>
        /// Thống kê doanh thu theo khoảng thời gian từ ngày đến ngày
        /// </summary>
        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenue([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            if (startDate > endDate)
            {
                return BadRequest("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
            }

            // Đảm bảo endDate bao gồm đến hết ngày nếu client chỉ gửi yyyy-MM-dd (thiếu giờ)
            if (endDate.TimeOfDay == TimeSpan.Zero)
            {
                endDate = endDate.AddDays(1).AddTicks(-1);
            }

            var revenue = await _statisticsService.GetRevenueAsync(startDate, endDate);
            return Ok(revenue);
        }

        /// <summary>
        /// Lấy báo cáo tồn kho hiện tại (tổng số lượng sản phẩm, tổng giá trị tồn kho)
        /// </summary>
        [HttpGet("inventory")]
        public async Task<IActionResult> GetInventory()
        {
            var inventory = await _statisticsService.GetInventoryAsync();
            return Ok(inventory);
        }

        /// <summary>
        /// Lấy thống kê số lượng đơn đặt hàng phân nhóm theo Danh mục sản phẩm
        /// </summary>
        [HttpGet("orders-by-category")]
        public async Task<IActionResult> GetOrdersByCategory()
        {
            var orderStats = await _statisticsService.GetOrderStatsByCategoryAsync();
            return Ok(orderStats);
        }

        /// <summary>
        /// Lấy thống kê số lượng sản phẩm tồn kho phân nhóm theo Danh mục sản phẩm
        /// </summary>
        [HttpGet("inventory-by-category")]
        public async Task<IActionResult> GetInventoryByCategory()
        {
            var stats = await _statisticsService.GetInventoryByCategoryAsync();
            return Ok(stats);
        }

        /// <summary>
        /// Lấy danh sách các sản phẩm bán chạy nhất trong khoảng thời gian xác định
        /// </summary>
        [HttpGet("top-selling-products")]
        public async Task<IActionResult> GetTopSellingProducts(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int top = 5)
        {
            if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
            {
                return BadRequest("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
            }

            // Đảm bảo tính toán đến hết ngày cuối cùng của chu kỳ lọc
            if (endDate.HasValue && endDate.Value.TimeOfDay == TimeSpan.Zero)
            {
                endDate = endDate.Value.AddDays(1).AddTicks(-1);
            }

            var stats = await _statisticsService.GetTopSellingProductsAsync(startDate, endDate, top);
            return Ok(stats);
        }
    }
}
