import { defineConfig } from 'vitepress';
const { googleAnalyticsPlugin } = require('@vuepress/plugin-google-analytics')
const { backToTopPlugin } = require('@vuepress/plugin-back-to-top')

export default defineConfig({
  plugins: [
    googleAnalyticsPlugin({
      id: 'G-1NXL6S8HF3',
    }),
    backToTopPlugin()
  ],

  title: `Jin's Wiki`,
  description: "Jin's wiki for development",
  themeConfig: {
    siteTitle: `Jin's Wiki`,
    logo: '/images/j-letter.png',
    algolia: {
      appId: '2PYJFF934D',
      apiKey: '7d597623c11cadef0273b63caea135f3',
      indexName: 'jindocs',
    },
    nav: nav(),

    sidebar: {
      '/react/': sidebarReact(),
      '/vue/': sidebarVue(),
      '/svelte/': sidebarSvelte(),
      '/typescript/': sidebarTypeScript(),
      '/flutter/': sidebarFlutter(),
      '/threejs/': sidebarThreejs(),
      '/etc/': sidebarETC(),
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/kimjinhyuk' }],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2022-present Jin',
    },
    lastUpdated: 'Last Updated',
  },
});

function nav() {
  return [
    { text: 'React', link: '/react/README', activeMatch: '/react/' },
    { text: 'Vue', link: '/vue/README', activeMatch: '/vue/' },
    // { text: 'JS/TS', link: '/typescript/README', activeMatch: '/typescript/' },
    { text: 'Flutter', link: '/flutter/README', activeMatch: '/flutter/' },
    { text: 'ThreeJS', link: '/threejs/README', activeMatch: '/threejs/' },
    { text: '기타', link: '/etc/README', activeMatch: '/etc/' },
  ];
}

function sidebarReact() {
  return [
    {
      text: 'React',
      items: [{ text: 'React 개발자 로드맵', link: '/react/roadmap' }],
    },
    {
      text: 'NextJS',
      collapsible: true,
      items: [{ text: 'NextJS 구축한 portfolio v1', link: '/react/nextjs/portfolio-01' }],
    },
  ];
}

function sidebarVue() {
  return [
    {
      text: 'Vue',
      collapsible: true,
      items: [
        { text: 'ref() vs reactive()', link: '/vue/ref-vs-reactive' },
        { text: 'Theme Configs', link: '/vue/theme-configs' },
        { text: 'Frontmatter Configs', link: '/vue/frontmatter-configs' },
      ],
    },
  ];
}

function sidebarSvelte() {
  return [
    {
      text: 'Svelte',
      collapsible: true,
      items: [{ text: 'Introduction', link: '/svelte/README' }],
    },
  ];
}

function sidebarTypeScript() {
  return [
    {
      text: 'TypeScript',
      collapsible: true,
      items: [{ text: 'Introduction', link: '/typescript/README' }],
    },
  ];
}
function sidebarThreejs() {
  return [
    {
      text: 'ThreeJS',
      collapsible: true,
      items: [
        { text: 'Introduction', link: '/threejs/README' },
        { text: 'Animations', link: '/threejs/animations' },
        { text: 'Cameras', link: '/threejs/cameras' }
      ],
    },
    {
      text: 'React-three-fiber',
      collapsible: true,
      items: [{ text: 'Getting Started', link: '/threejs/r3f/getting-started' }],
    },
  ];
}
function sidebarFlutter() {
  return [
    {
      text: 'Flutter',
      collapsible: true,
      items: [{ text: 'Introduction', link: '/flutter/README' }],
    },
    {
      text: 'Projects',
      collapsible: true,
      items: [{ text: 'First Flutter Project', link: '/flutter/projects/artplatform-project' }],
    },
  ];
}

function sidebarETC() {
  return [
    {
      text: 'Python',
      collapsible: true,
      items: [{ text: 'pipenv', link: '/etc/python/pipenv' }],
    },
    // {
    //   text: 'FastAPI',
    //   collapsible: true,
    //   items: [{ text: 'Getting Started', link: '/etc/threejs/getting-started' }],
    // },
  ];
}
