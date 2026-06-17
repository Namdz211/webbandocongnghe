using Microsoft.AspNetCore.Authorization;
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
    /// API Controller quản lý Đơn hàng (Orders)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepositoryEF _orderRepository;
        private readonly IOrderDetailRepositoryEF _orderDetailRepository;
        private readonly IProductRepositoryEF _productRepository;
        private readonly BaseCore.Repository.Authen.IUserRepository _userRepository;
        private readonly ICouponRepository _couponRepository;
        private readonly IOrderService _orderService;

        // Định nghĩa các trạng thái của Đơn hàng làm chuẩn trong hệ thống
        private const string PendingStatus = "Pending";     // Đang chờ xác nhận
        private const string ConfirmedStatus = "Confirmed"; // Đã xác nhận đơn hàng
        private const string ShippingStatus = "Shipping";   // Đang giao hàng
        private const string CompletedStatus = "Completed"; // Giao hàng thành công (Hoàn thành)
        private const string CancelledStatus = "Cancelled"; // Đã hủy đơn hàng

        // Thông báo bàn giao vận chuyển
        private const string DeliveryMessage = "Đơn hàng đã được bàn giao cho đơn vị vận chuyển.";

        // Danh sách trạng thái hợp lệ để Admin cập nhật
        private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            PendingStatus, ConfirmedStatus, ShippingStatus, CompletedStatus, CancelledStatus
        };

        // Danh sách phương thức thanh toán và trạng thái mặc định của chúng
        private static readonly Dictionary<string, (string Label, string Status, string CodePrefix, string Note)> PaymentOptions = 
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["cod"] = ("Thanh toán khi nhận hàng (COD)", "Pending", "COD", "Khách hàng sẽ thanh toán bằng tiền mặt khi nhận hàng."),
                ["vnpay"] = ("Thanh toán qua cổng VNPay", "Paid", "VNPAY", "Đã thanh toán trực tuyến qua cổng VNPay thành công."),
                ["momo"] = ("Thanh toán qua ví MoMo", "Paid", "MOMO", "Đã thanh toán trực tuyến qua ví MoMo thành công."),
                ["counter"] = ("Thanh toán trực tiếp tại quầy", "Paid", "CASH", "Khách hàng đã thanh toán tại quầy thu ngân.")
            };

        public OrdersController(
            IOrderRepositoryEF orderRepository,
            IOrderDetailRepositoryEF orderDetailRepository,
            IProductRepositoryEF productRepository,
            BaseCore.Repository.Authen.IUserRepository userRepository,
            ICouponRepository couponRepository,
            IOrderService orderService)
        {
            _orderRepository = orderRepository;
            _orderDetailRepository = orderDetailRepository;
            _productRepository = productRepository;
            _userRepository = userRepository;
            _couponRepository = couponRepository;
            _orderService = orderService;
        }

        /// <summary>
        /// Lấy lịch sử đơn hàng của người dùng hiện tại đang đăng nhập
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMyOrders()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var orders = await _orderRepository.GetByUserAsync(userId);
            var customer = await _userRepository.GetByIdAsync(userId);
            return Ok(orders.Select(order => ToOrderResponse(order, customer)));
        }

        /// <summary>
        /// Lấy toàn bộ đơn hàng của cửa hàng kèm bộ lọc tìm kiếm (Chỉ dành cho Admin)
        /// </summary>
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllOrders(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? keyword = null,
            [FromQuery] string? status = null)
        {
            var orders = await _orderRepository.GetAllOrdersWithUsersAsync(fromDate, toDate, keyword, status);
            return Ok(orders.Select(order => ToOrderResponse(order)));
        }

        /// <summary>
        /// Lấy chi tiết thông tin một đơn hàng và danh sách sản phẩm bên trong theo ID đơn hàng
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });
            
            // Bảo mật: Admin hoặc chính chủ đơn hàng mới được quyền xem chi tiết đơn
            if (!CanAccessOrder(order)) return Forbid();

            var customer = await _userRepository.GetByIdAsync(order.UserId);
            var details = await _orderDetailRepository.GetByOrderAsync(id);
            return Ok(new
            {
                order = ToOrderResponse(order, customer),
                details = details.Select(ToOrderDetailResponse)
            });
        }

        /// <summary>
        /// Tạo mới một đơn hàng mua sắm (yêu cầu khách đăng nhập)
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Dữ liệu đơn hàng không hợp lệ" });

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "Giỏ hàng đang trống" });

            if (dto.Items.Any(item => item.ProductId <= 0 || item.Quantity <= 0))
                return BadRequest(new { message = "Dữ liệu sản phẩm trong đơn hàng không hợp lệ" });

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Vui lòng đăng nhập để thực hiện đặt hàng." });

            var customer = await _userRepository.GetByIdAsync(userId);
            if (customer == null)
                return Unauthorized(new { message = "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại." });

            var orderUserId = userId;

            // Kiểm tra thông tin địa chỉ giao hàng
            if (string.IsNullOrWhiteSpace(dto.ShippingAddress) && string.IsNullOrWhiteSpace(customer?.Address))
                return BadRequest(new { message = "Vui lòng nhập địa chỉ giao hàng." });

            var shippingAddress = BuildShippingAddress(dto, customer);
            if (shippingAddress.Length > 500)
                return BadRequest(new { message = "Thông tin giao hàng tối đa 500 ký tự. Vui lòng rút gọn lại." });

            var paymentMethod = string.IsNullOrWhiteSpace(dto.PaymentMethod)
                ? "cod"
                : dto.PaymentMethod.Trim().ToLowerInvariant();

            if (!PaymentOptions.TryGetValue(paymentMethod, out var paymentOption))
                return BadRequest(new { message = "Phương thức thanh toán không hợp lệ" });

            decimal originalAmount = 0;
            var orderDetails = new List<OrderDetail>();

            // Bắt đầu một Transaction database để đảm bảo tính toàn vẹn (tất cả thành công hoặc cùng rollback)
            await using var transaction = await _orderRepository.BeginTransactionAsync();

            try
            {
                // 1. Kiểm tra từng sản phẩm và trừ số lượng tồn kho
                foreach (var item in dto.Items)
                {
                    var product = await _productRepository.GetByIdAsync(item.ProductId);
                    if (product == null)
                        return BadRequest(new { message = $"Sản phẩm {item.ProductId} không còn tồn tại" });

                    if (product.Stock < item.Quantity)
                        return BadRequest(new { message = $"Sản phẩm {product.Name} không đủ số lượng tồn kho" });

                    var unitPrice = item.UnitPrice.HasValue && item.UnitPrice.Value > product.Price
                        ? item.UnitPrice.Value
                        : product.Price;

                    originalAmount += unitPrice * item.Quantity;
                    orderDetails.Add(new OrderDetail
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = unitPrice
                    });

                    // Cập nhật tồn kho sản phẩm
                    product.Stock -= item.Quantity;
                    await _productRepository.UpdateAsync(product);
                }

                // 2. Tính toán chiết khấu phân hạng khách hàng và áp dụng mã giảm giá (Coupon)
                var customerDiscount = await CalculateCustomerDiscountAsync(orderUserId, originalAmount);
                var couponResult = await CalculateCouponDiscountAsync(dto.CouponCode, originalAmount);

                if (couponResult.ErrorMessage != null)
                    return BadRequest(new { message = couponResult.ErrorMessage });

                // Tổng số tiền giảm giá không vượt quá giá trị ban đầu của giỏ hàng
                var discountAmount = Math.Min(
                    originalAmount,
                    customerDiscount.Amount + couponResult.Discount.Amount);
                
                var promotionNames = new[]
                    {
                        customerDiscount.PromotionName,
                        couponResult.Discount.PromotionName
                    }
                    .Where(name => !string.IsNullOrWhiteSpace(name));

                // 3. Khởi tạo thực thể Order mới
                var order = new Order
                {
                    UserId = orderUserId,
                    OrderDate = DateTime.Now,
                    OriginalAmount = originalAmount,
                    DiscountPercent = customerDiscount.Percent + couponResult.Discount.Percent,
                    DiscountAmount = discountAmount,
                    PromotionName = string.Join(" + ", promotionNames),
                    TotalAmount = originalAmount - discountAmount,
                    Status = PendingStatus,
                    ShippingAddress = shippingAddress,
                    PaymentMethod = paymentMethod,
                    PaymentStatus = paymentOption.Status,
                    PaymentCode = GeneratePaymentCode(paymentOption.CodePrefix),
                    PaymentNote = paymentOption.Note
                };

                await _orderRepository.AddAsync(order);

                // 4. Lưu danh sách chi tiết đơn hàng
                foreach (var detail in orderDetails)
                {
                    detail.OrderId = order.Id;
                    await _orderDetailRepository.AddAsync(detail);
                }

                // 5. Cập nhật số lượt đã sử dụng của coupon trong DB
                if (couponResult.Coupon != null)
                {
                    var couponUsed = await MarkCouponAsUsedAsync(couponResult.Coupon.Id);
                    if (!couponUsed)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = "Mã giảm giá không còn khả dụng." });
                    }
                }

                // Commit Transaction lưu trữ dữ liệu chính thức
                await transaction.CommitAsync();

                var successMessage = IsPaidPayment(order.PaymentStatus)
                    ? "Đã thanh toán và đặt hàng thành công. Admin sẽ xác nhận đơn hàng trước khi bàn giao vận chuyển."
                    : "Đặt hàng thành công. Admin sẽ xác nhận đơn hàng trước khi bàn giao vận chuyển.";

                return CreatedAtAction(nameof(GetById), new { id = order.Id }, new
                {
                    message = successMessage,
                    order = ToOrderResponse(order, customer),
                    details = orderDetails.Select(ToOrderDetailResponse)
                });
            }
            catch (DbUpdateException)
            {
                // Rollback lại dữ liệu tồn kho và giỏ hàng nếu ghi DB xảy ra lỗi
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Không tạo được đơn hàng. Vui lòng kiểm tra lại tài khoản, sản phẩm và dữ liệu tồn kho." });
            }
        }

        /// <summary>
        /// Cập nhật nhanh trạng thái đơn hàng (Yêu cầu tài khoản Admin)
        /// </summary>
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });
            if (!ValidStatuses.Contains(dto.Status))
                return BadRequest(new { message = "Trạng thái đơn hàng không hợp lệ" });
            var nextStatus = dto.Status?.Trim();
            if (string.IsNullOrWhiteSpace(nextStatus))
                return BadRequest(new { message = "Trạng thái đơn hàng không hợp lệ" });

            // Không cho phép sửa đổi trạng thái đối với các đơn hàng đã Completed
            if (string.Equals(order.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Không thể đổi trạng thái đơn hàng đã hoàn thành." });

            order.Status = nextStatus;
            await _orderRepository.UpdateAsync(order);

            var customer = await _userRepository.GetByIdAsync(order.UserId);
            return Ok(ToOrderResponse(order, customer));
        }

        /// <summary>
        /// Admin xác nhận duyệt đơn hàng để bắt đầu đóng gói (Yêu cầu tài khoản Admin)
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
            var customer = await _userRepository.GetByIdAsync(order.UserId);

            return Ok(new
            {
                message = "Admin đã xác nhận đơn hàng.",
                order = ToOrderResponse(order, customer)
            });
        }

        /// <summary>
        /// Admin bàn giao đơn hàng cho bưu tá vận chuyển (Yêu cầu tài khoản Admin)
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
            var customer = await _userRepository.GetByIdAsync(order.UserId);

            return Ok(new
            {
                message = DeliveryMessage,
                order = ToOrderResponse(order, customer)
            });
        }

        /// <summary>
        /// Khách hàng xác nhận đã nhận được hàng thành công (Cập nhật đơn hàng thành Completed và thanh toán)
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

            // Nếu đơn hàng thanh toán COD hoặc thanh toán tại quầy, cập nhật trạng thái thanh toán thành Đã thanh toán (Paid)
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
        /// Hủy đơn hàng và hoàn lại số lượng tồn kho cho các sản phẩm trong đơn (Dành cho Admin hoặc Khách hàng khi đơn chưa được duyệt)
        /// </summary>
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelOrder(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });
            if (!CanAccessOrder(order)) return Forbid();

            if (!string.Equals(order.Status, PendingStatus, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Chỉ có thể hủy đơn hàng đang chờ admin xác nhận" });

            await using var transaction = await _orderRepository.BeginTransactionAsync();

            try
            {
                var updatedRows = await _orderRepository.CancelOrderAsync(id);

                if (updatedRows == 0)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = "Chỉ có thể hủy đơn hàng đang chờ admin xác nhận" });
                }

                // Hoàn lại số lượng sản phẩm vào kho hàng
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

        /// <summary>
        /// Chỉ định đơn vị vận chuyển và mã vận đơn cho đơn hàng (Yêu cầu tài khoản Admin)
        /// </summary>
        [HttpPost("{id}/assign-transport")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AssignTransport(int id, [FromBody] AssignTransportDto dto)
        {
            try
            {
                await _orderService.AssignTransportAsync(id, dto.TransportUnit, dto.TrackingCode);
                var order = await _orderRepository.GetByIdAsync(id);
                var customer = order == null
                    ? null
                    : await _userRepository.GetByIdAsync(order.UserId);

                return Ok(new { message = "Đã giao cho đơn vị vận chuyển", order = order == null ? null : ToOrderResponse(order, customer) });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = GetExceptionMessage(ex) });
            }
        }

        /// <summary>
        /// Cập nhật chi tiết trạng thái giao hàng từ đơn vị vận chuyển (Yêu cầu tài khoản Admin)
        /// </summary>
        [HttpPut("{id}/update-delivery")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateDeliveryStatus(int id, [FromBody] UpdateDeliveryDto dto)
        {
            try
            {
                await _orderService.UpdateDeliveryStatusAsync(id, dto.DeliveryStatus, dto.DeliveryDate);
                var order = await _orderRepository.GetByIdAsync(id);
                var customer = order == null
                    ? null
                    : await _userRepository.GetByIdAsync(order.UserId);

                return Ok(new { message = "Đã cập nhật trạng thái giao hàng", order = order == null ? null : ToOrderResponse(order, customer) });
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

        /// <summary>
        /// Định dạng thông tin đơn hàng trả về phía Frontend
        /// </summary>
        private static object ToOrderResponse(Order order, User? customer = null)
        {
            var resolvedCustomer = customer ?? order.User;

            return new
            {
                order.Id,
                order.UserId,
                user = resolvedCustomer == null ? null : new { name = resolvedCustomer.Name },
                CustomerName = resolvedCustomer?.Name,
                CustomerUserName = resolvedCustomer?.UserName,
                CustomerEmail = resolvedCustomer?.Email,
                CustomerPhone = resolvedCustomer?.Phone,
                order.OrderDate,
                order.OriginalAmount,
                order.DiscountAmount,
                order.DiscountPercent,
                order.PromotionName,
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
                order.TransportUnit,
                DeliveryStatus = NormalizeDeliveryStatus(order.DeliveryStatus),
                order.DeliveryDate,
                order.TransportTrackingCode,
                DeliveryMessage = IsShippingStatus(order.Status) ? DeliveryMessage : null,
                CanCustomerConfirmReceived = IsShippingStatus(order.Status),
                CanCustomerCancel = IsPendingStatus(order.Status)
            };
        }

        private static bool IsPaidPayment(string paymentStatus)
        {
            return string.Equals(paymentStatus, "Paid", StringComparison.OrdinalIgnoreCase);
        }



        /// <summary>
        /// Xây dựng chuỗi địa chỉ nhận hàng hoàn chỉnh từ thông tin người nhận
        /// </summary>
        private static string BuildShippingAddress(CreateOrderDto dto, User? customer)
        {
            var customerName = NormalizeText(dto.CustomerName);
            var customerEmail = NormalizeText(dto.CustomerEmail);
            var customerPhone = NormalizeText(dto.CustomerPhone);
            var address = NormalizeText(dto.ShippingAddress);

            if (string.IsNullOrWhiteSpace(address))
                address = NormalizeText(customer?.Address);

            if (string.IsNullOrWhiteSpace(customerName))
                customerName = NormalizeText(customer?.Name ?? customer?.UserName);

            if (string.IsNullOrWhiteSpace(customerEmail))
                customerEmail = NormalizeText(customer?.Email);

            if (string.IsNullOrWhiteSpace(customerPhone))
                customerPhone = NormalizeText(customer?.Phone);

            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(customerName)) parts.Add($"Người nhận: {customerName}");
            if (!string.IsNullOrWhiteSpace(customerPhone)) parts.Add($"SĐT: {customerPhone}");
            if (!string.IsNullOrWhiteSpace(customerEmail)) parts.Add($"Email: {customerEmail}");
            if (!string.IsNullOrWhiteSpace(address)) parts.Add($"Địa chỉ: {address}");

            return string.Join(" | ", parts);
        }

        private static string NormalizeText(string? value)
        {
            return value?.Trim() ?? "";
        }

        /// <summary>
        /// Tính toán phần trăm chiết khấu trực tiếp theo phân hạng khách hàng (VIP/Loyal/Potential/New)
        /// </summary>
        private async Task<CustomerDiscount> CalculateCustomerDiscountAsync(string userId, decimal originalAmount)
        {
            var completedOrders = await _orderRepository.GetCompletedOrdersByUserIdAsync(userId);

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

        /// <summary>
        /// Tính toán giá trị giảm giá của Coupon/Mã giảm giá được áp dụng
        /// </summary>
        private async Task<CouponDiscountResult> CalculateCouponDiscountAsync(string? couponCode, decimal originalAmount)
        {
            var code = NormalizeText(couponCode).ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(code))
                return new CouponDiscountResult();

            var coupon = await _couponRepository.GetByCodeAsync(code);

            if (coupon == null)
                return CouponDiscountResult.Failed("Mã giảm giá không tồn tại");

            if (!coupon.IsActive)
                return CouponDiscountResult.Failed("Mã giảm giá đã bị vô hiệu hóa");

            if (DateTime.UtcNow < coupon.StartDate)
                return CouponDiscountResult.Failed("Mã giảm giá chưa đến thời gian sử dụng");

            if (DateTime.UtcNow > coupon.ExpiryDate)
                return CouponDiscountResult.Failed("Mã giảm giá đã hết hạn");

            if (coupon.UsageLimit > 0 && coupon.UsedCount >= coupon.UsageLimit)
                return CouponDiscountResult.Failed("Mã giảm giá đã hết lượt sử dụng");

            if (originalAmount < coupon.MinOrderAmount)
                return CouponDiscountResult.Failed($"Đơn hàng tối thiểu {coupon.MinOrderAmount:N0}đ mới được dùng mã này");

            decimal discountAmount;
            var discountPercent = 0m;

            if (coupon.DiscountType == "percent")
            {
                discountPercent = coupon.DiscountValue;
                discountAmount = Math.Round(
                    originalAmount * coupon.DiscountValue / 100,
                    0,
                    MidpointRounding.AwayFromZero);

                if (coupon.MaxDiscountAmount > 0)
                    discountAmount = Math.Min(discountAmount, coupon.MaxDiscountAmount);
            }
            else
            {
                discountAmount = coupon.DiscountValue;
            }

            discountAmount = Math.Min(Math.Max(discountAmount, 0), originalAmount);

            return new CouponDiscountResult
            {
                Coupon = coupon,
                Discount = new CustomerDiscount
                {
                    Percent = discountPercent,
                    Amount = discountAmount,
                    PromotionName = $"Coupon {coupon.Code}"
                }
            };
        }

        private async Task<bool> MarkCouponAsUsedAsync(int couponId)
        {
            return await _couponRepository.UseCouponAsync(couponId);
        }

        /// <summary>
        /// Phân hạng khách hàng dựa trên số lượng đơn hàng và số tiền tích lũy từ các đơn hàng hoàn thành
        /// </summary>
        private static string CalculateCustomerSegment(int completedOrders, decimal totalSpent)
        {
            if (completedOrders >= 5 || totalSpent >= 50000000) return "VIP";
            if (completedOrders >= 3 || totalSpent >= 20000000) return "Loyal";
            if (completedOrders >= 2 || totalSpent >= 10000000) return "Potential";
            if (completedOrders == 1) return "New";
            return "NoOrders";
        }

        /// <summary>
        /// Lấy phần trăm chiết khấu trực tiếp theo phân hạng
        /// </summary>
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

        private static string NormalizeDeliveryStatus(string? deliveryStatus)
        {
            var normalized = deliveryStatus?.Trim();
            if (string.IsNullOrEmpty(normalized))
                return "Chờ lấy hàng";

            return normalized switch
            {
                "Chờ lấy hàng " => "Chờ lấy hàng",
                "Đã giao đơn vị vận chuyển " => "Đã giao đơn vị vận chuyển",
                "Đang giao" => "Đang giao",
                "Đã giao thành công" => "Đã giao thành công",
                "Giao thất bại" => "Giao thất bại",
                _ => normalized
            };
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

    // DTOs nhận dữ liệu
    public class CreateOrderDto
    {
        public List<OrderItemDto> Items { get; set; } = new();
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        public string? ShippingAddress { get; set; }
        public string? PaymentMethod { get; set; }
        public string? CouponCode { get; set; }
    }

    public class OrderItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
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

    public class CouponDiscountResult
    {
        public CustomerDiscount Discount { get; set; } = new();
        public Coupon? Coupon { get; set; }
        public string? ErrorMessage { get; set; }

        public static CouponDiscountResult Failed(string message)
        {
            return new CouponDiscountResult { ErrorMessage = message };
        }
    }
}
