using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BaseCore.Entities
{
    public class Product
    {
        [BsonId]
        public int Id { get; set; }

        public string Name { get; set; }

        public decimal Price { get; set; }

        public int Stock { get; set; }

        public string ImageUrl { get; set; }

        public string Description { get; set; }

        public int CategoryId { get; set; }

        [BsonIgnore]
        public Category Category { get; set; }
    }
}
