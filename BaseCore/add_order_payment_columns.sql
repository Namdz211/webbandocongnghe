USE BaseCoreSales;
GO

IF COL_LENGTH(N'dbo.Orders', N'PaymentMethod') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD PaymentMethod NVARCHAR(50) NOT NULL
        CONSTRAINT DF_Orders_PaymentMethod DEFAULT (N'counter');
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'PaymentStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD PaymentStatus NVARCHAR(50) NOT NULL
        CONSTRAINT DF_Orders_PaymentStatus DEFAULT (N'PayAtCounter');
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'PaymentCode') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD PaymentCode NVARCHAR(50) NOT NULL
        CONSTRAINT DF_Orders_PaymentCode DEFAULT (N'');
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'PaymentNote') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD PaymentNote NVARCHAR(500) NOT NULL
        CONSTRAINT DF_Orders_PaymentNote DEFAULT (N'Thanh toán trực tiếp tại quầy hoặc văn phòng khi đến nhận/xác nhận đơn.');
END;
GO

UPDATE dbo.Orders
SET
    PaymentMethod = ISNULL(NULLIF(PaymentMethod, N''), N'counter'),
    PaymentStatus = ISNULL(NULLIF(PaymentStatus, N''), N'PayAtCounter'),
    PaymentCode = ISNULL(NULLIF(PaymentCode, N''), CONCAT(N'LEGACY-', Id)),
    PaymentNote = ISNULL(NULLIF(PaymentNote, N''), N'Thanh toán trực tiếp tại quầy hoặc văn phòng khi đến nhận/xác nhận đơn.');
GO
