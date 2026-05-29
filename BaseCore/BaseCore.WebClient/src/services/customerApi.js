import apiClient from './apiClient';

const completedStatuses = new Set(['completed']);

const getValue = (source, camelKey, pascalKey) => source?.[camelKey] ?? source?.[pascalKey];

const getOrderCustomerKey = (order) => {
    return (
        getValue(order, 'userId', 'UserId') ||
        getValue(order, 'customerEmail', 'CustomerEmail') ||
        getValue(order, 'customerPhone', 'CustomerPhone') ||
        getValue(order, 'customerUserName', 'CustomerUserName') ||
        `guest-${getValue(order, 'id', 'Id')}`
    );
};

const getSegment = (completedOrders, totalSpent) => {
    if (completedOrders >= 5 || totalSpent >= 50000000) return 'VIP';
    if (completedOrders >= 3 || totalSpent >= 20000000) return 'Loyal';
    if (completedOrders >= 2 || totalSpent >= 10000000) return 'Potential';
    if (completedOrders === 1) return 'New';
    return 'NoOrders';
};

const getSuggestedOffer = (segment) => {
    switch (segment) {
        case 'VIP':
            return 'Ưu đãi VIP hoặc mã giảm giá cao cấp';
        case 'Loyal':
            return 'Mã giảm giá tri ân khách thân thiết';
        case 'Potential':
            return 'Ưu đãi khuyến khích mua lại';
        case 'New':
            return 'Mã giảm giá cho đơn tiếp theo';
        default:
            return 'Ưu đãi chào mừng khách mới';
    }
};

const aggregateCustomers = (orders) => {
    const customerMap = new Map();

    (orders || []).forEach((order) => {
        const key = getOrderCustomerKey(order);
        const status = String(getValue(order, 'status', 'Status') || '').toLowerCase();
        const orderDate = getValue(order, 'orderDate', 'OrderDate');
        const totalAmount = Number(getValue(order, 'totalAmount', 'TotalAmount') || 0);

        if (!customerMap.has(key)) {
            customerMap.set(key, {
                userId: key,
                userName: getValue(order, 'customerUserName', 'CustomerUserName') || key,
                name: getValue(order, 'customerName', 'CustomerName') || '',
                email: getValue(order, 'customerEmail', 'CustomerEmail') || '',
                phone: getValue(order, 'customerPhone', 'CustomerPhone') || '',
                totalOrders: 0,
                completedOrders: 0,
                totalSpent: 0,
                lastOrderDate: orderDate,
                orders: [],
            });
        }

        const customer = customerMap.get(key);
        customer.orders.push(order);
        customer.totalOrders += 1;

        if (completedStatuses.has(status)) {
            customer.completedOrders += 1;
            customer.totalSpent += totalAmount;
        }

        if (orderDate && (!customer.lastOrderDate || new Date(orderDate) > new Date(customer.lastOrderDate))) {
            customer.lastOrderDate = orderDate;
        }
    });

    return Array.from(customerMap.values()).map((customer) => {
        const segment = getSegment(customer.completedOrders, customer.totalSpent);
        return {
            ...customer,
            segment,
            suggestedOffer: getSuggestedOffer(segment),
        };
    });
};

const filterCustomers = (customers, params = {}) => {
    const keyword = String(params.keyword || '').trim().toLowerCase();
    const segment = String(params.segment || '').trim();

    return customers.filter((customer) => {
        const matchesKeyword = !keyword || [
            customer.name,
            customer.userName,
            customer.email,
            customer.phone,
        ].some((value) => String(value || '').toLowerCase().includes(keyword));

        const matchesSegment = !segment || customer.segment === segment;
        return matchesKeyword && matchesSegment;
    });
};

export const customerApi = {
    getAll: async (params) => {
        const response = await apiClient.get('/orders/all');
        const customers = filterCustomers(aggregateCustomers(response.data || []), params);
        return { ...response, data: customers };
    },
    getById: async (id) => {
        const response = await apiClient.get('/orders/all');
        const customers = aggregateCustomers(response.data || []);
        const customer = customers.find((item) => String(item.userId) === String(id));

        return {
            ...response,
            data: {
                customer,
                orders: customer?.orders || [],
            },
        };
    },
};
