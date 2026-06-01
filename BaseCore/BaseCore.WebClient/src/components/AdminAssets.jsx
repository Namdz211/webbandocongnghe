import { useEffect } from 'react';

const ADMIN_ASSET_MARK = 'data-admin-layout-asset';
const ADMIN_ROOT_CLASS = 'admin-layout-active';

const stylesheets = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css',
];

const scripts = [
    'https://code.jquery.com/jquery-3.7.1.min.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js',
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
`;

function appendStylesheet(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(ADMIN_ASSET_MARK, 'true');
    document.head.appendChild(link);
    return link;
}

function appendScript(src) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.setAttribute(ADMIN_ASSET_MARK, 'true');
    document.body.appendChild(script);
    return script;
}

function appendStyle(css) {
    const style = document.createElement('style');
    style.textContent = css;
    style.setAttribute(ADMIN_ASSET_MARK, 'true');
    document.head.appendChild(style);
    return style;
}

export default function AdminAssets() {
    useEffect(() => {
        document.documentElement.classList.add(ADMIN_ROOT_CLASS);
        document.body.classList.add('hold-transition', 'sidebar-mini');

        const createdAssets = [
            ...stylesheets.map(appendStylesheet),
            appendStyle(adminScaleFix),
            ...scripts.map(appendScript),
        ];

        return () => {
            document.documentElement.classList.remove(ADMIN_ROOT_CLASS);
            document.body.classList.remove('hold-transition', 'sidebar-mini');
            createdAssets.forEach((asset) => asset.remove());
        };
    }, []);

    return null;
}
