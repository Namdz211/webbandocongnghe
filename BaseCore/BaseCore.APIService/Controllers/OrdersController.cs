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
                ? "counter"
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
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });

            order.Status = dto.Status;
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

        private static object ToOrderResponse(Order order)
        {
            return new
            {
                order.Id,
                order.UserId,
                order.OrderDate,
                order.TotalAmount,
                order.Status,
                order.ShippingAddress,
                order.PaymentMethod,
                PaymentMethodLabel = GetPaymentMethodLabel(order.PaymentMethod),
                order.PaymentStatus,
                PaymentStatusLabel = GetPaymentStatusLabel(order.PaymentStatus),
                order.PaymentCode,
                order.PaymentNote,
                DeliveryMessage = IsPaidPayment(order.PaymentStatus) ? DeliveryMessage : null
            };
        }

        private static bool IsPaidPayment(string paymentStatus)
        {
            return string.Equals(paymentStatus, "Paid", StringComparison.OrdinalIgnoreCase);
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
}
