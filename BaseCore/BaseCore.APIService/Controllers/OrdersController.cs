﻿using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Services;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// Order API Controller
    /// Teaching: RESTful API, Business Logic, Authentication (Bai 10, 11)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private const string DeliveryMessage = "Đơn hàng sẽ được giao đến bạn trong vòng 7 ngày, vui lòng chú ý điện thoại.";

        private static readonly Dictionary<string, (string Label, string Status, string Note, string CodePrefix)> PaymentOptions = new()
        {
            ["momo"] = ("Ví MoMo", "Paid", "Đã ghi nhận thanh toán qua ví MoMo.", "MOMO"),
            ["zalopay"] = ("Ví ZaloPay", "Paid", "Đã ghi nhận thanh toán qua ví ZaloPay.", "ZALO"),
            ["bank_transfer"] = ("Chuyển khoản ngân hàng", "Paid", "Đã ghi nhận thanh toán chuyển khoản ngân hàng.", "BANK"),
            ["counter"] = ("Thanh toán tại quầy/văn phòng", "PayAtCounter", "Thanh toán trực tiếp tại quầy hoặc văn phòng khi đến nhận/xác nhận đơn.", "COUNTER")
        };

        private readonly IOrderRepositoryEF _orderRepository;
        private readonly IOrderDetailRepositoryEF _orderDetailRepository;
        private readonly IProductRepositoryEF _productRepository;
        private readonly MySqlDbContext _dbContext;
        private readonly IOrderService _orderService;

        public OrdersController(
            IOrderRepositoryEF orderRepository,
            IOrderDetailRepositoryEF orderDetailRepository,
            IProductRepositoryEF productRepository,
            MySqlDbContext dbContext,
            IOrderService orderService)
        {
            _orderRepository = orderRepository;
            _orderDetailRepository = orderDetailRepository;
            _productRepository = productRepository;
            _dbContext = dbContext;
            _orderService = orderService;
        }

        /// <summary>
        /// Get orders for current user
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMyOrders()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var orders = await _orderRepository.GetByUserAsync(userId);
            return Ok(orders.Select(ToOrderResponse));
        }

        /// <summary>
        /// Get all orders (Admin only)
        /// </summary>
[HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllOrders(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? keyword = null,
            [FromQuery] string? status = null)
        {
            // Thêm Include(o => o.User) để lấy thông tin khách hàng
            var query = _dbContext.Orders
                .Include(o => o.User)
                .AsNoTracking()
                .AsQueryable();
            if (fromDate.HasValue) query = query.Where(o => o.OrderDate >= fromDate.Value.Date);
            if (toDate.HasValue) query = query.Where(o => o.OrderDate <= toDate.Value.Date.AddDays(1));
            if (!string.IsNullOrEmpty(keyword)) query = query.Where(o => o.Id.ToString().Contains(keyword));
            if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);
            var orders = await query.OrderByDescending(o => o.OrderDate).ToListAsync();
            return Ok(orders.Select(ToOrderResponse));
        }

        /// <summary>
        /// Get order by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            // Sử dụng DbContext để Include(Product) đảm bảo có dữ liệu sản phẩm
            var details = await _dbContext.OrderDetails
                .Include(d => d.Product)
                .Where(d => d.OrderId == id)
                .ToListAsync();

            return Ok(new
            {
                order = ToOrderResponse(order),
                details = details.Select(ToOrderDetailResponse)
            });
        }

        /// <summary>
        /// Create new order
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var userExists = await _dbContext.Users.AnyAsync(user => user.Id == userId);
            if (!userExists)
                return Unauthorized(new { message = "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại." });

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "Giỏ hàng đang trống" });

            if (dto.Items.Any(item => item.ProductId <= 0 || item.Quantity <= 0))
                return BadRequest(new { message = "Dữ liệu sản phẩm trong đơn hàng không hợp lệ" });

            var paymentMethod = string.IsNullOrWhiteSpace(dto.PaymentMethod)
                ? "counter"
                : dto.PaymentMethod.Trim().ToLowerInvariant();

            if (!PaymentOptions.TryGetValue(paymentMethod, out var paymentOption))
                return BadRequest(new { message = "Phương thức thanh toán không hợp lệ" });

            decimal originalAmount = 0;
            var orderDetails = new List<OrderDetail>();

            await using var transaction = await _dbContext.Database.BeginTransactionAsync();

            try
            {
                foreach (var item in dto.Items)
                {
                    var product = await _productRepository.GetByIdAsync(item.ProductId);
                    if (product == null)
                        return BadRequest(new { message = $"Sản phẩm {item.ProductId} không còn tồn tại" });

                    if (product.Stock < item.Quantity)
                        return BadRequest(new { message = $"Sản phẩm {product.Name} không đủ tồn kho" });

                    originalAmount += product.Price * item.Quantity;
                    orderDetails.Add(new OrderDetail
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = product.Price
                    });

                    product.Stock -= item.Quantity;
                    await _productRepository.UpdateAsync(product);
                }

                var discount = await CalculateCustomerDiscountAsync(userId, originalAmount);

                var order = new Order
                {
                    UserId = userId,
                    OrderDate = DateTime.Now,
                    OriginalAmount = originalAmount,
                    DiscountPercent = discount.Percent,
                    DiscountAmount = discount.Amount,
                    PromotionName = discount.PromotionName,
                    TotalAmount = originalAmount - discount.Amount,
                    Status = "Pending",
                    ShippingAddress = dto.ShippingAddress ?? "",
                    PaymentMethod = paymentMethod,
                    PaymentStatus = paymentOption.Status,
                    PaymentCode = GeneratePaymentCode(paymentOption.CodePrefix),
                    PaymentNote = paymentOption.Note
                };

                await _orderRepository.AddAsync(order);

                foreach (var detail in orderDetails)
                {
                    detail.OrderId = order.Id;
                    await _orderDetailRepository.AddAsync(detail);
                }

                await transaction.CommitAsync();

                var successMessage = IsPaidPayment(order.PaymentStatus)
                    ? "Đã thanh toán và đặt hàng thành công. " + DeliveryMessage
                    : "Đặt hàng thành công. Vui lòng hoàn tất thanh toán để đơn hàng được xử lý.";

                return CreatedAtAction(nameof(GetById), new { id = order.Id }, new
                {
                    message = successMessage,
                    order = ToOrderResponse(order),
                    details = orderDetails.Select(ToOrderDetailResponse)
                });
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Không tạo được đơn hàng. Vui lòng kiểm tra lại tài khoản, sản phẩm và dữ liệu tồn kho." });
            }
        }

        /// <summary>
        /// Update order status
        /// </summary>
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            var nextStatus = dto.Status?.Trim();
            if (string.IsNullOrWhiteSpace(nextStatus))
                return BadRequest(new { message = "Trạng thái đơn hàng không hợp lệ" });

            if (string.Equals(nextStatus, "Completed", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Chỉ được hoàn thành đơn hàng khi trạng thái giao hàng là đã giao thành công." });

            var allowedStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Pending",
                "Processing",
                "Cancelled"
            };

            if (!allowedStatuses.Contains(nextStatus))
                return BadRequest(new { message = "Trạng thái đơn hàng không hợp lệ" });

            if (string.Equals(order.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Không thể đổi trạng thái đơn hàng đã hoàn thành." });

            order.Status = nextStatus;
            await _orderRepository.UpdateAsync(order);

            return Ok(ToOrderResponse(order));
        }

        /// <summary>
        /// Cancel order
        /// </summary>
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelOrder(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            if (order.Status == "Completed")
                return BadRequest(new { message = "Không thể hủy đơn hàng đã hoàn thành" });

            var details = await _orderDetailRepository.GetByOrderAsync(id);
            foreach (var detail in details)
            {
                var product = await _productRepository.GetByIdAsync(detail.ProductId);
                if (product != null)
                {
                    product.Stock += detail.Quantity;
                    await _productRepository.UpdateAsync(product);
                }
            }

            order.Status = "Cancelled";
            await _orderRepository.UpdateAsync(order);

            return Ok(new { message = "Đã hủy đơn hàng", order = ToOrderResponse(order) });
        }

        /// <summary>
        /// Assign transport unit to order (Admin)
        /// </summary>
        [HttpPost("{id}/assign-transport")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AssignTransport(int id, [FromBody] AssignTransportDto dto)
        {
            try
            {
                await _orderService.AssignTransportAsync(id, dto.TransportUnit, dto.TrackingCode);
                var order = await _orderRepository.GetByIdAsync(id);
                return Ok(new { message = "Đã giao cho đơn vị vận chuyển", order = ToOrderResponse(order) });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = GetExceptionMessage(ex) });
            }
        }

        /// <summary>
        /// Update delivery status (Admin)
        /// </summary>
        [HttpPut("{id}/update-delivery")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateDeliveryStatus(int id, [FromBody] UpdateDeliveryDto dto)
        {
            try
            {
                await _orderService.UpdateDeliveryStatusAsync(id, dto.DeliveryStatus, dto.DeliveryDate);
                var order = await _orderRepository.GetByIdAsync(id);
                return Ok(new { message = "Đã cập nhật trạng thái giao hàng", order = ToOrderResponse(order) });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = GetExceptionMessage(ex) });
            }
        }

        private static string GetExceptionMessage(Exception ex)
        {
            return ex.InnerException?.Message ?? ex.Message;
        }

        private static object ToOrderResponse(Order order)
        {
            return new
            {
                order.Id,
                order.UserId,
                user = order.User == null ? null : new { name = order.User.Name },
                order.OrderDate,
                order.OriginalAmount,
                order.DiscountAmount,
                order.DiscountPercent,
                order.PromotionName,
                order.TotalAmount,
                order.Status,
                order.ShippingAddress,
                order.PaymentMethod,
                PaymentMethodLabel = GetPaymentMethodLabel(order.PaymentMethod),
                order.PaymentStatus,
                PaymentStatusLabel = GetPaymentStatusLabel(order.PaymentStatus),
                order.PaymentCode,
                order.PaymentNote,
                order.TransportUnit,
                DeliveryStatus = NormalizeDeliveryStatus(order.DeliveryStatus),
                order.DeliveryDate,
                order.TransportTrackingCode,
                DeliveryMessage = IsPaidPayment(order.PaymentStatus) ? DeliveryMessage : null
            };
        }

        private static bool IsPaidPayment(string paymentStatus)
        {
            return string.Equals(paymentStatus, "Paid", StringComparison.OrdinalIgnoreCase);
        }

        private async Task<CustomerDiscount> CalculateCustomerDiscountAsync(string userId, decimal originalAmount)
        {
            var completedOrders = await _dbContext.Orders
                .Where(order => order.UserId == userId && order.Status == "Completed")
                .Select(order => new { order.TotalAmount })
                .ToListAsync();

            var completedOrderCount = completedOrders.Count;
            var totalSpent = completedOrders.Sum(order => order.TotalAmount);
            var segment = CalculateCustomerSegment(completedOrderCount, totalSpent);
            var percent = GetDiscountPercent(segment);
            var amount = Math.Round(originalAmount * percent / 100, 0, MidpointRounding.AwayFromZero);

            return new CustomerDiscount
            {
                Percent = percent,
                Amount = amount,
                PromotionName = percent > 0 ? $"{segment} customer discount" : ""
            };
        }

        private static string CalculateCustomerSegment(int completedOrders, decimal totalSpent)
        {
            if (completedOrders >= 5 || totalSpent >= 50000000) return "VIP";
            if (completedOrders >= 3 || totalSpent >= 20000000) return "Loyal";
            if (completedOrders >= 2 || totalSpent >= 10000000) return "Potential";
            if (completedOrders == 1) return "New";
            return "NoOrders";
        }

        private static decimal GetDiscountPercent(string segment)
        {
            return segment switch
            {
                "VIP" => 10,
                "Loyal" => 7,
                "Potential" => 5,
                "New" => 3,
                _ => 0
            };
        }

        private static string GetPaymentMethodLabel(string paymentMethod)
        {
            return PaymentOptions.TryGetValue(paymentMethod ?? "", out var option)
                ? option.Label
                : "Chưa xác định";
        }

        private static string GetPaymentStatusLabel(string paymentStatus)
        {
            return (paymentStatus ?? "").ToLowerInvariant() switch
            {
                "pending" => "Chưa thanh toán",
                "paid" => "Đã thanh toán",
                "payatcounter" => "Thanh toán tại quầy",
                _ => "Chưa xác định"
            };
        }

        private static string GeneratePaymentCode(string prefix)
        {
            var suffix = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant();
            return $"{prefix}-{DateTime.Now:yyyyMMdd}-{suffix}";
        }

        private static string NormalizeDeliveryStatus(string? deliveryStatus)
        {
            var normalized = deliveryStatus?.Trim();
            if (string.IsNullOrEmpty(normalized))
                return "Chờ lấy hàng";

            return normalized switch
            {
                "Chá» láº¥y hÃ ng" => "Chờ lấy hàng",
                "ÄÃ£ giao Ä‘Æ¡n vá»‹ váº­n chuyá»ƒn" => "Đã giao đơn vị vận chuyển",
                "Äang giao" => "Đang giao",
                "ÄÃ£ giao thÃ nh cÃ´ng" => "Đã giao thành công",
                "Giao tháº¥t báº¡i" => "Giao thất bại",
                _ => normalized
            };
        }

        private static object ToOrderDetailResponse(OrderDetail detail)
        {
            return new
            {
                detail.Id,
                detail.OrderId,
                detail.ProductId,
                detail.Quantity,
                detail.UnitPrice,
                product = detail.Product == null
                    ? null
                    : new
                    {
                        detail.Product.Id,
                        detail.Product.Name,
                        detail.Product.Price,
                        detail.Product.ImageUrl,
                        detail.Product.Description,
                        detail.Product.CategoryId
                    }
            };
        }
    }

    public class CreateOrderDto
    {
        public List<OrderItemDto> Items { get; set; } = new();
        public string? ShippingAddress { get; set; }
        public string? PaymentMethod { get; set; }
    }

    public class OrderItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = "";
    }

    public class AssignTransportDto
    {
        public string TransportUnit { get; set; } = "";
        public string TrackingCode { get; set; } = "";
    }

    public class UpdateDeliveryDto
    {
        public string DeliveryStatus { get; set; } = "";
        public DateTime? DeliveryDate { get; set; }
    }

    public class CustomerDiscount
    {
        public decimal Percent { get; set; }
        public decimal Amount { get; set; }
        public string PromotionName { get; set; } = "";
    }
}
