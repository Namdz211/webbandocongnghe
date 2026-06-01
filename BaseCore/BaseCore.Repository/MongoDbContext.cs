using MongoDB.Driver;
using BaseCore.Common;
using BaseCore.Entities;

namespace BaseCore.Repository
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(string connectionString, string databaseName)
        {
            var client = new MongoClient(connectionString);
            _database = client.GetDatabase(databaseName);
        }

        public IMongoCollection<User> Users => _database.GetCollection<User>("Users");
        public IMongoCollection<Category> Categories => _database.GetCollection<Category>("Categories");
        public IMongoCollection<Product> Products => _database.GetCollection<Product>("Products");
        public IMongoCollection<Order> Orders => _database.GetCollection<Order>("Orders");
        public IMongoCollection<OrderDetail> OrderDetails => _database.GetCollection<OrderDetail>("OrderDetails");

        public async Task SeedDataAsync()
        {
            // Seed Categories if empty
            if (await Categories.CountDocumentsAsync(FilterDefinition<Category>.Empty) == 0)
            {
                var categories = new List<Category>
                {
                    new Category { Id = 1, Name = "Điện thoại", Description = "Điện thoại thông minh chính hãng, cấu hình mạnh và camera chất lượng." },
                    new Category { Id = 2, Name = "Laptop", Description = "Laptop phục vụ học tập, văn phòng, đồ họa và gaming." },
                    new Category { Id = 3, Name = "Smartwatch", Description = "Đồng hồ thông minh theo dõi sức khỏe, luyện tập và thông báo." },
                    new Category { Id = 4, Name = "Tablet", Description = "Máy tính bảng cho học tập, giải trí, ghi chú và làm việc di động." }
                };
                await Categories.InsertManyAsync(categories);
            }

            // Seed Admin User if not exists
            var adminFilter = Builders<User>.Filter.Eq(u => u.UserName, "admin");
            var existingAdmin = await Users.Find(adminFilter).FirstOrDefaultAsync();
            if (existingAdmin == null)
            {
                // Hash password using PBKDF2
                byte[] salt;
                string hashedPassword = TokenHelper.HashPassword("admin123", out salt);

                var adminUser = new User
                {
                    Id = "507f1f77bcf86cd799439011", // Valid ObjectId
                    UserName = "admin",
                    Password = hashedPassword,
                    Salt = salt,
                    Name = "Administrator",
                    Email = "admin@robotvibot.com",
                    Phone = "0123456789",
                    Address = "",
                    Position = "System Administrator",
                    Contact = "",
                    Image = "",
                    IsActive = true,
                    UserType = 1,
                    Created = DateTime.Now
                };
                await Users.InsertOneAsync(adminUser);
                Console.WriteLine("Admin user created with hashed password: admin / admin123");
            }
            else if (existingAdmin.Salt == null || existingAdmin.Salt.Length == 0)
            {
                // Update existing admin with hashed password if currently plain text
                byte[] salt;
                string hashedPassword = TokenHelper.HashPassword("admin123", out salt);

                var update = Builders<User>.Update
                    .Set(u => u.Password, hashedPassword)
                    .Set(u => u.Salt, salt)
                    .Set(u => u.IsActive, true);
                await Users.UpdateOneAsync(adminFilter, update);
                Console.WriteLine("Admin user password hashed: admin / admin123");
            }

            // Seed Products if empty
            if (await Products.CountDocumentsAsync(FilterDefinition<Product>.Empty) == 0)
            {
                var products = new List<Product>
                {
                    new Product { Id = 1, Name = "iPhone 15 Pro", Price = 28000000, Stock = 15, CategoryId = 1, Description = "Điện thoại cao cấp với chip A17 Pro, camera tốt và hiệu năng mạnh.", ImageUrl = "/electro/img/product02.png" },
                    new Product { Id = 2, Name = "Samsung Galaxy S24 Ultra", Price = 26500000, Stock = 12, CategoryId = 1, Description = "Flagship Android với bút S Pen, màn hình lớn và camera zoom sắc nét.", ImageUrl = "/electro/img/product03.png" },
                    new Product { Id = 3, Name = "Laptop Dell XPS 15", Price = 35000000, Stock = 10, CategoryId = 2, Description = "Laptop màn hình 15 inch, phù hợp cho học tập và công việc nặng.", ImageUrl = "/electro/img/product01.png" },
                    new Product { Id = 4, Name = "MacBook Air M3", Price = 31990000, Stock = 14, CategoryId = 2, Description = "Laptop mỏng nhẹ, pin lâu, phù hợp học tập, văn phòng và sáng tạo nội dung.", ImageUrl = "/electro/img/product06.png" },
                    new Product { Id = 5, Name = "Apple Watch Series 9", Price = 10990000, Stock = 18, CategoryId = 3, Description = "Đồng hồ thông minh theo dõi sức khỏe và thông báo hằng ngày.", ImageUrl = "/electro/img/product06.png" },
                    new Product { Id = 6, Name = "Samsung Galaxy Watch 6", Price = 7490000, Stock = 20, CategoryId = 3, Description = "Đồng hồ Android theo dõi luyện tập, giấc ngủ và sức khỏe tổng quát.", ImageUrl = "/electro/img/product09.png" },
                    new Product { Id = 7, Name = "iPad Air M2", Price = 18900000, Stock = 14, CategoryId = 4, Description = "Máy tính bảng gọn nhẹ cho học tập, giải trí và ghi chú.", ImageUrl = "/electro/img/product04.png" },
                    new Product { Id = 8, Name = "Samsung Galaxy Tab S9", Price = 19990000, Stock = 13, CategoryId = 4, Description = "Tablet Android cao cấp với màn hình AMOLED và bút S Pen.", ImageUrl = "/electro/img/product03.png" }
                };
                await Products.InsertManyAsync(products);
            }
        }
    }
}
