import { defineConfig } from 'vitepress';
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
      label: '目录',
      level: [2, 4] // 显示 h2~h4
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
      { text: '闲言', link: '/essay/', activeMatch: '/essay/' },
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
            text: '基础',
            items: [
              { text: 'html', link: '/frontend/html/' },
              { text: 'css', link: '/frontend/css/' },
              { text: 'js', link: '/frontend/js/' }
            ]
          },
          {
            // 该部分的标题
            text: '框架',
            items: [
              { text: 'react', link: '/frontend/react' },
              { text: 'next', link: '/frontend/next' },
              { text: 'vue', link: '/frontend/vue' },
              { text: 'svelte', link: '/frontend/svelte' }
            ]
          }
        ]
      }
    ],

    sidebar: {
      // 当路径以 /markdown开头时显示的侧边栏
      '/essay/': [
        {
          // text: '知识点',
          items: [
            { text: '常用软件下载地址', link: '/essay/downLink' },
            { text: 'node环境安装', link: '/essay/node' }
          ]
        }
      ],
      // 当路径以 /rust/ 开头时显示的侧边栏
      '/rust/': [
        {
          text: '分类',
          items: [
            { text: '基础', link: '/rust/base.md' },
            { text: '数据类型', link: '/rust/dataType.md' },
            { text: '控制流', link: '/rust/controlFlow.md' },
            { text: 'Slice', link: '/rust/slice.md' },
            { text: 'Struct', link: '/rust/struct.md' },
            { text: 'Enum', link: '/rust/enum.md' },
            { text: '代码组织', link: '/rust/codeOrg.md' },
            { text: 'Vector', link: '/rust/vector.md' }
          ]
        }
      ],
      // 当路径以 /wgpu/ 开头时显示的侧边栏
      '/wgpu/': [
        {
          text: '分类',
          items: [
            { text: '项目 A', link: '/wgpu/project-a' },
            { text: '项目 B', link: '/wgpu/project-b' }
          ]
        }
      ],
      '/bevy/': [
        {
          text: '分类',
          items: [
            { text: '项目 A', link: '/bevy/project-a' },
            { text: '项目 B', link: '/bevy/project-b' }
          ]
        }
      ],
      '/database/': [
        {
          text: '分类',
          items: [
            { text: '常用命令', link: '/database/commands' },
            { text: '项目 B', link: '/database/project-b' }
          ]
        }
      ],
      '/frontend/html/': [
        {
          text: '分类',
          items: [
            { text: 'html', link: '/frontend/html/html' },
            { text: 'h5', link: '/frontend/html/h5' }
          ]
        }
      ],
      '/frontend/css/': [
        {
          text: '分类',
          items: [
            { text: 'css', link: '/frontend/css/css' },
            { text: 'scss', link: '/frontend/css/scss' }
          ]
        }
      ],
      '/frontend/js/': [
        {
          text: '分类',
          items: [
            { text: 'js', link: '/frontend/js/js' },
            { text: 'es6', link: '/frontend/js/es6' }
          ]
        }
      ],
      '/frontend/react/': [
        {
          text: '分类',
          items: [
            { text: 'react', link: '/frontend/react/react' },
            { text: 'next', link: '/frontend/react/next' }
          ]
        }
      ],
      '/frontend/vue/': [
        {
          text: '分类',
          items: [
            { text: 'vue', link: '/frontend/vue/vue' },
            { text: 'svelte', link: '/frontend/vue/svelte' }
          ]
        }
      ],
      '/frontend/svelte/': [
        {
          text: '分类',
          items: [{ text: 'svelte', link: '/frontend/svelte/svelte' }]
        }
      ],
      '/frontend/next/': [
        {
          text: '分类',
          items: [{ text: 'next', link: '/frontend/next/next' }]
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
