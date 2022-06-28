export default {
  title: `Jin's Wiki`,
  description: "Jin's wiki for development",

  lastUpdated: true,
  ga: '{G-1NXL6S8HF3}',

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
      appId: '2PYJFF934D',
      apiKey: 'abd72f6e9e469b20ba3f78536ffb6cc2',
      indexName: 'jindocs',
    },

    lastUpdated: 'Last Updated',
  },
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
        { text: 'Introduction', link: '/vue/README' },
        { text: 'App Configs', link: '/vue/app-configs' },
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
