using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository
{
    /// <summary>
    /// Entity Framework Core DbContext for MySQL
    /// Used for teaching EF Core concepts (Bài 10)
    /// </summary>
    public class MySqlDbContext : DbContext
    {
        public MySqlDbContext(DbContextOptions<MySqlDbContext> options) : base(options)
        {
        }

        // DbSet for each entity
        public DbSet<User> Users { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDetail> OrderDetails { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.UserName).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Password).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Name).HasMaxLength(100);
                entity.Property(e => e.Email).HasMaxLength(100);
                entity.Property(e => e.Phone).HasMaxLength(20);
                entity.HasIndex(e => e.UserName).IsUnique();
            });

            // Configure Category entity
            modelBuilder.Entity<Category>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(500);
            });

            // Configure Product entity
            modelBuilder.Entity<Product>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Manufacturer).HasMaxLength(100).HasDefaultValue("");
                entity.Property(e => e.Price).HasPrecision(18, 2);
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.ImageUrl).HasMaxLength(500);

                // Relationship with Category
                entity.HasOne(e => e.Category)
                      .WithMany()
                      .HasForeignKey(e => e.CategoryId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure Order entity
            modelBuilder.Entity<Order>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UserId).HasMaxLength(50).IsRequired();
                entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
                entity.Property(e => e.OriginalAmount).HasPrecision(18, 2).HasDefaultValue(0m);
                entity.Property(e => e.DiscountAmount).HasPrecision(18, 2).HasDefaultValue(0m);
                entity.Property(e => e.DiscountPercent).HasPrecision(5, 2).HasDefaultValue(0m);
                entity.Property(e => e.PromotionName).HasMaxLength(100).HasDefaultValue("");
                entity.Property(e => e.ShippingAddress).HasMaxLength(500);
                entity.Property(e => e.PaymentMethod).HasMaxLength(50).HasDefaultValue("");
                entity.Property(e => e.PaymentStatus).HasMaxLength(50).HasDefaultValue("");
                entity.Property(e => e.PaymentCode).HasMaxLength(50).HasDefaultValue("");
                entity.Property(e => e.PaymentNote).HasMaxLength(500).HasDefaultValue("");
                entity.Property(e => e.TransportUnit).HasMaxLength(100).HasDefaultValue("");
                entity.Property(e => e.DeliveryStatus).HasMaxLength(100).HasDefaultValue("Chờ lấy hàng");
                entity.Property(e => e.TransportTrackingCode).HasMaxLength(100).HasDefaultValue("");

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure OrderDetail entity
            modelBuilder.Entity<OrderDetail>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UnitPrice).HasPrecision(18, 2);

                // Relationships
                entity.HasOne(e => e.Order)
                      .WithMany(o => o.OrderDetails)
                      .HasForeignKey(e => e.OrderId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Product)
                      .WithMany()
                      .HasForeignKey(e => e.ProductId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Seed initial data
            SeedData(modelBuilder);
        }

        private void SeedData(ModelBuilder modelBuilder)
        {
            // Seed Categories
            modelBuilder.Entity<Category>().HasData(
                new Category { Id = 1, Name = "Điện thoại", Description = "Điện thoại thông minh chính hãng, cấu hình mạnh và camera chất lượng." },
                new Category { Id = 2, Name = "Laptop", Description = "Laptop phục vụ học tập, văn phòng, đồ họa và gaming." },
                new Category { Id = 3, Name = "Smartwatch", Description = "Đồng hồ thông minh theo dõi sức khỏe, luyện tập và thông báo." },
                new Category { Id = 4, Name = "Tablet", Description = "Máy tính bảng cho học tập, giải trí, ghi chú và làm việc di động." }
            );

            // Seed Products
            modelBuilder.Entity<Product>().HasData(
                new Product { Id = 1, Name = "iPhone 15 Pro", Manufacturer = "Apple", Price = 28000000, Stock = 15, CategoryId = 1, Description = "Điện thoại cao cấp với chip A17 Pro, camera tốt và hiệu năng mạnh.", ImageUrl = "/electro/img/product02.png" },
                new Product { Id = 2, Name = "Samsung Galaxy S24 Ultra", Manufacturer = "Samsung", Price = 26500000, Stock = 12, CategoryId = 1, Description = "Flagship Android với bút S Pen, màn hình lớn và camera zoom sắc nét.", ImageUrl = "/electro/img/product03.png" },
                new Product { Id = 3, Name = "Laptop Dell XPS 15", Manufacturer = "Dell", Price = 35000000, Stock = 10, CategoryId = 2, Description = "Laptop màn hình 15 inch, phù hợp cho học tập và công việc nặng.", ImageUrl = "/electro/img/product01.png" },
                new Product { Id = 4, Name = "MacBook Air M3", Manufacturer = "Apple", Price = 31990000, Stock = 14, CategoryId = 2, Description = "Laptop mỏng nhẹ, pin lâu, phù hợp học tập, văn phòng và sáng tạo nội dung.", ImageUrl = "/electro/img/product06.png" },
                new Product { Id = 5, Name = "Apple Watch Series 9", Manufacturer = "Apple", Price = 10990000, Stock = 18, CategoryId = 3, Description = "Đồng hồ thông minh theo dõi sức khỏe và thông báo hằng ngày.", ImageUrl = "/electro/img/product06.png" },
                new Product { Id = 6, Name = "Samsung Galaxy Watch 6", Manufacturer = "Samsung", Price = 7490000, Stock = 20, CategoryId = 3, Description = "Đồng hồ Android theo dõi luyện tập, giấc ngủ và sức khỏe tổng quát.", ImageUrl = "/electro/img/product09.png" },
                new Product { Id = 7, Name = "iPad Air M2", Manufacturer = "Apple", Price = 18900000, Stock = 14, CategoryId = 4, Description = "Máy tính bảng gọn nhẹ cho học tập, giải trí và ghi chú.", ImageUrl = "/electro/img/product04.png" },
                new Product { Id = 8, Name = "Samsung Galaxy Tab S9", Manufacturer = "Samsung", Price = 19990000, Stock = 13, CategoryId = 4, Description = "Tablet Android cao cấp với màn hình AMOLED và bút S Pen.", ImageUrl = "/electro/img/product03.png" }
            );

            // User seed data is handled by AuthService startup against SQL Server.
        }
    }
}



