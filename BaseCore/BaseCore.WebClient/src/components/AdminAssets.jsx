import { useEffect } from 'react';

const ADMIN_ASSET_MARK = 'data-admin-layout-asset';
const ADMIN_ROOT_CLASS = 'admin-layout-active';

const stylesheets = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css',
];

const adminScaleFix = `
html.${ADMIN_ROOT_CLASS} {
    font-size: 16px;
}

html.${ADMIN_ROOT_CLASS} .modal.fade.show {
    opacity: 1;
}

html.${ADMIN_ROOT_CLASS} .modal.fade.show .modal-dialog {
    transform: none;
}

html.${ADMIN_ROOT_CLASS} .modal-backdrop.fade.show {
    opacity: 0.5;
}

html.${ADMIN_ROOT_CLASS} .dropdown-menu.show {
    display: block;
}
`;

function appendStylesheet(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(ADMIN_ASSET_MARK, 'true');
    document.head.appendChild(link);
    return link;
}

function appendStyle(css) {
    const style = document.createElement('style');
    style.textContent = css;
    style.setAttribute(ADMIN_ASSET_MARK, 'true');
    document.head.appendChild(style);
    return style;
}

function clearBlockingOverlays() {
    document
        .querySelectorAll('.modal-backdrop, #sidebar-overlay, .dropdown-backdrop')
        .forEach((overlay) => overlay.remove());

    document.body.classList.remove('modal-open', 'sidebar-open');
    document.body.style.removeProperty('padding-right');
}

export default function AdminAssets() {
    useEffect(() => {
        clearBlockingOverlays();
        document.documentElement.classList.add(ADMIN_ROOT_CLASS);
        document.body.classList.add('hold-transition', 'sidebar-mini');

        const createdAssets = [
            ...stylesheets.map(appendStylesheet),
            appendStyle(adminScaleFix),
        ];

        return () => {
            clearBlockingOverlays();
            document.documentElement.classList.remove(ADMIN_ROOT_CLASS);
            document.body.classList.remove('hold-transition', 'sidebar-mini', 'sidebar-collapse');
            createdAssets.forEach((asset) => asset.remove());
        };
    }, []);

    return null;
}
