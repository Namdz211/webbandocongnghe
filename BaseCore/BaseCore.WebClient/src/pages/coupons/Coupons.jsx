import React, { useState, useEffect } from 'react';
import { couponApi } from '../../services';

/**
 * MẬT ĐỘ THÔNG TIN DÀY (VISUAL_DENSITY: 6)
 * Quản lý mã giảm giá chứa nhiều trường dữ liệu phức tạp (code, giá trị, hạn dùng, lượt giới hạn).
 * Sử dụng bảng nhiều cột nhưng phân bổ kích thước và font chữ thích hợp (dùng badge cho mã coupon, text-danger cho giá trị giảm).
 * 
 * ĐỒNG NHẤT HÌNH HỌC (SHAPE CONSISTENCY LOCK)
 * Các badge chứa mã coupon và các nút bấm, input, switch toggle có cấu trúc bo góc đồng nhất.
 * 
 * ĐỘ TƯƠNG PHẢN (CONTRAST RATIO)
 * Các mã hết hạn hoặc đã tắt sẽ được làm mờ đi bằng class `table-secondary` nhằm giúp Admin tập trung vào các mã đang hoạt động.
 * Badge hết hạn màu đỏ nổi bật (`badge-danger`).
 * 
 * TRẠNG THÁI TƯƠNG TÁC (INTERACTIVE STATES)
 * Switch toggle dùng để tắt/bật trực quan trạng thái kích hoạt của mã giảm giá mà không cần mở modal chỉnh sửa.
 */
const Coupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [filterActive, setFilterActive] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const defaultForm = {
        code: '',
        description: '',
        discountType: 'percent',
        discountValue: '',
        maxDiscountAmount: '',
        minOrderAmount: '',
        usageLimit: '',
        startDate: new Date().toISOString().slice(0, 10),
        expiryDate: '',
        isActive: true,
    };
    const [formData, setFormData] = useState(defaultForm);


    useEffect(() => {
        loadCoupons();
    }, [keyword, filterActive]);

    const loadCoupons = async () => {
        setLoading(true);
        try {
            const params = {};
            if (keyword) params.keyword = keyword;
            if (filterActive !== '') params.isActive = filterActive === 'true';
            const response = await couponApi.getAll(params);
            setCoupons(response.data || []);
        } catch (err) {
            console.error('Lỗi tải coupon:', err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (coupon = null) => {
        setError('');
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                code: coupon.code,
                description: coupon.description || '',
                discountType: coupon.discountType || 'percent',
                discountValue: coupon.discountValue,
                maxDiscountAmount: coupon.maxDiscountAmount || '',
                minOrderAmount: coupon.minOrderAmount || '',
                usageLimit: coupon.usageLimit || '',
                startDate: coupon.startDate ? coupon.startDate.slice(0, 10) : '',
                expiryDate: coupon.expiryDate ? coupon.expiryDate.slice(0, 10) : '',
                isActive: coupon.isActive,
            });
        } else {
            setEditingCoupon(null);
            setFormData(defaultForm);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCoupon(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const payload = {
            code: formData.code.trim().toUpperCase(),
            description: formData.description,
            discountType: formData.discountType,
            discountValue: parseFloat(formData.discountValue),
            maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : 0,
            minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : 0,
            usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : 0,
            startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
            expiryDate: new Date(formData.expiryDate).toISOString(),
            isActive: formData.isActive,
        };

        try {
            if (editingCoupon) {
                await couponApi.update(editingCoupon.id, payload);
                setSuccessMsg('Cập nhật mã giảm giá thành công!');
            } else {
                await couponApi.create(payload);
                setSuccessMsg('Tạo mã giảm giá thành công!');
            }
            closeModal();
            loadCoupons();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const handleToggle = async (coupon) => {
        try {
            const res = await couponApi.toggle(coupon.id);
            setSuccessMsg(res.data?.message || 'Đã cập nhật trạng thái');
            loadCoupons();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            alert('Thao tác thất bại');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa mã giảm giá này không?')) return;
        try {
            await couponApi.delete(id);
            setSuccessMsg('Đã xóa mã giảm giá');
            loadCoupons();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            alert(err.response?.data?.message || 'Xóa thất bại');
        }
    };

    const isExpired = (expiryDate) => new Date(expiryDate) < new Date();

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('vi-VN').format(val) + 'đ';

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">
                                <i className="fas fa-ticket-alt mr-2 text-warning"></i>
                                Quản lý Mã Giảm Giá
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {successMsg && (
                        <div className="alert alert-success alert-dismissible">
                            <i className="fas fa-check-circle mr-2"></i>{successMsg}
                        </div>
                    )}

                    <div className="card">
                        <div className="card-header">
                            <div className="row align-items-center">
                                <div className="col-md-6">
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Tìm theo mã hoặc mô tả..."
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                        />
                                        <div className="input-group-append">
                                            <select
                                                className="form-control"
                                                value={filterActive}
                                                onChange={(e) => setFilterActive(e.target.value)}
                                                style={{ borderRadius: '0 4px 4px 0' }}
                                            >
                                                <option value="">Tất cả trạng thái</option>
                                                <option value="true">Đang hoạt động</option>
                                                <option value="false">Đã tắt</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6 text-right">
                                    <button className="btn btn-success" onClick={() => openModal()}>
                                        <i className="fas fa-plus mr-1"></i> Thêm Mã Giảm Giá
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card-body p-0">
                            {/* TRẠNG THÁI TẢI DỮ LIỆU (LOADING STATE): hiển thị spinner mượt màu vàng thương hiệu */}
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-warning"></div>
                                    <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
                                </div>
                            ) : coupons.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    {/* TRẠNG THÁI TRỐNG (EMPTY STATE): icon vé giảm giá nhạt để thông báo trực quan */}
                                    <i className="fas fa-ticket-alt fa-3x mb-3" style={{ opacity: 0.3 }}></i>
                                    <p>Chưa có mã giảm giá nào trong hệ thống</p>
                                </div>
                            ) : (
                                <table className="table table-hover table-striped mb-0">
                                    <thead className="thead-dark">
                                        <tr>
                                            <th>Mã</th>
                                            <th>Mô tả</th>
                                            <th>Giảm giá</th>
                                            <th>Đơn tối thiểu</th>
                                            <th>Lượt dùng</th>
                                            <th>Hạn dùng</th>
                                            <th className="text-center">Trạng thái</th>
                                            <th className="text-center">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {coupons.map(coupon => (
                                            /* ĐỘ TƯƠNG PHẢN (CONTRAST RATIO): làm mờ dòng bằng class `table-secondary` nếu coupon bị tắt hoặc hết hạn */
                                            <tr key={coupon.id} className={!coupon.isActive || isExpired(coupon.expiryDate) ? 'table-secondary' : ''}>
                                                <td>
                                                    <span className="badge badge-dark" style={{ fontSize: '13px', letterSpacing: 1 }}>
                                                        {coupon.code}
                                                    </span>
                                                </td>
                                                <td style={{ maxWidth: 200 }}>
                                                    <small>{coupon.description || '—'}</small>
                                                </td>

                                                <td>
                                                    <span className="text-danger font-weight-bold">
                                                        {coupon.discountType === 'percent'
                                                            ? `-${coupon.discountValue}%`
                                                            : `-${formatCurrency(coupon.discountValue)}`}
                                                    </span>
                                                    {coupon.discountType === 'percent' && coupon.maxDiscountAmount > 0 && (
                                                        <small className="text-muted d-block">
                                                            Tối đa {formatCurrency(coupon.maxDiscountAmount)}
                                                        </small>
                                                    )}
                                                </td>
                                                <td>
                                                    {coupon.minOrderAmount > 0
                                                        ? <small>{formatCurrency(coupon.minOrderAmount)}</small>
                                                        : <small className="text-muted">Không giới hạn</small>}
                                                </td>
                                                <td>
                                                    <span>{coupon.usedCount}</span>
                                                    {coupon.usageLimit > 0 && (
                                                        <span className="text-muted">/{coupon.usageLimit}</span>
                                                    )}
                                                    {coupon.usageLimit === 0 && (
                                                        <small className="text-muted d-block">Không giới hạn</small>
                                                    )}
                                                </td>
                                                <td>
                                                    <small>{formatDate(coupon.startDate)} → {formatDate(coupon.expiryDate)}</small>
                                                    {isExpired(coupon.expiryDate) && (
                                                        <span className="badge badge-danger ml-1">Hết hạn</span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <div className="custom-control custom-switch">
                                                        <input
                                                            type="checkbox"
                                                            className="custom-control-input"
                                                            id={`toggle-${coupon.id}`}
                                                            checked={coupon.isActive}
                                                            onChange={() => handleToggle(coupon)}
                                                        />
                                                        <label className="custom-control-label" htmlFor={`toggle-${coupon.id}`}>
                                                            {coupon.isActive
                                                                ? <span className="badge badge-success">Hoạt động</span>
                                                                : <span className="badge badge-secondary">Đã tắt</span>}
                                                        </label>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        className="btn btn-sm btn-info mr-1"
                                                        title="Chỉnh sửa"
                                                        onClick={() => openModal(coupon)}
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        title="Xóa"
                                                        onClick={() => handleDelete(coupon.id)}
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="card-footer text-muted">
                            Tổng: <strong>{coupons.length}</strong> mã giảm giá
                        </div>
                    </div>
                </div>
            </section>

            {/* THIẾT KẾ LAYOUT MODAL (MODAL LAYOUT)
                Sử dụng kích thước rộng (modal-lg) vì có nhiều trường thông tin cấu hình mã giảm giá phức tạp.
                Phần Header modal màu vàng đặc trưng (bg-warning) tạo điểm nhấn rõ nét và thu hút sự chú ý.
                Các form-group phân bổ cân đối trên lưới Grid (col-md-6, col-md-4) để tránh rối mắt. */}
            {showModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-warning">

                                <h5 className="modal-title">
                                    <i className="fas fa-ticket-alt mr-2"></i>
                                    {editingCoupon ? 'Chỉnh sửa Mã Giảm Giá' : 'Thêm Mã Giảm Giá Mới'}
                                </h5>
                                <button type="button" className="close" onClick={closeModal}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger">{error}</div>}

                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label>Mã Coupon <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control text-uppercase font-weight-bold"
                                                    placeholder="VD: SALE50, NEWUSER20"
                                                    value={formData.code}
                                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                    required
                                                    maxLength={50}
                                                />
                                                <small className="text-muted">Tự động chuyển thành chữ hoa</small>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label>Mô tả</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="VD: Giảm 10% cho đơn đầu tiên"
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    maxLength={200}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col-md-4">
                                            <div className="form-group">
                                                <label>Loại giảm giá <span className="text-danger">*</span></label>
                                                <select
                                                    className="form-control"
                                                    value={formData.discountType}
                                                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                                >
                                                    <option value="percent">Phần trăm (%)</option>
                                                    <option value="fixed">Số tiền cố định (VND)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="form-group">
                                                <label>
                                                    Giá trị giảm <span className="text-danger">*</span>
                                                    <small className="text-muted ml-1">
                                                        ({formData.discountType === 'percent' ? '% tối đa 100' : 'VND'})
                                                    </small>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder={formData.discountType === 'percent' ? 'VD: 10' : 'VD: 50000'}
                                                    value={formData.discountValue}
                                                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                                    required
                                                    min="1"
                                                    max={formData.discountType === 'percent' ? 100 : undefined}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="form-group">
                                                <label>
                                                    Giảm tối đa (VND)
                                                    <small className="text-muted ml-1">(cho % giảm, 0 = không giới hạn)</small>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="VD: 100000"
                                                    value={formData.maxDiscountAmount}
                                                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                                                    min="0"
                                                    disabled={formData.discountType === 'fixed'}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label>Đơn hàng tối thiểu (VND)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="0 = không giới hạn"
                                                    value={formData.minOrderAmount}
                                                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label>Giới hạn lượt dùng</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="0 = không giới hạn"
                                                    value={formData.usageLimit}
                                                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label>Ngày bắt đầu <span className="text-danger">*</span></label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={formData.startDate}
                                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label>Ngày hết hạn <span className="text-danger">*</span></label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={formData.expiryDate}
                                                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                                    required
                                                    min={formData.startDate}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <div className="custom-control custom-switch">
                                            <input
                                                type="checkbox"
                                                className="custom-control-input"
                                                id="isActiveSwitch"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            />
                                            <label className="custom-control-label" htmlFor="isActiveSwitch">
                                                Kích hoạt ngay sau khi tạo
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-warning">
                                        <i className="fas fa-save mr-1"></i>
                                        {editingCoupon ? 'Cập nhật' : 'Tạo Mã Giảm Giá'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {showModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default Coupons;
