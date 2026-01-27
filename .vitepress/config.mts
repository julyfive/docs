import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "無人問津 の 言",
    description: "A VitePress Site",
    srcDir: './src',
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
            {text: '前端', link: '/frontend/', activeMatch: '/frontend/'},
            {text: '后端', link: '/backend/', activeMatch: '/backend/'},
            {text: '案例', link: '/examples/', activeMatch: '/examples/'},
            {text: '五彩世界', link: '/multicolored/', activeMatch: '/multicolored/'}
        ],

        sidebar: {
            // 当路径以 /markdown-examples 开头时显示的侧边栏
            '/examples/':
                [
                    {
                        text: '案例详情',
                        items: [
                            {text: 'Markdown Examples', link: '/examples/markdown-examples'},
                            {text: 'Runtime API Examples', link: '/examples/api-examples'}
                        ]
                    }
                ],
            // 当路径以 /multicolored/ 开头时显示的侧边栏
            '/multicolored/':
                [
                    {
                        text: '五彩项目',
                        items: [
                            {text: '项目 A', link: '/multicolored/project-a'},
                            {text: '项目 B', link: '/multicolored/project-b'}
                        ]
                    }
                ]
        }
        ,

        socialLinks: [
            {icon: 'github', link: 'https://github.com/julyfive/vitepress'}
        ],
        footer:
            {
                message: 'Released under the MIT License.',
                copyright:
                    'Copyright © 2026 coder s'
            }
    }
})