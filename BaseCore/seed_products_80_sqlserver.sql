USE BaseCoreSales;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

MERGE dbo.Categories AS target
USING (VALUES
    (N'Điện thoại', N'Điện thoại thông minh chính hãng, cấu hình mạnh và camera chất lượng.'),
    (N'Laptop', N'Laptop phục vụ học tập, văn phòng, đồ họa và gaming.'),
    (N'Smartwatch', N'Đồng hồ thông minh theo dõi sức khỏe, luyện tập và thông báo.'),
    (N'Tablet', N'Máy tính bảng cho học tập, giải trí, ghi chú và làm việc di động.')
) AS source (Name, Description)
ON target.Name = source.Name
WHEN MATCHED THEN
    UPDATE SET Description = source.Description
WHEN NOT MATCHED THEN
    INSERT (Name, Description) VALUES (source.Name, source.Description);

DECLARE @PhoneId INT = (SELECT Id FROM dbo.Categories WHERE Name = N'Điện thoại');
DECLARE @LaptopId INT = (SELECT Id FROM dbo.Categories WHERE Name = N'Laptop');
DECLARE @WatchId INT = (SELECT Id FROM dbo.Categories WHERE Name = N'Smartwatch');
DECLARE @TabletId INT = (SELECT Id FROM dbo.Categories WHERE Name = N'Tablet');

DECLARE @Products TABLE
(
    Name NVARCHAR(200) NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Stock INT NOT NULL,
    CategoryId INT NOT NULL,
    Description NVARCHAR(1000) NOT NULL,
    ImageUrl NVARCHAR(500) NOT NULL
);

INSERT INTO @Products (Name, Price, Stock, CategoryId, Description, ImageUrl)
VALUES
-- Dien thoai
(N'iPhone 15 Pro', 28000000, 15, @PhoneId, N'Điện thoại cao cấp với chip A17 Pro, camera tốt và hiệu năng mạnh.', N''),
(N'Samsung Galaxy S24 Ultra', 26500000, 12, @PhoneId, N'Flagship Android với bút S Pen, màn hình lớn và camera zoom sắc nét.', N''),
(N'Xiaomi 14', 18990000, 18, @PhoneId, N'Điện thoại nhỏ gọn, hiệu năng cao, sạc nhanh và camera Leica.', N''),
(N'OPPO Reno 11 5G', 10990000, 24, @PhoneId, N'Điện thoại tầm trung có thiết kế mỏng và chụp chân dung đẹp.', N''),
(N'iPhone 15', 21990000, 20, @PhoneId, N'iPhone pin tốt, camera ổn định và hiệu năng mạnh cho nhu cầu hằng ngày.', N''),
(N'iPhone 15 Plus', 24990000, 16, @PhoneId, N'iPhone màn hình lớn, pin lâu, phù hợp xem phim và làm việc di động.', N''),
(N'iPhone 14 Pro Max', 26990000, 10, @PhoneId, N'iPhone cao cấp với màn hình ProMotion, camera tốt và thiết kế bền.', N''),
(N'Samsung Galaxy S24', 19990000, 18, @PhoneId, N'Flagship nhỏ gọn, màn hình đẹp, hiệu năng cao và hỗ trợ Galaxy AI.', N''),
(N'Samsung Galaxy S24 Plus', 23990000, 15, @PhoneId, N'Điện thoại Android màn hình lớn, pin tốt và camera đa dụng.', N''),
(N'Samsung Galaxy Z Flip5', 20990000, 9, @PhoneId, N'Điện thoại gập nhỏ gọn, màn hình phụ tiện lợi và thiết kế thời trang.', N''),
(N'Samsung Galaxy A55 5G', 9690000, 25, @PhoneId, N'Điện thoại tầm trung bền bỉ, màn hình AMOLED và camera ổn định.', N''),
(N'Xiaomi 14 Ultra', 29990000, 8, @PhoneId, N'Flagship Xiaomi tập trung camera, hiệu năng mạnh và sạc nhanh.', N''),
(N'Xiaomi Redmi Note 13 Pro', 7490000, 30, @PhoneId, N'Điện thoại giá tốt, màn hình đẹp, pin lớn và sạc nhanh.', N''),
(N'OPPO Find X7', 19990000, 12, @PhoneId, N'Điện thoại cao cấp với camera chân dung đẹp và sạc nhanh.', N''),
(N'OPPO A78', 5990000, 28, @PhoneId, N'Điện thoại phổ thông có pin tốt, thiết kế mỏng và màn hình sáng.', N''),
(N'Vivo V30 5G', 13990000, 14, @PhoneId, N'Điện thoại chụp chân dung đẹp, thiết kế mỏng và hiệu năng ổn.', N''),
(N'Realme 12 Pro Plus', 11990000, 17, @PhoneId, N'Điện thoại tầm trung có camera zoom, màn hình mượt và pin tốt.', N''),
(N'Google Pixel 8', 16990000, 10, @PhoneId, N'Điện thoại Android thuần, camera thông minh và cập nhật lâu dài.', N''),
(N'Nokia G42 5G', 4490000, 22, @PhoneId, N'Điện thoại cơ bản bền, pin ổn và hỗ trợ kết nối 5G.', N''),
(N'Honor 90', 8990000, 19, @PhoneId, N'Điện thoại màn hình sắc nét, camera độ phân giải cao và sạc nhanh.', N''),

-- Laptop
(N'Laptop Dell XPS 15', 35000000, 10, @LaptopId, N'Laptop màn hình 15 inch, phù hợp cho học tập và công việc nặng.', N''),
(N'MacBook Air M3', 31990000, 14, @LaptopId, N'Laptop mỏng nhẹ, pin lâu, phù hợp học tập, văn phòng và sáng tạo nội dung.', N''),
(N'ASUS ROG Zephyrus G14', 39990000, 8, @LaptopId, N'Laptop gaming nhỏ gọn với hiệu năng mạnh cho game và đồ họa.', N''),
(N'Lenovo ThinkPad X1 Carbon', 42990000, 9, @LaptopId, N'Laptop doanh nhân bền nhẹ, bàn phím tốt và bảo mật cao.', N''),
(N'MacBook Pro 14 M3', 45990000, 8, @LaptopId, N'Laptop Apple hiệu năng cao cho lập trình, đồ họa và dựng video.', N''),
(N'MacBook Pro 16 M3 Pro', 62990000, 5, @LaptopId, N'Laptop màn hình lớn, hiệu năng mạnh và pin lâu cho công việc nặng.', N''),
(N'Dell Inspiron 15 3530', 14990000, 24, @LaptopId, N'Laptop văn phòng màn hình 15 inch, dễ dùng và dễ nâng cấp.', N''),
(N'Dell Latitude 7440', 28990000, 12, @LaptopId, N'Laptop doanh nhân gọn nhẹ, bảo mật tốt và độ bền cao.', N''),
(N'HP Pavilion 14', 15990000, 20, @LaptopId, N'Laptop học tập và văn phòng, thiết kế gọn, hiệu năng ổn định.', N''),
(N'HP Spectre x360 14', 39990000, 7, @LaptopId, N'Laptop xoay gập cao cấp, màn hình đẹp và thiết kế sang trọng.', N''),
(N'ASUS Zenbook 14 OLED', 24990000, 13, @LaptopId, N'Laptop mỏng nhẹ, màn hình OLED sắc nét và pin tốt.', N''),
(N'ASUS TUF Gaming F15', 22990000, 15, @LaptopId, N'Laptop gaming bền bỉ, tản nhiệt tốt và hiệu năng ổn.', N''),
(N'Lenovo IdeaPad Slim 5', 16990000, 21, @LaptopId, N'Laptop mỏng nhẹ cho sinh viên, văn phòng và giải trí cơ bản.', N''),
(N'Lenovo Legion 5 Pro', 34990000, 9, @LaptopId, N'Laptop gaming màn hình đẹp, hiệu năng mạnh và bàn phím tốt.', N''),
(N'Acer Swift Go 14', 18990000, 18, @LaptopId, N'Laptop gọn nhẹ, màn hình sáng và phù hợp làm việc di động.', N''),
(N'Acer Nitro V 15', 21990000, 16, @LaptopId, N'Laptop gaming phổ thông, cấu hình tốt trong tầm giá.', N''),
(N'MSI Modern 14', 13990000, 19, @LaptopId, N'Laptop văn phòng nhẹ, thiết kế đơn giản và hiệu năng ổn.', N''),
(N'MSI Katana 15', 27990000, 11, @LaptopId, N'Laptop gaming có GPU rời, màn hình nhanh và tản nhiệt tốt.', N''),
(N'LG Gram 16', 36990000, 6, @LaptopId, N'Laptop màn hình lớn nhưng rất nhẹ, pin lâu cho di chuyển.', N''),
(N'Microsoft Surface Laptop 5', 29990000, 8, @LaptopId, N'Laptop Windows cao cấp, thiết kế tối giản và màn hình cảm ứng.', N''),

-- Smartwatch
(N'Apple Watch Series 9', 10990000, 18, @WatchId, N'Đồng hồ thông minh theo dõi sức khỏe và thông báo hằng ngày.', N''),
(N'Samsung Galaxy Watch 6', 7490000, 20, @WatchId, N'Đồng hồ Android theo dõi luyện tập, giấc ngủ và sức khỏe tổng quát.', N''),
(N'Garmin Venu 3', 10990000, 11, @WatchId, N'Smartwatch thể thao với GPS chính xác và pin dùng nhiều ngày.', N''),
(N'Xiaomi Watch 2 Pro', 6490000, 16, @WatchId, N'Đồng hồ thông minh Wear OS, hỗ trợ nhiều chế độ luyện tập.', N''),
(N'Apple Watch SE 2023', 6990000, 22, @WatchId, N'Smartwatch Apple giá dễ tiếp cận, theo dõi sức khỏe cơ bản.', N''),
(N'Apple Watch Ultra 2', 21990000, 7, @WatchId, N'Đồng hồ Apple cao cấp, vỏ bền và pin tốt cho hoạt động ngoài trời.', N''),
(N'Samsung Galaxy Watch 6 Classic', 8990000, 15, @WatchId, N'Smartwatch Android có viền xoay, theo dõi sức khỏe và luyện tập.', N''),
(N'Samsung Galaxy Watch 5 Pro', 7990000, 12, @WatchId, N'Đồng hồ thông minh bền, pin tốt và hỗ trợ thể thao ngoài trời.', N''),
(N'Garmin Forerunner 265', 11990000, 10, @WatchId, N'Đồng hồ chạy bộ có GPS chính xác và chỉ số luyện tập chuyên sâu.', N''),
(N'Garmin Fenix 7', 18990000, 6, @WatchId, N'Smartwatch thể thao cao cấp, pin lâu và bản đồ đa môn.', N''),
(N'Garmin Instinct 2', 7990000, 14, @WatchId, N'Đồng hồ thể thao bền bỉ, pin lâu và phù hợp dã ngoại.', N''),
(N'Huawei Watch GT 4', 5490000, 20, @WatchId, N'Smartwatch pin lâu, thiết kế đẹp và theo dõi sức khỏe tốt.', N''),
(N'Huawei Watch Fit 3', 2990000, 25, @WatchId, N'Đồng hồ thông minh nhẹ, màn hình sáng và nhiều chế độ tập luyện.', N''),
(N'Xiaomi Redmi Watch 4', 2490000, 28, @WatchId, N'Smartwatch giá tốt, màn hình lớn và pin dùng nhiều ngày.', N''),
(N'Amazfit GTR 4', 4990000, 16, @WatchId, N'Đồng hồ thông minh pin lâu, GPS tốt và thiết kế cổ điển.', N''),
(N'Amazfit Bip 5', 1990000, 30, @WatchId, N'Smartwatch phổ thông, màn hình lớn và theo dõi sức khỏe cơ bản.', N''),
(N'Fitbit Versa 4', 5990000, 13, @WatchId, N'Đồng hồ theo dõi sức khỏe, giấc ngủ và luyện tập hằng ngày.', N''),
(N'Fitbit Sense 2', 6990000, 10, @WatchId, N'Smartwatch tập trung sức khỏe, stress và giấc ngủ.', N''),
(N'Coros Pace 3', 5990000, 9, @WatchId, N'Đồng hồ chạy bộ nhẹ, GPS tốt và pin rất lâu.', N''),
(N'Haylou Solar Plus', 1290000, 35, @WatchId, N'Smartwatch giá rẻ, pin ổn và đủ tính năng thông báo cơ bản.', N''),

-- Tablet
(N'iPad Air M2', 18900000, 14, @TabletId, N'Máy tính bảng gọn nhẹ cho học tập, giải trí và ghi chú.', N''),
(N'Samsung Galaxy Tab S9', 19990000, 13, @TabletId, N'Tablet Android cao cấp với màn hình AMOLED và bút S Pen.', N''),
(N'Xiaomi Pad 6', 8990000, 22, @TabletId, N'Tablet giá tốt với màn hình tần số quét cao và hiệu năng ổn định.', N''),
(N'Lenovo Tab P12', 11990000, 17, @TabletId, N'Tablet màn hình lớn phục vụ học online, xem phim và làm việc nhẹ.', N''),
(N'iPad Pro 11 M4', 28990000, 8, @TabletId, N'Tablet Apple mạnh mẽ, màn hình đẹp và phù hợp sáng tạo nội dung.', N''),
(N'iPad Pro 13 M4', 38990000, 6, @TabletId, N'Tablet cao cấp màn hình lớn, hiệu năng mạnh cho đồ họa và video.', N''),
(N'iPad Gen 10', 10990000, 20, @TabletId, N'Tablet Apple dễ dùng cho học tập, ghi chú và giải trí.', N''),
(N'iPad Mini 6', 13990000, 14, @TabletId, N'Tablet nhỏ gọn, dễ cầm và phù hợp đọc sách, ghi chú nhanh.', N''),
(N'Samsung Galaxy Tab S9 Plus', 23990000, 10, @TabletId, N'Tablet Android cao cấp, màn hình lớn và bút S Pen tiện lợi.', N''),
(N'Samsung Galaxy Tab S9 Ultra', 29990000, 7, @TabletId, N'Tablet màn hình rất lớn, phù hợp đa nhiệm và sáng tạo.', N''),
(N'Samsung Galaxy Tab A9 Plus', 6490000, 24, @TabletId, N'Tablet phổ thông màn hình lớn, pin tốt và giải trí ổn.', N''),
(N'Xiaomi Pad 6S Pro', 13990000, 12, @TabletId, N'Tablet hiệu năng cao, màn hình mượt và sạc nhanh.', N''),
(N'Xiaomi Redmi Pad Pro', 6990000, 21, @TabletId, N'Tablet giá tốt, màn hình lớn và phù hợp học tập giải trí.', N''),
(N'Lenovo Tab M11', 4990000, 26, @TabletId, N'Tablet học tập cơ bản, pin ổn và màn hình đủ rộng.', N''),
(N'Lenovo Yoga Tab 13', 14990000, 9, @TabletId, N'Tablet màn hình lớn, loa tốt và phù hợp xem phim.', N''),
(N'Huawei MatePad 11.5', 8990000, 16, @TabletId, N'Tablet màn hình mượt, thiết kế mỏng và hỗ trợ ghi chú.', N''),
(N'Huawei MatePad Pro 13.2', 24990000, 6, @TabletId, N'Tablet cao cấp màn hình lớn, mỏng nhẹ và hiệu năng tốt.', N''),
(N'OPPO Pad 2', 11990000, 13, @TabletId, N'Tablet Android thiết kế đẹp, màn hình sắc nét và pin tốt.', N''),
(N'Nokia T21', 4490000, 23, @TabletId, N'Tablet bền, pin ổn và phù hợp học online cơ bản.', N''),
(N'Microsoft Surface Go 4', 16990000, 8, @TabletId, N'Tablet Windows nhỏ gọn, phù hợp ghi chú và công việc nhẹ.', N'');

UPDATE @Products
SET ImageUrl = CONCAT(
    N'https://tse.mm.bing.net/th?w=360&h=360&c=7&rs=1&p=0&dpr=1&pid=1.7&mkt=vi-VN&q=',
    REPLACE(Name, N' ', N'%20'),
    N'%20official%20product%20photo'
)
WHERE ImageUrl = N'';

MERGE dbo.Products AS target
USING @Products AS source
ON target.Name = source.Name
WHEN MATCHED THEN
    UPDATE SET
        Price = source.Price,
        Stock = source.Stock,
        CategoryId = source.CategoryId,
        Description = source.Description,
        ImageUrl = source.ImageUrl
WHEN NOT MATCHED THEN
    INSERT (Name, Price, Stock, CategoryId, Description, ImageUrl)
    VALUES (source.Name, source.Price, source.Stock, source.CategoryId, source.Description, source.ImageUrl);

COMMIT TRANSACTION;

SELECT c.Name AS CategoryName, COUNT(*) AS ProductCount
FROM dbo.Products p
JOIN dbo.Categories c ON c.Id = p.CategoryId
WHERE c.Name IN (N'Điện thoại', N'Laptop', N'Smartwatch', N'Tablet')
GROUP BY c.Name
ORDER BY c.Name;
