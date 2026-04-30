using BaseCore.Entities;
using BaseCore.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class CustomersController : ControllerBase
    {
        private readonly MySqlDbContext _dbContext;

        public CustomersController(MySqlDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetCustomers(
            [FromQuery] string? keyword = null,
            [FromQuery] string? segment = null)
        {
            var query = _dbContext.Users
                .AsNoTracking()
                .Where(user => user.UserType != 1);

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var normalizedKeyword = keyword.Trim();
                query = query.Where(user =>
                    user.UserName.Contains(normalizedKeyword) ||
                    user.Name.Contains(normalizedKeyword) ||
                    user.Email.Contains(normalizedKeyword) ||
                    user.Phone.Contains(normalizedKeyword));
            }

            var customers = await query
                .Select(user => new CustomerSummaryDto
                {
                    UserId = user.Id,
                    UserName = user.UserName,
                    Name = user.Name,
                    Email = user.Email,
                    Phone = user.Phone,
                    IsActive = user.IsActive,
                    TotalOrders = _dbContext.Orders.Count(order => order.UserId == user.Id),
                    CompletedOrders = _dbContext.Orders.Count(order => order.UserId == user.Id && order.Status == "Completed"),
                    CancelledOrders = _dbContext.Orders.Count(order => order.UserId == user.Id && order.Status == "Cancelled"),
                    TotalSpent = _dbContext.Orders
                        .Where(order => order.UserId == user.Id && order.Status == "Completed")
                        .Sum(order => (decimal?)order.TotalAmount) ?? 0,
                    LastOrderDate = _dbContext.Orders
                        .Where(order => order.UserId == user.Id)
                        .Max(order => (DateTime?)order.OrderDate)
                })
                .ToListAsync();

            foreach (var customer in customers)
            {
                customer.Segment = CalculateSegment(customer.CompletedOrders, customer.TotalSpent);
                customer.SuggestedOffer = GetSuggestedOffer(customer.Segment);
            }

            if (!string.IsNullOrWhiteSpace(segment))
            {
                customers = customers
                    .Where(customer => string.Equals(customer.Segment, segment.Trim(), StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return Ok(customers
                .OrderByDescending(customer => customer.TotalSpent)
                .ThenByDescending(customer => customer.LastOrderDate)
                .ToList());
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetCustomerDetails(string userId)
        {
            var user = await _dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == userId && item.UserType != 1);

            if (user == null)
            {
                return NotFound(new { message = "Customer not found" });
            }

            var orders = await _dbContext.Orders
                .AsNoTracking()
                .Where(order => order.UserId == userId)
                .OrderByDescending(order => order.OrderDate)
                .Select(order => new CustomerOrderDto
                {
                    Id = order.Id,
                    OrderDate = order.OrderDate,
                    TotalAmount = order.TotalAmount,
                    Status = order.Status,
                    PaymentStatus = order.PaymentStatus,
                    DeliveryStatus = order.DeliveryStatus
                })
                .ToListAsync();

            var completedOrders = orders.Count(order => order.Status == "Completed");
            var totalSpent = orders
                .Where(order => order.Status == "Completed")
                .Sum(order => order.TotalAmount);
            var segment = CalculateSegment(completedOrders, totalSpent);

            return Ok(new
            {
                customer = new CustomerSummaryDto
                {
                    UserId = user.Id,
                    UserName = user.UserName,
                    Name = user.Name,
                    Email = user.Email,
                    Phone = user.Phone,
                    IsActive = user.IsActive,
                    TotalOrders = orders.Count,
                    CompletedOrders = completedOrders,
                    CancelledOrders = orders.Count(order => order.Status == "Cancelled"),
                    TotalSpent = totalSpent,
                    LastOrderDate = orders.FirstOrDefault()?.OrderDate,
                    Segment = segment,
                    SuggestedOffer = GetSuggestedOffer(segment)
                },
                orders
            });
        }

        private static string CalculateSegment(int completedOrders, decimal totalSpent)
        {
            if (completedOrders >= 5 || totalSpent >= 50000000) return "VIP";
            if (completedOrders >= 3 || totalSpent >= 20000000) return "Loyal";
            if (completedOrders >= 2 || totalSpent >= 10000000) return "Potential";
            if (completedOrders == 1) return "New";
            return "NoOrders";
        }

        private static string GetSuggestedOffer(string segment)
        {
            return segment switch
            {
                "VIP" => "Auto 10% discount",
                "Loyal" => "Auto 7% discount",
                "Potential" => "Auto 5% discount",
                "New" => "Auto 3% discount",
                _ => "No automatic discount yet"
            };
        }
    }

    public class CustomerSummaryDto
    {
        public string UserId { get; set; } = "";
        public string UserName { get; set; } = "";
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public bool IsActive { get; set; }
        public int TotalOrders { get; set; }
        public int CompletedOrders { get; set; }
        public int CancelledOrders { get; set; }
        public decimal TotalSpent { get; set; }
        public DateTime? LastOrderDate { get; set; }
        public string Segment { get; set; } = "";
        public string SuggestedOffer { get; set; } = "";
    }

    public class CustomerOrderDto
    {
        public int Id { get; set; }
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "";
        public string PaymentStatus { get; set; } = "";
        public string DeliveryStatus { get; set; } = "";
    }
}
