// https://vitepress.dev/guide/custom-theme
import { h, } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ParticleBg from '../../src/components/ParticleBg.vue'
import Fireworks from "../../src/components/Fireworks.vue";
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      // 注入到整个布局的最底部
      'layout-bottom': () => [ h(ParticleBg)]
    })
  },
  enhanceApp({ app, router, siteData }) {
    // ...
  }
} satisfies Theme
