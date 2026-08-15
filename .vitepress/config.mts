import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: '無人問津 の 言',
  description: 'A VitePress Site',
  srcDir: './src',
  base: '/', // 替换为你的仓库名

  head: [
    // 新增 head 配置
    // 設置標籤頁圖標
    ['link', { rel: 'icon', href: '/avatar.png' }],
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
    siteTitle: '無言', // siteTitle: false,
    logo: '/avatar.png',
    outline: {
      label: '目录'
    },
    // editLink: {
    //     pattern: 'https://github.com/julyfive/vitepress',
    //     text: 'Edit this page on GitLab'
    // },
    lastUpdated: {
      text: '更新时间',
      // 你可以自定义格式化函数
      formatOptions: {
        formatMatcher: 'basic',
        forceLocale: true,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '琐碎', link: '/knowledge/', activeMatch: '/knowledge/' },
      { text: 'Rust', link: '/rust/', activeMatch: '/rust' },
      { text: 'Wgpu', link: '/wgpu/', activeMatch: '/wgpu/' },
      { text: 'Bevy', link: '/bevy/', activeMatch: '/bevy/' },
      { text: '数据库', link: '/database/', activeMatch: '/database/' },
      {
        text: '前端',
        activeMatch: '/frontend/', // 去掉 link: '/frontend/',
        items: [
          {
            // 该部分的标题
            // text: '基础',
            items: [{ text: '三剑客', link: '/frontend/base/' }]
          },
          {
            // 该部分的标题
            // text: '框架',
            items: [
              { text: 'React', link: '/frontend/react' },
              { text: 'Next', link: '/frontend/next' },
              { text: 'Vue', link: '/frontend/vue' },
              { text: 'Svelte', link: '/frontend/svelte' }
            ]
          }
        ]
      },
      {
        text: '后端',
        activeMatch: '/backend/', //去掉  link: '/backend/',
        items: [
          {
            // 该部分的标题
            // text: 'Node',
            items: [{ text: 'node', link: '/backend/node/' }]
          },
          {
            // text: 'Node框架',
            items: [
              { text: 'express', link: '/backend/express/' },
              { text: 'nest', link: '/backend/nest/' }
            ]
          },
          {
            // text: 'rust',
            items: []
          }
        ]
      }
    ],

    sidebar: {
      // 当路径以 /markdown开头时显示的侧边栏
      '/knowledge/': [
        {
          // text: '知识点',
          items: [
            { text: '常用软件下载地址', link: '/knowledge/downLink' },
            { text: '主题切换', link: '/knowledge/theme' }
          ]
        }
      ],
      // 当路径以 /rust/ 开头时显示的侧边栏
      '/rust/': [
        {
          text: '分类',
          items: [
            { text: '基础命令', link: '/rust/base.md' },
            { text: '数据类型', link: '/rust/data_type.md' },
            { text: 'Trait', link: '/rust/trait.md' }
          ]
        }
      ],
      // 当路径以 /wgpu/ 开头时显示的侧边栏
      '/wgpu/': [
        {
          text: '五彩项目',
          items: [
            { text: '项目 A', link: '/wgpu/project-a' },
            { text: '项目 B', link: '/wgpu/project-b' }
          ]
        }
      ],
      '/bevy/': [
        {
          text: 'Bevy项目',
          items: [
            { text: '项目 A', link: '/bevy/project-a' },
            { text: '项目 B', link: '/bevy/project-b' }
          ]
        }
      ],
      '/database/': [
        {
          text: '数据库项目',
          items: [
            { text: '项目 A', link: '/database/project-a' },
            { text: '项目 B', link: '/database/project-b' }
          ]
        }
      ],
      // 当路径以 /frontend/ 开头时显示的侧边栏
      '/frontend/base/': [
        // {text: 'html', link: '/frontend/html/'},
        {
          text: '分类',
          items: [
            { text: 'HTMl', link: '/frontend/base/html.md' },
            { text: 'CSS', link: '/frontend/base/css.md' },
            { text: 'SCSS', link: '/frontend/base/scss.md' },
            { text: 'JS', link: '/frontend/base/js.md' }
          ]
        }
      ]
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/julyfive/docs' }],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 硕'
    }
  }
});