using BaseCore.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface IOrderService
    {
        Task<Order> CreateOrderAsync(Order order);
        Task<List<Order>> GetOrdersByUserIdAsync(string userId);
        Task<Order?> GetOrderByIdAsync(int id);
        Task AssignTransportAsync(int orderId, string transportUnit, string trackingCode);
        Task UpdateDeliveryStatusAsync(int orderId, string deliveryStatus, DateTime? deliveryDate = null);
    }
}
