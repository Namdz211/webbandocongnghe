namespace BaseCore.DTO.Statistics
{
    public class OrderByCategoryDto
    {
        public string CategoryName { get; set; } = "";
        public int OrderCount { get; set; }
        public decimal TotalRevenue { get; set; }
        public int TotalQuantitySold { get; set; }
    }
}
