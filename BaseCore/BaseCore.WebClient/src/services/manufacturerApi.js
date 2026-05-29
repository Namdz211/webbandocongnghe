import apiClient from './apiClient';

const normalizeManufacturer = (manufacturer, index) => {
    if (typeof manufacturer === 'string') {
        return { id: manufacturer, name: manufacturer };
    }

    return {
        id: manufacturer.id ?? manufacturer.name ?? index,
        name: manufacturer.name ?? manufacturer.manufacturer ?? String(manufacturer),
    };
};

const unsupportedCrud = () => Promise.reject({
    response: {
        data: {
            message: 'Backend hiện tại chỉ hỗ trợ lấy danh sách hãng từ sản phẩm, chưa hỗ trợ thêm/sửa/xóa hãng riêng.',
        },
    },
});

export const manufacturerApi = {
    getAll: async () => {
        const response = await apiClient.get('/products/manufacturers');
        return {
            ...response,
            data: (response.data || []).map(normalizeManufacturer),
        };
    },
    getById: async (id) => {
        const response = await manufacturerApi.getAll();
        return {
            ...response,
            data: response.data.find((manufacturer) => String(manufacturer.id) === String(id)),
        };
    },
    create: unsupportedCrud,
    update: unsupportedCrud,
    delete: unsupportedCrud,
};
