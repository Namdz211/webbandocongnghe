import { useEffect } from 'react';

const ADMIN_ASSET_MARK = 'data-admin-layout-asset';

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

export default function AdminAssets() {
    useEffect(() => {
        document.body.classList.add('hold-transition', 'sidebar-mini');

        const createdAssets = [
            ...stylesheets.map(appendStylesheet),
            ...scripts.map(appendScript),
        ];

        return () => {
            document.body.classList.remove('hold-transition', 'sidebar-mini');
            createdAssets.forEach((asset) => asset.remove());
        };
    }, []);

    return null;
}
