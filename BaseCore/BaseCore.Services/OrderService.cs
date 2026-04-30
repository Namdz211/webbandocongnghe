using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Services
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepositoryEF _orderRepository;
        private readonly IOrderDetailRepositoryEF _orderDetailRepository;

        public OrderService(
            IOrderRepositoryEF orderRepository,
            IOrderDetailRepositoryEF orderDetailRepository)
        {
            _orderRepository = orderRepository;
            _orderDetailRepository = orderDetailRepository;
        }

        public async Task<Order> CreateOrderAsync(Order order)
        {
            order.OrderDate = DateTime.UtcNow;
            order.Status = string.IsNullOrWhiteSpace(order.Status) ? "Pending" : order.Status;
            order.DeliveryStatus = NormalizeDeliveryStatus(order.DeliveryStatus);
            return await _orderRepository.AddAsync(order);
        }

        public async Task<List<Order>> GetOrdersByUserIdAsync(string userId)
        {
            var orders = await _orderRepository.GetByUserAsync(userId);
            foreach (var order in orders)
            {
                order.OrderDetails = await _orderDetailRepository.GetByOrderAsync(order.Id);
            }

            return orders;
        }

        public async Task<Order?> GetOrderByIdAsync(int id)
        {
            var order = await _orderRepository.GetWithDetailsAsync(id);
            if (order == null)
            {
                return null;
            }

            order.OrderDetails = await _orderDetailRepository.GetByOrderAsync(order.Id);
            return order;
        }

        public async Task AssignTransportAsync(int orderId, string transportUnit, string trackingCode)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null) throw new Exception("Order not found");

            var normalizedTransportUnit = transportUnit?.Trim() ?? "";
            var normalizedTrackingCode = trackingCode?.Trim() ?? "";

            if (string.IsNullOrWhiteSpace(transportUnit))
                throw new Exception("Vui lòng chọn đơn vị vận chuyển");
            if (string.IsNullOrWhiteSpace(trackingCode))
                throw new Exception("Vui lòng nhập mã vận đơn");
            if (normalizedTransportUnit.Length > 100)
                throw new Exception("Đơn vị vận chuyển không được vượt quá 100 ký tự");
            if (normalizedTrackingCode.Length > 100)
                throw new Exception("Mã vận đơn không được vượt quá 100 ký tự");
            if (string.Equals(order.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                throw new Exception("Không thể bàn giao vận chuyển cho đơn hàng đã hoàn thành");
            if (string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
                throw new Exception("Không thể bàn giao vận chuyển cho đơn hàng đã hủy");

            order.TransportUnit = normalizedTransportUnit;
            order.TransportTrackingCode = normalizedTrackingCode;
            order.DeliveryStatus = "Đã giao đơn vị vận chuyển";
            order.Status = "Processing";

            await _orderRepository.UpdateAsync(order);
        }

        public async Task UpdateDeliveryStatusAsync(int orderId, string deliveryStatus, DateTime? deliveryDate = null)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null) throw new Exception("Order not found");

            var nextDeliveryStatus = NormalizeDeliveryStatus(deliveryStatus);
            if (RequiresTransport(nextDeliveryStatus) &&
                (string.IsNullOrWhiteSpace(order.TransportUnit) || string.IsNullOrWhiteSpace(order.TransportTrackingCode)))
            {
                throw new Exception("Vui lòng bàn giao đơn cho đơn vị vận chuyển trước khi cập nhật trạng thái giao hàng");
            }

            order.DeliveryStatus = nextDeliveryStatus;
            if (deliveryDate.HasValue)
                order.DeliveryDate = deliveryDate.Value;

            if (IsDelivered(order.DeliveryStatus))
            {
                order.Status = "Completed";
            }
            else if (string.Equals(order.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            {
                order.Status = "Processing";
            }

            await _orderRepository.UpdateAsync(order);
        }

        private static bool IsDelivered(string? deliveryStatus)
        {
            return string.Equals(deliveryStatus, "Đã giao thành công", StringComparison.OrdinalIgnoreCase);
        }

        private static bool RequiresTransport(string? deliveryStatus)
        {
            return !string.Equals(deliveryStatus, "Chờ lấy hàng", StringComparison.OrdinalIgnoreCase);
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
    }
}
