USE BaseCoreSales;
GO

/*
    Order schema sync for SQL Server
    Covers all order-related columns currently used by BaseCore backend:
    - PaymentMethod
    - PaymentStatus
    - PaymentCode
    - PaymentNote
    - TransportUnit
    - DeliveryStatus
    - DeliveryDate
    - TransportTrackingCode

    Safe to run multiple times.
*/

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
        CONSTRAINT DF_Orders_PaymentNote DEFAULT (N'');
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'TransportUnit') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD TransportUnit NVARCHAR(100) NOT NULL
        CONSTRAINT DF_Orders_TransportUnit DEFAULT (N'');
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'DeliveryStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD DeliveryStatus NVARCHAR(100) NOT NULL
        CONSTRAINT DF_Orders_DeliveryStatus DEFAULT (N'Chờ lấy hàng');
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'DeliveryDate') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD DeliveryDate DATETIME2 NULL;
END;
GO

IF COL_LENGTH(N'dbo.Orders', N'TransportTrackingCode') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD TransportTrackingCode NVARCHAR(100) NOT NULL
        CONSTRAINT DF_Orders_TransportTrackingCode DEFAULT (N'');
END;
GO

UPDATE dbo.Orders
SET
    PaymentMethod = ISNULL(NULLIF(PaymentMethod, N''), N'counter'),
    PaymentStatus = ISNULL(NULLIF(PaymentStatus, N''), N'PayAtCounter'),
    PaymentCode = ISNULL(NULLIF(PaymentCode, N''), CONCAT(N'LEGACY-', Id)),
    PaymentNote = ISNULL(PaymentNote, N''),
    TransportUnit = ISNULL(TransportUnit, N''),
    DeliveryStatus = CASE
        WHEN ISNULL(DeliveryStatus, N'') = N'' THEN N'Chờ lấy hàng'
        ELSE DeliveryStatus
    END,
    TransportTrackingCode = ISNULL(TransportTrackingCode, N'');
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_Orders_DeliveryStatus'
      AND object_id = OBJECT_ID(N'dbo.Orders')
)
BEGIN
    CREATE INDEX IX_Orders_DeliveryStatus ON dbo.Orders(DeliveryStatus);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_Orders_TransportUnit'
      AND object_id = OBJECT_ID(N'dbo.Orders')
)
BEGIN
    CREATE INDEX IX_Orders_TransportUnit ON dbo.Orders(TransportUnit);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_Orders_PaymentStatus'
      AND object_id = OBJECT_ID(N'dbo.Orders')
)
BEGIN
    CREATE INDEX IX_Orders_PaymentStatus ON dbo.Orders(PaymentStatus);
END;
GO
