using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Entities;
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
    SeedProductCatalog(db);
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
        new Product { Name = "iPhone 15 Pro", Price = 28000000, Stock = 15, Description = "Điện thoại cao cấp với chip A17 Pro, camera tốt và hiệu năng mạnh.", ImageUrl = "/electro/img/product02.png", Category = new Category { Name = "Điện thoại" } },
        new Product { Name = "Samsung Galaxy S24 Ultra", Price = 26500000, Stock = 12, Description = "Flagship Android với bút S Pen, màn hình lớn và camera zoom sắc nét.", ImageUrl = "/electro/img/product03.png", Category = new Category { Name = "Điện thoại" } },
        new Product { Name = "Xiaomi 14", Price = 18990000, Stock = 18, Description = "Điện thoại nhỏ gọn, hiệu năng cao, sạc nhanh và camera Leica.", ImageUrl = "/electro/img/product04.png", Category = new Category { Name = "Điện thoại" } },
        new Product { Name = "OPPO Reno 11 5G", Price = 10990000, Stock = 24, Description = "Mẫu điện thoại tầm trung nổi bật với thiết kế mỏng và chụp chân dung đẹp.", ImageUrl = "/electro/img/product05.png", Category = new Category { Name = "Điện thoại" } },
        new Product { Name = "Laptop Dell XPS 15", Price = 35000000, Stock = 10, Description = "Laptop màn hình 15 inch, phù hợp cho học tập và công việc nặng.", ImageUrl = "/electro/img/product01.png", Category = new Category { Name = "Laptop" } },
        new Product { Name = "MacBook Air M3", Price = 31990000, Stock = 14, Description = "Laptop mỏng nhẹ, pin lâu, phù hợp học tập, văn phòng và sáng tạo nội dung.", ImageUrl = "/electro/img/product06.png", Category = new Category { Name = "Laptop" } },
        new Product { Name = "ASUS ROG Zephyrus G14", Price = 39990000, Stock = 8, Description = "Laptop gaming nhỏ gọn với hiệu năng mạnh cho game và đồ họa.", ImageUrl = "/electro/img/product07.png", Category = new Category { Name = "Laptop" } },
        new Product { Name = "Lenovo ThinkPad X1 Carbon", Price = 42990000, Stock = 9, Description = "Laptop doanh nhân bền nhẹ, bàn phím tốt và bảo mật cao.", ImageUrl = "/electro/img/product08.png", Category = new Category { Name = "Laptop" } },
        new Product { Name = "Apple Watch Series 9", Price = 10990000, Stock = 18, Description = "Đồng hồ thông minh theo dõi sức khỏe và thông báo hằng ngày.", ImageUrl = "/electro/img/product06.png", Category = new Category { Name = "Smartwatch" } },
        new Product { Name = "Samsung Galaxy Watch 6", Price = 7490000, Stock = 20, Description = "Đồng hồ Android theo dõi luyện tập, giấc ngủ và sức khỏe tổng quát.", ImageUrl = "/electro/img/product09.png", Category = new Category { Name = "Smartwatch" } },
        new Product { Name = "Garmin Venu 3", Price = 10990000, Stock = 11, Description = "Smartwatch thể thao với GPS chính xác và pin dùng nhiều ngày.", ImageUrl = "/electro/img/product01.png", Category = new Category { Name = "Smartwatch" } },
        new Product { Name = "Xiaomi Watch 2 Pro", Price = 6490000, Stock = 16, Description = "Đồng hồ thông minh Wear OS, hỗ trợ nhiều chế độ luyện tập.", ImageUrl = "/electro/img/product02.png", Category = new Category { Name = "Smartwatch" } },
        new Product { Name = "iPad Air M2", Price = 18900000, Stock = 14, Description = "Máy tính bảng gọn nhẹ cho học tập, giải trí và ghi chú.", ImageUrl = "/electro/img/product04.png", Category = new Category { Name = "Tablet" } },
        new Product { Name = "Samsung Galaxy Tab S9", Price = 19990000, Stock = 13, Description = "Tablet Android cao cấp với màn hình AMOLED và bút S Pen.", ImageUrl = "/electro/img/product03.png", Category = new Category { Name = "Tablet" } },
        new Product { Name = "Xiaomi Pad 6", Price = 8990000, Stock = 22, Description = "Tablet giá tốt với màn hình tần số quét cao và hiệu năng ổn định.", ImageUrl = "/electro/img/product05.png", Category = new Category { Name = "Tablet" } },
        new Product { Name = "Lenovo Tab P12", Price = 11990000, Stock = 17, Description = "Tablet màn hình lớn phục vụ học online, xem phim và làm việc nhẹ.", ImageUrl = "/electro/img/product07.png", Category = new Category { Name = "Tablet" } },
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
        product.ImageUrl = seed.ImageUrl;
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
