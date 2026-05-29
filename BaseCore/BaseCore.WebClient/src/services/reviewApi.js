import apiClient from './apiClient';

const extractProducts = (data) => {
    if (Array.isArray(data)) return data;
    return data?.items || data?.data || [];
};

const getProductId = (product) => product?.id ?? product?.Id;

const normalizeReview = (review, product) => ({
    id: review.id ?? review.Id,
    productId: review.productId ?? review.ProductId ?? getProductId(product),
    productName: product?.name ?? product?.Name ?? 'Unknown product',
    userId: review.userId ?? review.UserId ?? review.customerUserName ?? review.CustomerUserName,
    userName: review.customerName ?? review.CustomerName ?? review.customerUserName ?? review.CustomerUserName ?? 'Unknown',
    rating: review.rating ?? review.Rating,
    comment: review.comment ?? review.Comment ?? review.content ?? review.Content,
    createdDate: review.createdDate ?? review.CreatedDate ?? review.createdAt ?? review.CreatedAt,
});

const applyFilters = (reviews, params = {}) => {
    const search = String(params.search || '').trim().toLowerCase();
    const rating = params.rating ? Number(params.rating) : null;
    const negativeOnly = Boolean(params.negativeOnly);

    let result = reviews.filter((review) => {
        const matchesSearch = !search || [
            review.productName,
            review.userName,
            review.comment,
        ].some((value) => String(value || '').toLowerCase().includes(search));

        const matchesRating = !rating || Number(review.rating) === rating;
        const matchesNegative = !negativeOnly || Number(review.rating) <= 3;
        return matchesSearch && matchesRating && matchesNegative;
    });

    switch (params.sortBy) {
        case 'oldest':
            result = result.sort((a, b) => new Date(a.createdDate || 0) - new Date(b.createdDate || 0));
            break;
        case 'rating_desc':
            result = result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
            break;
        case 'rating_asc':
            result = result.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0));
            break;
        default:
            result = result.sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
            break;
    }

    return result;
};

const getSummary = (reviews) => ({
    totalReviews: reviews.length,
    averageRating: reviews.length
        ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1))
        : 0,
    negativeCount: reviews.filter((review) => Number(review.rating || 0) <= 3).length,
});

export const reviewApi = {
    getAll: async (params = {}) => {
        const productsResponse = await apiClient.get('/products');
        const products = extractProducts(productsResponse.data);
        const reviewResults = await Promise.allSettled(
            products
                .filter((product) => getProductId(product))
                .map(async (product) => {
                    const response = await apiClient.get(`/products/${getProductId(product)}/reviews`);
                    return (response.data?.items || []).map((review) => normalizeReview(review, product));
                }),
        );

        const allReviews = reviewResults
            .filter((result) => result.status === 'fulfilled')
            .flatMap((result) => result.value);
        const filteredReviews = applyFilters(allReviews, params);
        const page = Number(params.page || 1);
        const pageSize = Number(params.pageSize || 10);
        const startIndex = (page - 1) * pageSize;

        return {
            ...productsResponse,
            data: {
                items: filteredReviews.slice(startIndex, startIndex + pageSize),
                totalCount: filteredReviews.length,
                summary: getSummary(allReviews),
            },
        };
    },
    delete: () => Promise.reject({
        response: {
            data: {
                message: 'Backend hiện tại chưa hỗ trợ xóa đánh giá từ trang admin.',
            },
        },
    }),
};
