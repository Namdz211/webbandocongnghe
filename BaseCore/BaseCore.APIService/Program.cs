using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Entities;
using BaseCore.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.AddEndpointsApiExplorer();

// Swagger Configuration
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BaseCore API Service",
        Version = "v1",
        Description = "Business Logic Microservice - Products, Categories, Orders (Bài 10, 11)"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

//MySQL Configuration with EF Core
//var connectionString = builder.Configuration.GetConnectionString("MySQL")
//    ?? "Server=localhost;Database=BaseCoreSales;User=root;Password=;";
//builder.Services.AddDbContext<MySqlDbContext>(options =>
//    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));



builder.Services.AddDbContext<MySqlDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("ConnectedDb"));
});


// Repository Registration - Products, Categories, Orders
builder.Services.AddScoped<IProductRepositoryEF, ProductRepositoryEF>();
builder.Services.AddScoped<ICategoryRepositoryEF, CategoryRepositoryEF>();
builder.Services.AddScoped<IOrderRepositoryEF, OrderRepositoryEF>();
builder.Services.AddScoped<IOrderDetailRepositoryEF, OrderDetailRepositoryEF>();
builder.Services.AddScoped<IStatisticsRepository, StatisticsRepository>();
builder.Services.AddScoped<IStatisticsService, StatisticsService>();
builder.Services.AddScoped<IOrderService, OrderService>();

// JWT Authentication
var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough");
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

var app = builder.Build();

// Auto migrate database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();
    db.Database.EnsureCreated();
    EnsureUserAddressColumn(db);
    EnsureProductManufacturerColumns(db);
    EnsureOrderPaymentColumns(db);
    EnsureOrderWorkflowColumns(db);
    SeedProductCatalog(db);
    SeedManufacturersAndAssignProducts(db);
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("BaseCore API Service running on port 5001");
Console.WriteLine("Endpoints: /api/products, /api/categories, /api/orders");
app.Run();

static void EnsureUserAddressColumn(MySqlDbContext db)
{
    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Users', N'Address') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD Address NVARCHAR(500) NOT NULL
        CONSTRAINT DF_Users_Address DEFAULT (N'');
END;");
}

static void SeedProductCatalog(MySqlDbContext db)
{
    var categorySeeds = new[]
    {
        new Category { Name = "Điện thoại", Description = "Điện thoại thông minh chính hãng, cấu hình mạnh và camera chất lượng." },
        new Category { Name = "Laptop", Description = "Laptop phục vụ học tập, văn phòng, đồ họa và gaming." },
        new Category { Name = "Smartwatch", Description = "Đồng hồ thông minh theo dõi sức khỏe, luyện tập và thông báo." },
        new Category { Name = "Tablet", Description = "Máy tính bảng cho học tập, giải trí, ghi chú và làm việc di động." },
    };

    var legacyCategoryMap = new Dictionary<string, string>
    {
        ["Electronics"] = "Điện thoại",
        ["Clothing"] = "Laptop",
        ["Books"] = "Smartwatch",
        ["Home & Garden"] = "Tablet",
    };

    var categories = db.Categories.ToList();
    foreach (var (oldName, newName) in legacyCategoryMap)
    {
        var legacyCategory = categories.FirstOrDefault(category => category.Name == oldName);
        var targetSeed = categorySeeds.First(category => category.Name == newName);
        var targetExists = categories.Any(category => category.Name == newName);

        if (legacyCategory != null && !targetExists)
        {
            legacyCategory.Name = targetSeed.Name;
            legacyCategory.Description = targetSeed.Description;
        }
    }

    db.SaveChanges();

    categories = db.Categories.ToList();
    foreach (var seed in categorySeeds)
    {
        var category = categories.FirstOrDefault(item => item.Name == seed.Name);
        if (category == null)
        {
            db.Categories.Add(new Category
            {
                Name = seed.Name,
                Description = seed.Description,
            });
        }
        else
        {
            category.Description = seed.Description;
        }
    }

    db.SaveChanges();

    var productSeeds = new[]
    {
        new Product { Name = "iPhone 15 Pro", Price = 28000000, Stock = 15, Description = "Điện thoại cao cấp với chip A17 Pro, camera tốt và hiệu năng mạnh.", ImageUrl = "", Category = new Category { Name = "Điện thoại" } },
        new Product { Name = "Samsung Galaxy S24 Ultra", Price = 26500000, Stock = 12, Description = "Flagship Android với bút S Pen, màn hình lớn và camera zoom sắc nét.", ImageUrl = "", Category = new Category { Name = "Điện thoại" } },
        new Product { Name = "Xiaomi 14", Price = 18990000, Stock = 18, Description = "Điện thoại nhỏ gọn, hiệu năng cao, sạc nhanh và camera Leica.", ImageUrl = "", Category = new Category { Name = "Điện thoại" } },
        new Product { Name = "OPPO Reno 11 5G", Price = 10990000, Stock = 24, Description = "Mẫu điện thoại tầm trung nổi bật với thiết kế mỏng và chụp chân dung đẹp.", ImageUrl = "", Category = new Category { Name = "Điện thoại" } },
        new Product { Name = "Laptop Dell XPS 15", Price = 35000000, Stock = 10, Description = "Laptop màn hình 15 inch, phù hợp cho học tập và công việc nặng.", ImageUrl = "", Category = new Category { Name = "Laptop" } },
        new Product { Name = "MacBook Air M3", Price = 31990000, Stock = 14, Description = "Laptop mỏng nhẹ, pin lâu, phù hợp học tập, văn phòng và sáng tạo nội dung.", ImageUrl = "", Category = new Category { Name = "Laptop" } },
        new Product { Name = "ASUS ROG Zephyrus G14", Price = 39990000, Stock = 8, Description = "Laptop gaming nhỏ gọn với hiệu năng mạnh cho game và đồ họa.", ImageUrl = "", Category = new Category { Name = "Laptop" } },
        new Product { Name = "Lenovo ThinkPad X1 Carbon", Price = 42990000, Stock = 9, Description = "Laptop doanh nhân bền nhẹ, bàn phím tốt và bảo mật cao.", ImageUrl = "", Category = new Category { Name = "Laptop" } },
        new Product { Name = "Apple Watch Series 9", Price = 10990000, Stock = 18, Description = "Đồng hồ thông minh theo dõi sức khỏe và thông báo hằng ngày.", ImageUrl = "", Category = new Category { Name = "Smartwatch" } },
        new Product { Name = "Samsung Galaxy Watch 6", Price = 7490000, Stock = 20, Description = "Đồng hồ Android theo dõi luyện tập, giấc ngủ và sức khỏe tổng quát.", ImageUrl = "", Category = new Category { Name = "Smartwatch" } },
        new Product { Name = "Garmin Venu 3", Price = 10990000, Stock = 11, Description = "Smartwatch thể thao với GPS chính xác và pin dùng nhiều ngày.", ImageUrl = "", Category = new Category { Name = "Smartwatch" } },
        new Product { Name = "Xiaomi Watch 2 Pro", Price = 6490000, Stock = 16, Description = "Đồng hồ thông minh Wear OS, hỗ trợ nhiều chế độ luyện tập.", ImageUrl = "", Category = new Category { Name = "Smartwatch" } },
        new Product { Name = "iPad Air M2", Price = 18900000, Stock = 14, Description = "Máy tính bảng gọn nhẹ cho học tập, giải trí và ghi chú.", ImageUrl = "", Category = new Category { Name = "Tablet" } },
        new Product { Name = "Samsung Galaxy Tab S9", Price = 19990000, Stock = 13, Description = "Tablet Android cao cấp với màn hình AMOLED và bút S Pen.", ImageUrl = "", Category = new Category { Name = "Tablet" } },
        new Product { Name = "Xiaomi Pad 6", Price = 8990000, Stock = 22, Description = "Tablet giá tốt với màn hình tần số quét cao và hiệu năng ổn định.", ImageUrl = "", Category = new Category { Name = "Tablet" } },
        new Product { Name = "Lenovo Tab P12", Price = 11990000, Stock = 17, Description = "Tablet màn hình lớn phục vụ học online, xem phim và làm việc nhẹ.", ImageUrl = "", Category = new Category { Name = "Tablet" } },
    };

    var obsoleteProductNames = new HashSet<string>
    {
        "Sony WH-1000XM5",
        "Ao Thun Cotton Premium",
        "Ao Hoodie Basic",
        "Quan Jean Slim Fit",
        "Clean Code",
        "ASP.NET Core Thuc Chien",
        "Noi Chien Khong Dau 6L",
        "Den Ban LED Thong Minh",
        "Bo Dung Cu Lam Vuon",
        "Tham Yoga Cao Su",
        "Ta Tay 10kg",
        "Vot Cau Long Carbon",
        "T-Shirt Cotton",
        "Programming Book",
        "Garden Tools Set",
    };

    var orderedProductIds = db.OrderDetails
        .Select(orderDetail => orderDetail.ProductId)
        .ToHashSet();
    var obsoleteProducts = db.Products
        .Where(product => obsoleteProductNames.Contains(product.Name))
        .ToList()
        .Where(product => !orderedProductIds.Contains(product.Id))
        .ToList();
    db.Products.RemoveRange(obsoleteProducts);
    db.SaveChanges();

    var categoriesByName = db.Categories.ToDictionary(category => category.Name);
    var productsByName = db.Products.ToDictionary(product => product.Name);

    foreach (var seed in productSeeds)
    {
        var category = categoriesByName[seed.Category.Name];
        if (!productsByName.TryGetValue(seed.Name, out var product))
        {
            product = new Product { Name = seed.Name };
            db.Products.Add(product);
        }

        product.Price = seed.Price;
        product.Stock = seed.Stock;
        product.CategoryId = category.Id;
        product.Description = seed.Description;
        product.ImageUrl = string.IsNullOrWhiteSpace(seed.ImageUrl)
            ? GetProductImageUrl(seed.Name)
            : seed.ImageUrl.Trim();
    }

    db.SaveChanges();

    var obsoleteCategoryNames = new HashSet<string>
    {
        "Electronics",
        "Clothing",
        "Books",
        "Home & Garden",
        "Sports",
    };
    var usedCategoryIds = db.Products
        .Select(product => product.CategoryId)
        .ToHashSet();
    var obsoleteCategories = db.Categories
        .Where(category => obsoleteCategoryNames.Contains(category.Name))
        .ToList()
        .Where(category => !usedCategoryIds.Contains(category.Id));

    db.Categories.RemoveRange(obsoleteCategories);
    db.SaveChanges();
}

static string GetProductImageUrl(string productName)
{
    const string imageBaseUrl = "https://tse.mm.bing.net/th";
    const string imageParams = "w=360&h=360&c=7&rs=1&p=0&dpr=1&pid=1.7&mkt=vi-VN";
    var query = Uri.EscapeDataString($"{productName} official product photo");

    return $"{imageBaseUrl}?{imageParams}&q={query}";
}

static void EnsureProductManufacturerColumns(MySqlDbContext db)
{
    db.Database.ExecuteSqlRaw(@"
IF OBJECT_ID(N'dbo.Manufacturers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Manufacturers
    (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Manufacturers PRIMARY KEY,
        Name NVARCHAR(255) NOT NULL
    );
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Products', N'ManufacturerId') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD ManufacturerId INT NULL;
END;");

    db.Database.ExecuteSqlRaw(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Products_ManufacturerId' AND object_id = OBJECT_ID(N'dbo.Products'))
BEGIN
    CREATE INDEX IX_Products_ManufacturerId ON dbo.Products(ManufacturerId);
END;");

    db.Database.ExecuteSqlRaw(@"
IF NOT EXISTS
(
    SELECT 1
    FROM sys.foreign_key_columns fkc
    WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.Products')
      AND fkc.parent_column_id = COLUMNPROPERTY(OBJECT_ID(N'dbo.Products'), N'ManufacturerId', 'ColumnId')
)
AND NOT EXISTS
(
    SELECT 1
    FROM dbo.Products p
    LEFT JOIN dbo.Manufacturers m ON m.Id = p.ManufacturerId
    WHERE p.ManufacturerId IS NOT NULL AND m.Id IS NULL
)
BEGIN
    ALTER TABLE dbo.Products
    ADD CONSTRAINT FK_Products_Manufacturers_ManufacturerId
        FOREIGN KEY (ManufacturerId) REFERENCES dbo.Manufacturers(Id)
        ON DELETE SET NULL;
END;");

    db.Database.ExecuteSqlRaw(@"
IF NOT EXISTS (SELECT 1 FROM dbo.Manufacturers)
BEGIN
    INSERT INTO dbo.Manufacturers (Name)
    VALUES (N'Apple'), (N'Samsung'), (N'Xiaomi'), (N'Huawei'), (N'Lenovo'),
           (N'Amazfit'), (N'Fitbit'), (N'Coros'), (N'Haylou');
END;");
}

static void SeedManufacturersAndAssignProducts(MySqlDbContext db)
{
    db.Database.ExecuteSqlRaw(@"
DECLARE @Manufacturers TABLE (Name NVARCHAR(255) NOT NULL);

INSERT INTO @Manufacturers (Name)
VALUES
    (N'Apple'), (N'Samsung'), (N'Xiaomi'), (N'Huawei'), (N'Lenovo'),
    (N'Amazfit'), (N'Fitbit'), (N'Coros'), (N'Haylou'), (N'OPPO'),
    (N'Vivo'), (N'Realme'), (N'Google'), (N'Nokia'), (N'Honor'),
    (N'Dell'), (N'HP'), (N'ASUS'), (N'Acer'), (N'MSI'),
    (N'LG'), (N'Microsoft'), (N'Garmin');

INSERT INTO dbo.Manufacturers (Name)
SELECT source.Name
FROM @Manufacturers source
WHERE NOT EXISTS
(
    SELECT 1
    FROM dbo.Manufacturers target
    WHERE LOWER(target.Name) = LOWER(source.Name)
);

UPDATE product
SET ManufacturerId = manufacturer.Id
FROM dbo.Products product
CROSS APPLY
(
    SELECT TOP 1 mapping.ManufacturerName
    FROM
    (
        VALUES
            (N'iPhone', N'Apple'),
            (N'iPad', N'Apple'),
            (N'MacBook', N'Apple'),
            (N'Apple Watch', N'Apple'),
            (N'Samsung', N'Samsung'),
            (N'Xiaomi', N'Xiaomi'),
            (N'Redmi', N'Xiaomi'),
            (N'Huawei', N'Huawei'),
            (N'Lenovo', N'Lenovo'),
            (N'Amazfit', N'Amazfit'),
            (N'Fitbit', N'Fitbit'),
            (N'Coros', N'Coros'),
            (N'Haylou', N'Haylou'),
            (N'OPPO', N'OPPO'),
            (N'Vivo', N'Vivo'),
            (N'Realme', N'Realme'),
            (N'Google', N'Google'),
            (N'Nokia', N'Nokia'),
            (N'Honor', N'Honor'),
            (N'Dell', N'Dell'),
            (N'HP ', N'HP'),
            (N'ASUS', N'ASUS'),
            (N'Acer', N'Acer'),
            (N'MSI', N'MSI'),
            (N'LG ', N'LG'),
            (N'Microsoft', N'Microsoft'),
            (N'Garmin', N'Garmin')
    ) mapping(ProductToken, ManufacturerName)
    WHERE product.Name LIKE N'%' + mapping.ProductToken + N'%'
) mapping
INNER JOIN dbo.Manufacturers manufacturer
    ON LOWER(manufacturer.Name) = LOWER(mapping.ManufacturerName)
WHERE product.ManufacturerId IS NULL;");
}

static void EnsureOrderPaymentColumns(MySqlDbContext db)
{
    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'PaymentCode') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD PaymentCode NVARCHAR(50) NOT NULL
        CONSTRAINT DF_Orders_PaymentCode DEFAULT (N'');
END;");

    db.Database.ExecuteSqlRaw(@"
UPDATE dbo.Orders
SET PaymentCode = CONCAT(N'LEGACY-', Id)
WHERE ISNULL(PaymentCode, N'') = N'';");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'OriginalAmount') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD OriginalAmount DECIMAL(18, 2) NOT NULL
        CONSTRAINT DF_Orders_OriginalAmount DEFAULT (0);
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'DiscountAmount') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD DiscountAmount DECIMAL(18, 2) NOT NULL
        CONSTRAINT DF_Orders_DiscountAmount DEFAULT (0);
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'DiscountPercent') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD DiscountPercent DECIMAL(5, 2) NOT NULL
        CONSTRAINT DF_Orders_DiscountPercent DEFAULT (0);
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'PromotionName') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD PromotionName NVARCHAR(100) NOT NULL
        CONSTRAINT DF_Orders_PromotionName DEFAULT (N'');
END;");

    db.Database.ExecuteSqlRaw(@"
UPDATE dbo.Orders
SET OriginalAmount = CASE WHEN OriginalAmount = 0 THEN TotalAmount ELSE OriginalAmount END,
    DiscountAmount = ISNULL(DiscountAmount, 0),
    DiscountPercent = ISNULL(DiscountPercent, 0),
    PromotionName = ISNULL(PromotionName, N'');");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'PaymentNote') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD PaymentNote NVARCHAR(500) NOT NULL
        CONSTRAINT DF_Orders_PaymentNote DEFAULT (N'');
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'TransportUnit') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD TransportUnit NVARCHAR(100) NOT NULL
        CONSTRAINT DF_Orders_TransportUnit DEFAULT (N'');
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'TransportUnit') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Orders ALTER COLUMN TransportUnit NVARCHAR(100) NOT NULL;
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'DeliveryStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD DeliveryStatus NVARCHAR(100) NOT NULL
        CONSTRAINT DF_Orders_DeliveryStatus DEFAULT (N'Chờ lấy hàng');
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'DeliveryStatus') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Orders ALTER COLUMN DeliveryStatus NVARCHAR(100) NOT NULL;
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'DeliveryDate') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD DeliveryDate DATETIME2 NULL;
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'TransportTrackingCode') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD TransportTrackingCode NVARCHAR(100) NOT NULL
        CONSTRAINT DF_Orders_TransportTrackingCode DEFAULT (N'');
END;");

    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'dbo.Orders', N'TransportTrackingCode') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Orders ALTER COLUMN TransportTrackingCode NVARCHAR(100) NOT NULL;
END;");

    db.Database.ExecuteSqlRaw(@"
UPDATE dbo.Orders
SET PaymentNote = ISNULL(PaymentNote, N''),
    TransportUnit = ISNULL(TransportUnit, N''),
    DeliveryStatus = CASE WHEN ISNULL(DeliveryStatus, N'') = N'' THEN N'Chờ lấy hàng' ELSE DeliveryStatus END,
    TransportTrackingCode = ISNULL(TransportTrackingCode, N'');");
}

static void EnsureOrderWorkflowColumns(MySqlDbContext db)
{
    db.Database.ExecuteSqlRaw(@"
IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_Orders_Status'
        AND parent_object_id = OBJECT_ID(N'dbo.Orders')
)
BEGIN
    ALTER TABLE dbo.Orders DROP CONSTRAINT CK_Orders_Status;
END;");

    db.Database.ExecuteSqlRaw(@"
UPDATE dbo.Orders
SET Status = CASE
    WHEN Status = N'Processing' THEN N'Shipping'
    WHEN Status IN (N'Pending', N'Confirmed', N'Shipping', N'Completed', N'Cancelled') THEN Status
    ELSE N'Pending'
END;");

    db.Database.ExecuteSqlRaw(@"
IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_Orders_Status'
        AND parent_object_id = OBJECT_ID(N'dbo.Orders')
)
BEGIN
    ALTER TABLE dbo.Orders
    ADD CONSTRAINT CK_Orders_Status
    CHECK (Status IN (N'Pending', N'Confirmed', N'Shipping', N'Completed', N'Cancelled'));
END;");
}


