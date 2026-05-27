using MongoDB.Bson.Serialization.Attributes;

namespace BaseCore.Entities
{
    public class ProductReview
    {
        [BsonId]
        public int Id { get; set; }

        public int ProductId { get; set; }

        public string UserId { get; set; } = "";

        public int OrderId { get; set; }

        public int Rating { get; set; }

        public string Content { get; set; } = "";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        [BsonIgnore]
        public Product? Product { get; set; }

        [BsonIgnore]
        public User? User { get; set; }

        [BsonIgnore]
        public Order? Order { get; set; }
    }
}
