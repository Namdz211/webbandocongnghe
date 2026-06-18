using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Entities;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Yêu cầu xác thực JWT Token để truy cập thông tin khách hàng
    public class CustomersController : ControllerBase
    {
        private readonly ICustomerRepository _customerRepository;

        public CustomersController(ICustomerRepository customerRepository)
        {
            _customerRepository = customerRepository;
        }

        /// <summary>
        /// Lấy danh sách khách hàng (User có UserType == 0) kèm theo phân loại và chi tiêu
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string keyword = "", [FromQuery] string segment = "")
        {
            // 1. Lấy danh sách khách hàng thông qua Repository
            var users = await _customerRepository.GetCustomersAsync(keyword);
            
            // 2. Lấy toàn bộ danh sách đơn hàng của những khách hàng này để phân tích hành vi mua sắm
            var userIds = users.Select(u => u.Id).ToList();
            var orders = await _customerRepository.GetOrdersByUserIdsAsync(userIds);

            // Nhóm đơn hàng theo UserId để xử lý in-memory giúp tối ưu hóa hiệu năng, giảm tải truy vấn DB lặp đi lặp lại
            var ordersGrouped = orders.GroupBy(o => o.UserId).ToDictionary(g => g.Key, g => g.ToList());

            // 3. Tổng hợp dữ liệu đơn hàng và gán phân hạng cho từng khách hàng
            var customersList = users.Select(u =>
            {
                var userOrders = ordersGrouped.TryGetValue(u.Id, out var oList) ? oList : new List<Order>();
                
                // Tính tổng số lượng đơn hàng khách hàng đã tạo
                var totalOrders = userOrders.Count;
                
                // Lọc ra các đơn hàng đã được giao hàng thành công (Completed)
                var completedOrdersList = userOrders.Where(o => string.Equals(o.Status, "Completed", StringComparison.OrdinalIgnoreCase)).ToList();
                var completedOrders = completedOrdersList.Count;
                
                // Tổng số tiền khách hàng đã thanh toán cho các đơn hàng hoàn thành
                var totalSpent = completedOrdersList.Sum(o => o.TotalAmount);
                
                // Tìm đơn hàng đặt gần đây nhất của khách
                var lastOrder = userOrders.OrderByDescending(o => o.OrderDate).FirstOrDefault();
                DateTime? lastOrderDate = lastOrder?.OrderDate;

                // Tính toán phân khúc (VIP, Loyal, Potential, New, NoOrders) dựa trên đơn hoàn thành & chi tiêu
                var seg = CalculateCustomerSegment(completedOrders, totalSpent);
                
                // Đưa ra gợi ý ưu đãi tương thích với phân khúc khách hàng
                var suggestedOffer = GetSuggestedOffer(seg);

                return new CustomerResponseDto
                {
                    UserId = u.Id,
                    Name = u.Name,
                    UserName = u.UserName,
                    Email = u.Email,
                    Phone = u.Phone,
                    Address = u.Address,
                    TotalOrders = totalOrders,
                    CompletedOrders = completedOrders,
                    TotalSpent = totalSpent,
                    LastOrderDate = lastOrderDate,
                    Segment = seg,
                    SuggestedOffer = suggestedOffer
                };
            }).ToList();

            // 4. Lọc kết quả theo phân khúc khách hàng cụ thể nếu client có yêu cầu bộ lọc
            if (!string.IsNullOrEmpty(segment))
            {
                customersList = customersList
                    .Where(c => string.Equals(c.Segment, segment, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            // Trả về trực tiếp mảng dữ liệu khách hàng cho frontend
            return Ok(customersList);
        }

        /// <summary>
        /// Lấy chi tiết thông tin và lịch sử đơn hàng của một khách hàng cụ thể
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            // Tìm kiếm tài khoản khách hàng theo ID thông qua Repository
            var user = await _customerRepository.GetCustomerByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy khách hàng" });
            }

            // Lấy toàn bộ lịch sử đơn hàng của khách hàng này thông qua Repository (sắp xếp đơn mới nhất ở trên cùng)
            var userOrders = await _customerRepository.GetOrdersByUserIdAsync(id);

            // Phân tích các thông tin mua sắm của khách hàng
            var totalOrders = userOrders.Count;
            var completedOrdersList = userOrders.Where(o => string.Equals(o.Status, "Completed", StringComparison.OrdinalIgnoreCase)).ToList();
            var completedOrders = completedOrdersList.Count;
            var totalSpent = completedOrdersList.Sum(o => o.TotalAmount);

            // Tính phân khúc và gợi ý khuyến mãi phù hợp
            var seg = CalculateCustomerSegment(completedOrders, totalSpent);
            var suggestedOffer = GetSuggestedOffer(seg);

            var customerDetail = new CustomerResponseDto
            {
                UserId = user.Id,
                Name = user.Name,
                UserName = user.UserName,
                Email = user.Email,
                Phone = user.Phone,
                Address = user.Address,
                TotalOrders = totalOrders,
                CompletedOrders = completedOrders,
                TotalSpent = totalSpent,
                LastOrderDate = userOrders.FirstOrDefault()?.OrderDate,
                Segment = seg,
                SuggestedOffer = suggestedOffer
            };

            // Định dạng danh sách đơn hàng tối giản để trả về Client (tiết kiệm băng thông)
            var ordersResult = userOrders.Select(o => new
            {
                id = o.Id,
                orderDate = o.OrderDate,
                totalAmount = o.TotalAmount,
                status = o.Status,
                paymentStatus = o.PaymentStatus,
                deliveryStatus = o.DeliveryStatus
            }).ToList();

            // Phản hồi JSON chứa cả thông tin khách hàng và lịch sử đơn hàng
            return Ok(new
            {
                customer = customerDetail,
                orders = ordersResult
            });
        }

        /// <summary>
        /// Logic phân nhóm/phân khúc khách hàng dựa trên kết quả đơn hoàn thành và số tiền đã chi tiêu
        /// </summary>
        private static string CalculateCustomerSegment(int completedOrders, decimal totalSpent)
        {
            // Hạng VIP: Từ 5 đơn hoàn thành HOẶC chi tiêu tích lũy tối thiểu 50.000.000đ
            if (completedOrders >= 5 || totalSpent >= 50000000) return "VIP";
            // Hạng Thân thiết (Loyal): Từ 3 đơn hoàn thành HOẶC chi tiêu tích lũy tối thiểu 20.000.000đ
            if (completedOrders >= 3 || totalSpent >= 20000000) return "Loyal";
            // Hạng Tiềm năng (Potential): Từ 2 đơn hoàn thành HOẶC chi tiêu tích lũy tối thiểu 10.000.000đ
            if (completedOrders >= 2 || totalSpent >= 10000000) return "Potential";
            // Hạng Khách mới (New): Đã mua và hoàn thành đúng 1 đơn hàng
            if (completedOrders == 1) return "New";
            // Hạng Chưa mua (NoOrders): Chưa có đơn hàng nào giao thành công
            return "NoOrders";
        }

        /// <summary>
        /// Xác định ưu đãi đề xuất tương ứng với từng phân hạng khách hàng để tăng tỷ lệ giữ chân hoặc mua lại
        /// </summary>
        private static string GetSuggestedOffer(string segment)
        {
            return segment switch
            {
                "VIP" => "Ưu đãi giảm 10% trực tiếp trên đơn hàng",
                "Loyal" => "Ưu đãi giảm 7% trực tiếp trên đơn hàng",
                "Potential" => "Ưu đãi giảm 5% trực tiếp trên đơn hàng",
                "New" => "Ưu đãi giảm 3% trực tiếp trên đơn hàng",
                _ => "Tặng mã giảm giá 5% cho đơn hàng đầu tiên"
            };
        }
    }

    /// <summary>
    /// Lớp DTO định nghĩa cấu trúc dữ liệu khách hàng phản hồi về cho Frontend quản trị hiển thị
    /// </summary>
    public class CustomerResponseDto
    {
        public string UserId { get; set; } = "";
        public string Name { get; set; } = "";
        public string UserName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Address { get; set; } = "";
        public int TotalOrders { get; set; }
        public int CompletedOrders { get; set; }
        public decimal TotalSpent { get; set; }
        public DateTime? LastOrderDate { get; set; }
        public string Segment { get; set; } = "";
        public string SuggestedOffer { get; set; } = "";
    }
}
