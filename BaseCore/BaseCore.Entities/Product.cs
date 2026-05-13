using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BaseCore.Entities
{
    public class Product
    {
        [BsonId]
        public int Id { get; set; }

        public string Name { get; set; }

        public string Manufacturer { get; set; } = "";

        public decimal Price { get; set; }

        public int Stock { get; set; }

        public string ImageUrl { get; set; }

        public string Description { get; set; }

        public int CategoryId { get; set; }

        public string Cpu { get; set; } = "";

        public string Gpu { get; set; } = "";

        public string Ram { get; set; } = "";

        public string Storage { get; set; } = "";

        public string Screen { get; set; } = "";

        public string Camera { get; set; } = "";

        public string Battery { get; set; } = "";

        public string Weight { get; set; } = "";

        public string OperatingSystem { get; set; } = "";

        public string Connectivity { get; set; } = "";

        public string Sensors { get; set; } = "";

        public string WaterResistance { get; set; } = "";

        [BsonIgnore]
        public Category Category { get; set; }
    }
}
