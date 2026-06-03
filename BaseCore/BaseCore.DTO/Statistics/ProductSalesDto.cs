namespace BaseCore.DTO.Statistics
{
    public class ProductSalesDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = "";
        public string ImageUrl { get; set; } = "";
        public string CategoryName { get; set; } = "";
        public int SoldQuantity { get; set; }
        public decimal Revenue { get; set; }
    }
}
