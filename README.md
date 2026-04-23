# BaseCore FW

Hệ thống này là phiên bản đã ghép giữa backend `FW/BaseCore` và giao diện storefront theo phong cách Electro. Dữ liệu người dùng và nghiệp vụ chính đã được chuyển sang SQL Server để dùng chung một cơ sở dữ liệu `BaseCoreSales`.

## Thành phần chính

- `BaseCore/BaseCore.APIService`: API sản phẩm, danh mục, đơn hàng
- `BaseCore/BaseCore.AuthService`: đăng nhập, đăng ký, user, role
- `BaseCore/BaseCore.ApiGateway`: gateway Ocelot
- `BaseCore/WebClient`: storefront React + Vite
- `BaseCore/create_full_system_sqlserver.sql`: script tạo đầy đủ schema và seed dữ liệu
- `BaseCore/force_recreate_BaseCoreSales.sql`: script xóa sạch DB cũ và tạo lại DB mới

## Yêu cầu môi trường

- .NET 8 SDK
- Node.js 18+
- SQL Server hoặc LocalDB

## Cấu hình database

Hiện tại `APIService` và `AuthService` đều đang dùng connection string trong `appsettings.json`:

```json
"ConnectionStrings": {
  "ConnectedDb": "Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog=BaseCoreSales;Integrated Security=True;Trust Server Certificate=True"
}
```

Nếu bạn dùng SQL Server khác máy hoặc instance khác, sửa cả 2 file:

- `BaseCore/BaseCore.APIService/appsettings.json`
- `BaseCore/BaseCore.AuthService/appsettings.json`

## Tạo database

### Trường hợp làm mới hoàn toàn

1. Chạy file `BaseCore/force_recreate_BaseCoreSales.sql`
2. Chạy tiếp file `BaseCore/create_full_system_sqlserver.sql`

Script `create_full_system_sqlserver.sql` sẽ:

- tạo các bảng auth, role, token, module
- tạo bảng `Categories`, `Products`, `Orders`, `OrderDetails`
- seed user mẫu, role mẫu, module mẫu
- seed danh mục và sản phẩm để storefront hiển thị danh sách sản phẩm

### Trường hợp chỉ muốn bổ sung dữ liệu

Bạn có thể chạy lại `BaseCore/create_full_system_sqlserver.sql`. Phần seed danh mục và sản phẩm đã được viết theo kiểu thiếu thì thêm, nên sẽ không chèn trùng theo tên sản phẩm.

## Tài khoản mẫu

Sau khi seed xong, có thể dùng:

- `admin / admin123`

Lưu ý: tài khoản seed đang dùng dữ liệu đơn giản để thuận tiện demo. Không dùng nguyên cấu hình này cho production.

## Cách chạy hệ thống

Mở 3 terminal riêng.

### 1. Chạy APIService

```powershell
cd BaseCore\BaseCore.APIService
dotnet run
```

API mặc định:

- `http://localhost:5001`

Kiểm tra nhanh:

- `http://localhost:5001/api/products?page=1&pageSize=3`
- `http://localhost:5001/api/categories`

### 2. Chạy AuthService

```powershell
cd BaseCore\BaseCore.AuthService
dotnet run
```

Auth mặc định:

- `http://localhost:5002`

### 3. Chạy WebClient

```powershell
cd BaseCore\WebClient
npm install
npm run dev
```

Storefront mặc định:

- `http://localhost:5174`

## Luồng gọi API hiện tại

Trong môi trường dev, `WebClient` đang proxy trực tiếp:

- `/api/products`, `/api/categories`, `/api/orders` -> `http://localhost:5001`
- `/api/auth`, `/api/users`, `/api/roles` -> `http://localhost:5002`

Điều này giúp storefront chạy được ngay cả khi chưa bật `ApiGateway`.

## Khi nào cần chạy Gateway

Nếu bạn muốn test đúng mô hình microservice qua Ocelot thì chạy thêm:

```powershell
cd BaseCore\BaseCore.ApiGateway
dotnet run
```

Gateway mặc định:

- `http://localhost:5000`

Tuy nhiên để xem sản phẩm trên storefront trong quá trình phát triển, gateway không còn là bắt buộc.

## Lỗi thường gặp

### 1. Web không hiện sản phẩm

Nguyên nhân thường là:

- chưa chạy `BaseCore.APIService`
- chưa seed dữ liệu SQL Server
- connection string không trỏ đúng `BaseCoreSales`

Kiểm tra nhanh:

1. Mở `http://localhost:5001/api/products?page=1&pageSize=3`
2. Nếu không ra JSON, lỗi nằm ở backend hoặc database
3. Nếu ra JSON mà web vẫn trống, restart lại Vite bằng `npm run dev`

### 2. Lỗi file `BaseCoreSales.mdf` đã tồn tại

Nếu bạn muốn xóa sạch và làm mới:

1. Chạy `BaseCore/force_recreate_BaseCoreSales.sql`
2. Chạy lại `BaseCore/create_full_system_sqlserver.sql`

### 3. Script chạy nhầm vào `master`

File `create_full_system_sqlserver.sql` đã được thêm `THROW` để dừng sớm nếu không tạo hoặc không chuyển được sang DB `BaseCoreSales`.

## Ghi chú kỹ thuật

- `Order.UserId` đã được đổi sang `string` để khớp với user id từ auth token
- dữ liệu auth trước đây dùng MongoDB đã được chuyển sang SQL Server trong flow hiện tại
- frontend storefront lấy ảnh sản phẩm từ thư mục `BaseCore/WebClient/public/electro/img`

## Thứ tự khởi động khuyến nghị

1. Tạo DB bằng script SQL
2. Chạy `BaseCore.APIService`
3. Chạy `BaseCore.AuthService`
4. Chạy `BaseCore/WebClient`

Nếu muốn, bước tiếp theo có thể là viết thêm:

- script cập nhật dữ liệu sản phẩm riêng
- script backup/restore SQL Server
- hướng dẫn triển khai production
