using System;
using System.Collections.Generic;

namespace BaseCore.Entities
{
    public class Order
    {
        public int Id { get; set; }

        public string UserId { get; set; } = "";

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        public decimal TotalAmount { get; set; }

        public string Status { get; set; } = ""; // Pending, Completed, Cancelled

        public string ShippingAddress { get; set; } = "";

        public string PaymentMethod { get; set; } = "";

        public string PaymentStatus { get; set; } = "";

        public string PaymentCode { get; set; } = "";
        public string PaymentNote { get; set; } = "";

        public string TransportUnit { get; set; } = "";
        public string DeliveryStatus { get; set; } = "Chờ lấy hàng";
        public DateTime? DeliveryDate { get; set; }
        public string TransportTrackingCode { get; set; } = "";

        public User? User { get; set; }
        public List<OrderDetail> OrderDetails { get; set; } = new();
    }
}
