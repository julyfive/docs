import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "無人問津 の 言",
    description: "A VitePress Site",
    srcDir: './src',
    base: '/', // 替换为你的仓库名

    head: [ // 新增 head 配置
        // 設置標籤頁圖標
        ['link', {rel: 'icon', href: '/avatar.png'}],
        // 如果你的文件是 favicon.ico，就把 href 改成 '/favicon.ico'
        [
            'meta',
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
            }
        ]
    ],
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        siteTitle: '無言 の coder', // siteTitle: false,
        logo: '/avatar.png',
        outline: {
            label: '目录'
        },
        // editLink: {
        //     pattern: 'https://github.com/julyfive/vitepress',
        //     text: 'Edit this page on GitLab'
        // },
        lastUpdated: {
            text: 'Updated Date',
            // 你可以自定义格式化函数
            formatOptions: {
                forceLocale: true,
            }
        },
        nav: [
            {text: 'Home', link: '/'},
            {text: '琐碎', link: '/knowledge/theme', activeMatch: '/knowledge/'},
            {
                text: 'Rust', link: '/rust/', activeMatch: '/rust'
            },
            {
                text: '前端', activeMatch: '/frontend/', // 去掉 link: '/frontend/',
                items: [
                    {
                        // 该部分的标题
                        // text: '基础',
                        items: [
                            {text: '三剑客', link: '/frontend/base/'},
                        ]
                    }, {
                        // 该部分的标题
                        // text: '框架',
                        items: [
                            {text: 'React', link: '/frontend/react'},
                            {text: 'Next', link: '/frontend/next'},
                            {text: 'Vue', link: '/frontend/vue'},
                            {text: 'Svelte', link: '/frontend/svelte'}
                        ]
                    }
                ]
            },
            {
                text: '后端', activeMatch: '/backend/', //去掉  link: '/backend/',
                items: [
                    {
                        // 该部分的标题
                        // text: 'Node',
                        items: [
                            {text: 'node', link: '/backend/node/'},
                        ]
                    }, {
                        // text: 'Node框架',
                        items: [
                            {text: 'express', link: '/backend/express/'},
                            {text: 'nest', link: '/backend/nest/'},
                        ]
                    }, {
                        // text: 'rust',
                        items: []
                    }
                ]
            },
        ],


        sidebar: {
            // 当路径以 /markdown-knowledge 开头时显示的侧边栏
            '/knowledge/':
                [
                    {
                        // text: '知识点',
                        items: [
                            {text: '主题切换', link: '/knowledge/theme'},
                        ]
                    }
                ],
            // 当路径以 /multicolored/ 开头时显示的侧边栏
            '/multicolored/': [
                {
                    text: '五彩项目',
                    items: [
                        {text: '项目 A', link: '/multicolored/project-a'},
                        {text: '项目 B', link: '/multicolored/project-b'}
                    ]
                }
            ],
            // 当路径以 /rust/ 开头时显示的侧边栏
            '/rust/': [
                {
                    text: '分类',
                    items: [
                        {text: '基础命令', link: '/rust/base.md'},
                    ]
                }
            ],
            // 当路径以 /frontend/ 开头时显示的侧边栏
            '/frontend/base/': [
                // {text: 'html', link: '/frontend/html/'},
                {
                    text: '分类',
                    items: [
                        {text: 'HTMl', link: '/frontend/base/html.md'},
                        {text: 'CSS', link: '/frontend/base/css.md'},
                        {text: 'SCSS', link: '/frontend/base/scss.md'},
                        {text: 'JS', link: '/frontend/base/js.md'},
                    ]
                },
            ]
        }
        ,

        socialLinks: [
            {icon: 'github', link: 'https://github.com/julyfive/vitepress'}
        ],
        footer:
            {
                message: 'Released under the MIT License.',
                copyright: 'Copyright © 2026 硕',
            }
    }
})