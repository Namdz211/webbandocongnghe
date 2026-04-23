using BaseCore.Entities;
using BaseCore.Repository.EFCore;

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
    }
}
