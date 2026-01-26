import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "無人問津 の 言",
    description: "A VitePress Site",
    srcDir: './src',
    publicDir: './public', // 替换为静态资源目录
    base: '/', // 替换为你的仓库名

    head: [ // 新增 head 配置
        // 設置標籤頁圖標
        ['link', {rel: 'icon', href: '/avatar.png'}]
        // 如果你的文件是 favicon.ico，就把 href 改成 '/favicon.ico'
    ],
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        siteTitle: '無言 の coder', // siteTitle: false,
        logo: '/avatar.png',

        nav: [
            {text: 'Home', link: '/'},
            {text: 'Examples', link: '/markdown-examples'},
            {text: '五彩世界', link: '/markdown-examples'}
        ],

        sidebar: [
            {
                text: 'Examples',
                items: [
                    {text: 'Markdown Examples', link: '/markdown-examples'},
                    {text: 'Runtime API Examples', link: '/api-examples'}
                ]
            }
        ],

        socialLinks: [
            {icon: 'github', link: 'https://github.com/julyfive/vitepress'}
        ],
        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2026 coder s'
        }
    }
})