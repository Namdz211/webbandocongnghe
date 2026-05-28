-- ============================================================
-- Script tạo bảng Coupons (Mã giảm giá / Voucher)
-- Cú pháp SQL SERVER
-- ============================================================

IF OBJECT_ID('dbo.Coupons', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Coupons (
        Id                INT             NOT NULL IDENTITY(1,1),
        Code              NVARCHAR(50)    NOT NULL,
        Description       NVARCHAR(200)   NOT NULL DEFAULT '',
        DiscountType      NVARCHAR(10)    NOT NULL DEFAULT 'percent',  -- 'percent' hoặc 'fixed'
        DiscountValue     DECIMAL(18,2)   NOT NULL,
        MaxDiscountAmount DECIMAL(18,2)   NOT NULL DEFAULT 0,
        MinOrderAmount    DECIMAL(18,2)   NOT NULL DEFAULT 0,
        UsageLimit        INT             NOT NULL DEFAULT 0,
        UsedCount         INT             NOT NULL DEFAULT 0,
        StartDate         DATETIME        NOT NULL DEFAULT GETDATE(),
        ExpiryDate        DATETIME        NOT NULL,
        IsActive          BIT             NOT NULL DEFAULT 1,
        CreatedAt         DATETIME        NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_Coupons PRIMARY KEY (Id),
        CONSTRAINT UQ_Coupons_Code UNIQUE (Code)
    );

    PRINT 'Tạo bảng Coupons thành công.';
END
ELSE
BEGIN
    PRINT 'Bảng Coupons đã tồn tại, bỏ qua.';
END
GO

-- Seed dữ liệu mẫu (chỉ chạy nếu bảng trống)
IF NOT EXISTS (SELECT 1 FROM dbo.Coupons)
BEGIN
    INSERT INTO dbo.Coupons (Code, Description, DiscountType, DiscountValue, MaxDiscountAmount, MinOrderAmount, UsageLimit, StartDate, ExpiryDate, IsActive)
    VALUES
        (N'WELCOME10', N'Giảm 10% cho đơn hàng đầu tiên',          'percent', 10,    100000, 200000,  100, GETDATE(), DATEADD(YEAR,  1, GETDATE()), 1),
        (N'SALE50K',   N'Giảm cố định 50.000đ cho đơn từ 500.000đ','fixed',   50000, 0,      500000,  200, GETDATE(), DATEADD(MONTH, 6, GETDATE()), 1),
        (N'VIP20',     N'Giảm 20% tối đa 200.000đ cho khách VIP',  'percent', 20,    200000, 1000000, 50,  GETDATE(), DATEADD(MONTH, 3, GETDATE()), 1);

    PRINT 'Seed dữ liệu mẫu thành công.';
END
GO

