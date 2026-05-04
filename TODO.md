# TODO: Order Delivery Management & Vietnamese Status Translation

## Plan approved by user. Progress: 4/10

**High-level steps from approved plan:**
- [x] 1. Create `add_order_delivery_columns.sql` migration script
- [x] 2. Update `BaseCore.Entities/Order.cs` with new delivery fields
- [x] 3. Update `BaseCore.Services/IOrderService.cs` & `OrderService.cs` with new methods
- [x] 4. Update `BaseCore.APIService/Controllers/OrdersController.cs` with new endpoints/logic
- [x] 4.5 Update `BaseCore.WebClient/src/services/api.js` with new orderApi methods
5. Update `BaseCore.WebClient/src/pages/Orders.jsx`: Vietnamese statuses + delivery UI/actions
6. Update any OrderRepository if needed
7. Test: Run SQL migration
8. Test: Frontend npm run dev, check /orders delivery features
9. Test: Backend API endpoints (assign-transport, update-delivery)
10. Final test flow + attempt_completion

**Next:** Update frontend Orders.jsx

