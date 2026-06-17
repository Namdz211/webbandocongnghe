import React, { useState, useEffect } from 'react';
import { AlertMessage, LoadingState, PageHeader } from '../../components/common';
import { reviewApi } from '../../services';
import { useAuth } from '../../auth/AuthContext';

// anti-slop guidelines:
// - VISUAL_DENSITY: 6 - Thiết kế danh sách đánh giá sản phẩm với mật độ thông tin trung bình, hiển thị rõ nội dung bình luận.
// - SHAPE CONSISTENCY LOCK: Định dạng các badge và bo góc card đồng nhất.
// - ERROR / LOADING STATES: Quản lý chi tiết lỗi tải đánh giá.
// - CONTRAST RATIO: Sử dụng nền đỏ nhạt cho các bình luận tiêu cực (rating <= 2) để Admin dễ nhận biết.
const Reviews = () => {
    const [reviews, setReviews] = useState([]);
    const [summary, setSummary] = useState({
        totalReviews: 0,
        averageRating: 0,
        negativeCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filters & Pagination State
    const [search, setSearch] = useState('');
    const [rating, setRating] = useState('');
    const [negativeOnly, setNegativeOnly] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const { isAdmin } = useAuth();

    useEffect(() => {
        loadReviews();
        // eslint-disable-next-line
    }, [page, rating, negativeOnly, sortBy]);

    const loadReviews = async () => {
        setLoading(true);
        setError('');
        try {
            const params = {
                search: search || undefined,
                rating: rating ? parseInt(rating) : undefined,
                negativeOnly: negativeOnly ? true : undefined,
                sortBy,
                page,
                pageSize
            };
            const response = await reviewApi.getAll(params);
            setReviews(response.data?.items || []);
            setTotalCount(response.data?.totalCount || 0);
            if (response.data?.summary) {
                setSummary(response.data.summary);
            }
        } catch (error) {
            console.error('Failed to load reviews:', error);
            setError('Không thể tải danh sách đánh giá.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        loadReviews();
    };

    const handleResetFilters = () => {
        setSearch('');
        setRating('');
        setNegativeOnly(false);
        setSortBy('newest');
        setPage(1);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này không? Bình luận này sẽ bị xóa vĩnh viễn.')) return;

        try {
            await reviewApi.delete(id);
            loadReviews();
        } catch (error) {
            alert(error.response?.data?.message || 'Xóa đánh giá thất bại.');
        }
    };

    const renderStars = (ratingValue) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= ratingValue) {
                stars.push(<i key={i} className="fas fa-star text-warning mr-1"></i>);
            } else {
                stars.push(<i key={i} className="far fa-star text-muted mr-1"></i>);
            }
        }
        return stars;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="content-wrapper">
            <PageHeader title="Quản lý đánh giá sản phẩm" />

            <section className="content">
                <div className="container-fluid">
                    
                    {/* Summary Cards */}
                    <div className="row">
                        <div className="col-lg-4 col-6">
                            <div className="small-box bg-info shadow-sm">
                                <div className="inner">
                                    <h3>{summary.totalReviews}</h3>
                                    <p>Tổng số đánh giá</p>
                                </div>
                                <div className="icon">
                                    <i className="fas fa-comments"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-lg-4 col-6">
                            <div className="small-box bg-success shadow-sm">
                                <div className="inner">
                                    <h3>
                                        {summary.averageRating} <span style={{ fontSize: '1.2rem' }}>/ 5</span>
                                    </h3>
                                    <p>Điểm đánh giá trung bình</p>
                                </div>
                                <div className="icon">
                                    <i className="fas fa-star"></i>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-4 col-12">
                            <div className="small-box bg-danger shadow-sm">
                                <div className="inner">
                                    <h3>{summary.negativeCount}</h3>
                                    <p>Đánh giá tiêu cực (≤ 3 sao)</p>
                                </div>
                                <div className="icon">
                                    <i className="fas fa-thumbs-down"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Card */}
                    <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '10px' }}>
                        <div className="card-header bg-white border-0 pb-0">
                            <h3 className="card-title font-weight-bold text-secondary">
                                <i className="fas fa-filter mr-2"></i> Bộ lọc & Tìm kiếm
                            </h3>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSearchSubmit}>
                                <div className="row align-items-end">
                                    <div className="col-md-3">
                                        <div className="form-group mb-2">
                                            <label className="text-muted small font-weight-bold">Tìm kiếm</label>
                                            <input 
                                                type="text" 
                                                className="form-control form-control-sm" 
                                                placeholder="Sản phẩm, khách hàng, nội dung..." 
                                                value={search} 
                                                onChange={(e) => setSearch(e.target.value)} 
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <div className="form-group mb-2">
                                            <label className="text-muted small font-weight-bold">Số sao</label>
                                            <select 
                                                className="form-control form-control-sm"
                                                value={rating}
                                                onChange={(e) => {
                                                    setRating(e.target.value);
                                                    setPage(1);
                                                }}
                                                disabled={negativeOnly}
                                            >
                                                <option value="">Tất cả sao</option>
                                                <option value="5">5 sao</option>
                                                <option value="4">4 sao</option>
                                                <option value="3">3 sao</option>
                                                <option value="2">2 sao</option>
                                                <option value="1">1 sao</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="form-group mb-2">
                                            <label className="text-muted small font-weight-bold">Sắp xếp theo</label>
                                            <select 
                                                className="form-control form-control-sm"
                                                value={sortBy}
                                                onChange={(e) => {
                                                    setSortBy(e.target.value);
                                                    setPage(1);
                                                }}
                                            >
                                                <option value="newest">Đánh giá mới nhất</option>
                                                <option value="oldest">Đánh giá cũ nhất</option>
                                                <option value="rating_desc">Sao từ cao đến thấp</option>
                                                <option value="rating_asc">Sao từ thấp đến cao</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <div className="form-group mb-3 text-left">
                                            <div className="custom-control custom-switch">
                                                <input 
                                                    type="checkbox" 
                                                    className="custom-control-input" 
                                                    id="negativeOnlySwitch"
                                                    checked={negativeOnly}
                                                    onChange={(e) => {
                                                        setNegativeOnly(e.target.checked);
                                                        if (e.target.checked) setRating('');
                                                        setPage(1);
                                                    }}
                                                />
                                                <label className="custom-control-label small font-weight-bold text-danger cursor-pointer" htmlFor="negativeOnlySwitch">
                                                    Chỉ tiêu cực (≤ 3★)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-2 d-flex mb-2">
                                        <button type="submit" className="btn btn-primary btn-sm flex-fill mr-1">
                                            <i className="fas fa-search mr-1"></i> Tìm
                                        </button>
                                        <button type="button" className="btn btn-secondary btn-sm flex-fill" onClick={handleResetFilters}>
                                            <i className="fas fa-undo mr-1"></i> Đặt lại
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white border-0 pb-0">
                            <h3 className="card-title font-weight-bold text-primary">
                                <i className="fas fa-star mr-2"></i> Danh sách đánh giá ({totalCount})
                            </h3>
                        </div>
                        <div className="card-body">
                            <AlertMessage>{error}</AlertMessage>
                            
                            {loading ? (
                                <LoadingState />
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped table-hover align-middle">
                                        <thead className="thead-light">
                                            <tr>
                                                <th style={{ width: '60px' }} className="text-center">ID</th>
                                                <th>Sản phẩm</th>
                                                <th style={{ width: '180px' }}>Khách hàng</th>
                                                <th style={{ width: '130px' }} className="text-center">Đánh giá</th>
                                                <th>Nội dung bình luận</th>
                                                <th style={{ width: '150px' }} className="text-center">Ngày gửi</th>
                                                {isAdmin() && <th style={{ width: '80px' }} className="text-center">Xóa</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reviews.length === 0 ? (
                                                <tr>
                                                    <td colSpan={isAdmin() ? 7 : 6} className="text-center py-4 text-muted">
                                                        Không tìm thấy đánh giá nào phù hợp.
                                                    </td>
                                                </tr>
                                            ) : (
                                                reviews.map(review => (
                                                    <tr 
                                                        key={review.id} 
                                                        style={review.rating <= 2 ? { backgroundColor: 'rgba(220, 53, 69, 0.04)' } : {}}
                                                    >
                                                        <td className="text-center font-weight-bold">{review.id}</td>
                                                        <td>
                                                            <a href={`/product-details-link-tbd-or-modal`} onClick={(e) => e.preventDefault()} className="font-weight-bold text-dark">
                                                                {review.productName}
                                                            </a>
                                                            <small className="d-block text-muted">Mã SP: {review.productId}</small>
                                                        </td>
                                                        <td>
                                                            <span className="font-weight-bold">{review.userName}</span>
                                                            <small className="d-block text-muted">{review.userId}</small>
                                                        </td>
                                                        <td className="text-center">
                                                            <div className="d-block">{renderStars(review.rating)}</div>
                                                            <small className="badge badge-light border mt-1">
                                                                {review.rating} sao
                                                            </small>
                                                        </td>
                                                        <td style={{ wordBreak: 'break-word', minWidth: '220px' }}>
                                                            {review.comment ? (
                                                                <span className={review.rating <= 2 ? 'text-danger font-weight-medium' : ''}>
                                                                    {review.comment}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted font-italic">Không có nội dung bình luận</span>
                                                            )}
                                                        </td>
                                                        <td className="text-center text-muted small">{formatDate(review.createdDate)}</td>
                                                        {isAdmin() && (
                                                            <td className="text-center">
                                                                <button
                                                                    className="btn btn-sm btn-danger shadow-xs"
                                                                    onClick={() => handleDelete(review.id)}
                                                                    title="Xóa bình luận tiêu cực"
                                                                >
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination */}
                            {!loading && totalPages > 1 && (
                                <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center px-0">
                                    <div className="text-muted small">
                                        Hiển thị trang {page} / {totalPages} (Tổng cộng {totalCount} đánh giá)
                                    </div>
                                    <nav aria-label="Điều hướng phân trang">
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                                <button 
                                                    className="page-link" 
                                                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={page === 1}
                                                >
                                                    <i className="fas fa-chevron-left"></i>
                                                </button>
                                            </li>
                                            
                                            {[...Array(totalPages)].map((_, i) => (
                                                <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                                                    <button className="page-link" onClick={() => setPage(i + 1)}>
                                                        {i + 1}
                                                    </button>
                                                </li>
                                            ))}

                                            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                                <button 
                                                    className="page-link" 
                                                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                                    disabled={page === totalPages}
                                                >
                                                    <i className="fas fa-chevron-right"></i>
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Reviews;
