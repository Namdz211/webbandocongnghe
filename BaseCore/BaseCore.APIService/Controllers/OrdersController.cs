using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
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
        private const string PendingStatus = "Pending";
        private const string ConfirmedStatus = "Confirmed";
        private const string ShippingStatus = "Shipping";
        private const string CompletedStatus = "Completed";
        private const string CancelledStatus = "Cancelled";
        private const string DeliveryMessage = "Đơn hàng đang trên đường giao đến bạn, vui lòng chú ý điện thoại.";

        private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            PendingStatus,
            ConfirmedStatus,
            ShippingStatus,
            CompletedStatus,
            CancelledStatus
        };

        private static readonly Dictionary<string, (string Label, string Status, string Note, string CodePrefix)> PaymentOptions = new()
        {
            ["cod"] = ("Thanh toán khi nhận hàng (COD)", "Unpaid", "Thanh toán khi nhận hàng.", "COD"),
            ["bank_transfer"] = ("Chuyển khoản ngân hàng", "Paid", "Đã ghi nhận thanh toán chuyển khoản ngân hàng.", "BANK"),
            ["e_wallet"] = ("Ví điện tử", "Paid", "Đã ghi nhận thanh toán qua ví điện tử.", "EWALLET"),
            ["momo"] = ("Ví điện tử", "Paid", "Đã ghi nhận thanh toán qua ví điện tử.", "EWALLET"),
            ["zalopay"] = ("Ví điện tử", "Paid", "Đã ghi nhận thanh toán qua ví điện tử.", "EWALLET"),
            ["counter"] = ("Thanh toán khi nhận hàng (COD)", "Unpaid", "Thanh toán khi nhận hàng.", "COD")
        };

        private readonly IOrderRepositoryEF _orderRepository;
        private readonly IOrderDetailRepositoryEF _orderDetailRepository;
        private readonly IProductRepositoryEF _productRepository;
        private readonly MySqlDbContext _dbContext;

        public OrdersController(
            IOrderRepositoryEF orderRepository,
            IOrderDetailRepositoryEF orderDetailRepository,
            IProductRepositoryEF productRepository,
            MySqlDbContext dbContext)
        {
            _orderRepository = orderRepository;
            _orderDetailRepository = orderDetailRepository;
            _productRepository = productRepository;
            _dbContext = dbContext;
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
        public async Task<IActionResult> GetAllOrders()
        {
            var orders = await _orderRepository.GetAllAsync();
            return Ok(orders.OrderByDescending(order => order.OrderDate).Select(ToOrderResponse));
        }

        /// <summary>
        /// Get order by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });
            if (!CanAccessOrder(order)) return Forbid();

            var details = await _orderDetailRepository.GetByOrderAsync(id);
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
                ? "cod"
                : dto.PaymentMethod.Trim().ToLowerInvariant();

            if (!PaymentOptions.TryGetValue(paymentMethod, out var paymentOption))
                return BadRequest(new { message = "Phương thức thanh toán không hợp lệ" });

            decimal totalAmount = 0;
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

                    totalAmount += product.Price * item.Quantity;
                    orderDetails.Add(new OrderDetail
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = product.Price
                    });

                    product.Stock -= item.Quantity;
                    await _productRepository.UpdateAsync(product);
                }

                var order = new Order
                {
                    UserId = userId,
                    OrderDate = DateTime.Now,
                    TotalAmount = totalAmount,
                    Status = PendingStatus,
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
                    ? "Đã thanh toán và đặt hàng thành công. Admin sẽ xác nhận đơn hàng trước khi bàn giao vận chuyển."
                    : "Đặt hàng thành công. Admin sẽ xác nhận đơn hàng trước khi bàn giao vận chuyển.";

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
            if (!ValidStatuses.Contains(dto.Status))
                return BadRequest(new { message = "Trạng thái đơn hàng không hợp lệ" });

            order.Status = dto.Status;
            await _orderRepository.UpdateAsync(order);

            return Ok(ToOrderResponse(order));
        }

        /// <summary>
        /// Admin confirms the order has been received and accepted for processing.
        /// </summary>
        [HttpPut("{id}/admin/confirm")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ConfirmOrder(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            if (!string.Equals(order.Status, PendingStatus, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Chỉ đơn hàng đang chờ xử lý mới được admin xác nhận" });

            order.Status = ConfirmedStatus;
            await _orderRepository.UpdateAsync(order);

            return Ok(new
            {
                message = "Admin đã xác nhận đơn hàng.",
                order = ToOrderResponse(order)
            });
        }

        /// <summary>
        /// Admin hands the order over to the shipping provider.
        /// </summary>
        [HttpPut("{id}/admin/ship")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ShipOrder(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            if (!string.Equals(order.Status, ConfirmedStatus, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Admin cần xác nhận đơn hàng trước khi bàn giao vận chuyển" });

            order.Status = ShippingStatus;
            await _orderRepository.UpdateAsync(order);

            return Ok(new
            {
                message = DeliveryMessage,
                order = ToOrderResponse(order)
            });
        }

        /// <summary>
        /// Customer confirms the order was received.
        /// </summary>
        [HttpPut("{id}/received")]
        public async Task<IActionResult> ConfirmReceived(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });
            if (!string.Equals(order.UserId, userId, StringComparison.Ordinal)) return Forbid();

            if (!string.Equals(order.Status, ShippingStatus, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Chỉ xác nhận đã nhận hàng khi đơn đang được giao" });

            order.Status = CompletedStatus;

            if (string.Equals(order.PaymentMethod, "cod", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(order.PaymentMethod, "counter", StringComparison.OrdinalIgnoreCase))
            {
                order.PaymentStatus = "Paid";
                order.PaymentNote = "Khách hàng đã thanh toán COD khi nhận hàng.";
            }

            await _orderRepository.UpdateAsync(order);

            return Ok(new
            {
                message = "Cảm ơn bạn đã xác nhận nhận hàng.",
                order = ToOrderResponse(order)
            });
        }

        /// <summary>
        /// Cancel order
        /// </summary>
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelOrder(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });
            if (!CanAccessOrder(order)) return Forbid();

            if (!string.Equals(order.Status, PendingStatus, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Chỉ có thể hủy đơn hàng đang chờ admin xác nhận" });

            await using var transaction = await _dbContext.Database.BeginTransactionAsync();

            try
            {
                var updatedRows = await _dbContext.Orders
                    .Where(currentOrder => currentOrder.Id == id && currentOrder.Status == PendingStatus)
                    .ExecuteUpdateAsync(setters => setters.SetProperty(
                        currentOrder => currentOrder.Status,
                        CancelledStatus));

                if (updatedRows == 0)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = "Chỉ có thể hủy đơn hàng đang chờ admin xác nhận" });
                }

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

                await transaction.CommitAsync();

                order.Status = CancelledStatus;
                return Ok(new { message = "Đã hủy đơn hàng", order = ToOrderResponse(order) });
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Không hủy được đơn hàng. Vui lòng thử lại." });
            }
        }

        private static object ToOrderResponse(Order order)
        {
            return new
            {
                order.Id,
                order.UserId,
                order.OrderDate,
                order.TotalAmount,
                order.Status,
                StatusLabel = GetOrderStatusLabel(order.Status),
                order.ShippingAddress,
                order.PaymentMethod,
                PaymentMethodLabel = GetPaymentMethodLabel(order.PaymentMethod),
                order.PaymentStatus,
                PaymentStatusLabel = GetPaymentStatusLabel(order.PaymentStatus),
                order.PaymentCode,
                order.PaymentNote,
                DeliveryMessage = IsShippingStatus(order.Status) ? DeliveryMessage : null,
                CanCustomerConfirmReceived = IsShippingStatus(order.Status),
                CanCustomerCancel = IsPendingStatus(order.Status)
            };
        }

        private static bool IsPaidPayment(string paymentStatus)
        {
            return string.Equals(paymentStatus, "Paid", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsShippingStatus(string status)
        {
            return string.Equals(status, ShippingStatus, StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsPendingStatus(string status)
        {
            return string.Equals(status, PendingStatus, StringComparison.OrdinalIgnoreCase);
        }

        private static string GetPaymentMethodLabel(string paymentMethod)
        {
            var key = (paymentMethod ?? "").Trim().ToLowerInvariant();
            return PaymentOptions.TryGetValue(key, out var option)
                ? option.Label
                : "Chưa xác định";
        }

        private static string GetOrderStatusLabel(string status)
        {
            return (status ?? "").ToLowerInvariant() switch
            {
                "pending" => "Chờ xác nhận",
                "confirmed" => "Admin đã xác nhận",
                "shipping" => "Đang giao hàng",
                "completed" => "Khách đã nhận hàng",
                "cancelled" => "Đã hủy",
                _ => "Chưa xác định"
            };
        }

        private static string GetPaymentStatusLabel(string paymentStatus)
        {
            return (paymentStatus ?? "").ToLowerInvariant() switch
            {
                "pending" => "Chưa thanh toán",
                "unpaid" => "Chưa thanh toán",
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

        private bool CanAccessOrder(Order order)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return User.IsInRole("Admin") ||
                (!string.IsNullOrEmpty(userId) && string.Equals(order.UserId, userId, StringComparison.Ordinal));
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
                        detail.Product.Manufacturer,
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
}
