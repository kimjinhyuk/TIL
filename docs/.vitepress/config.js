const { googleAnalyticsPlugin } = require('@vuepress/plugin-google-analytics')

export default {
  title: `Jin's Wiki`,
  description: "Jin's wiki for development",

  themeConfig: {
    siteTitle: `Jin's Wiki`,
    logo: '/images/j-letter.png',
    nav: nav(),

    sidebar: {
      '/react/': sidebarReact(),
      '/vue/': sidebarVue(),
      '/svelte/': sidebarSvelte(),
      '/typescript/': sidebarTypeScript(),
      '/flutter/': sidebarFlutter(),
      '/etc/': sidebarETC(),
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/kimjinhyuk' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2022-present Jin',
    },

    algolia: {
      apiKey: 'd93ad5208ca649e037e05221699fefd9',
      indexName: 'jindocs',
      appId: '2PYJFF934D',
    },

    lastUpdated: 'Last Updated',
  },
  plugins: [
    googleAnalyticsPlugin({
      id: 'G-1NXL6S8HF3',
    }),
  ]
};

function nav() {
  return [
    { text: 'React', link: '/react/README', activeMatch: '/react/' },
    { text: 'Vue', link: '/vue/README', activeMatch: '/vue/' },
    // { text: 'Svelte', link: '/svelte/README', activeMatch: '/svelte/' },
    { text: 'JS/TS', link: '/typescript/README', activeMatch: '/typescript/' },
    { text: 'Flutter', link: '/flutter/README', activeMatch: '/flutter/' },
    { text: '기타', link: '/etc/README', activeMatch: '/etc/' },
  ];
}

function sidebarReact() {
  return [
    {
      text: 'React',
      items: [],
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
      text: 'ThreeJS',
      collapsible: true,
      items: [{ text: 'Getting Started', link: '/etc/threejs/getting-started' }],
    },
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
