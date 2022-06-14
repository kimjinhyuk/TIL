export default {
  title: `Jin's Wiki`,
  description: "Jin's wiki for development",

  lastUpdated: true,

  themeConfig: {

    siteTitle: `Jin's Wiki`,

    logo: '/images/j-letter.png',

    nav: nav(),

    sidebar: {
      '/react/': sidebarReact(),
      '/vue/': sidebarVue(),
      '/svelte/': sidebarSvelte(),
      '/typescript/': sidebarTypeScript(),
      '/etc/': sidebarETC()
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kimjinhyuk' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2022-present Jin'
    },

    algolia: {
      appId: '2PYJFF934D',
      apiKey: 'd93ad5208ca649e037e05221699fefd9',
      indexName: 'jindocs'
    },

    lastUpdated: "Last Updated",
  },
}

function nav() {
  return [
    { text: "React", link: "/react/README.md", activeMatch: '/react/' },
    { text: "Vue", link: "/vue/introduction", activeMatch: '/vue/' },
    { text: "Svelte", link: "/svelte/introduction", activeMatch: '/svelte/' },
    { text: "JS/TS", link: "/typescript/introduction", activeMatch: '/typescript/'},
    { text: "기타", link: "/etc/introduction", activeMatch: '/etc/' },
  ]
}

function sidebarReact() {
  return [
    {
      text: 'React',
      collapsible: true,
      items: [
        { text: 'What is VitePress?', link: '/react/what-is-vitepress' },
      ]
    },
    {
      text: 'NextJS',
      collapsible: true,
      items: [
        { text: 'NextJS', link: '/react/markdown' },
      ]
    },
  ]
}

function sidebarVue() {
  return [
    {
      text: 'Vue',
      collapsible: true,
      items: [
        { text: 'Introduction', link: '/vue/introduction' },
        { text: 'App Configs', link: '/vue/app-configs' },
        { text: 'Theme Configs', link: '/vue/theme-configs' },
        { text: 'Frontmatter Configs', link: '/vue/frontmatter-configs' }
      ]
    }
  ]
}

function sidebarSvelte() {
  return [
    {
      text: 'Svelte',
      collapsible: true,
      items: [
        { text: 'Introduction', link: '/svelte/introduction' },
      ]
    }
  ]
}

function sidebarTypeScript() {
  return [
    {
      text: 'TypeScript',
      collapsible: true,
      items: [
        { text: 'Introduction', link: '/typescript/introduction' },
      ]
    }
  ]
}

function sidebarETC() {
  return [
    {
      text: 'ThreeJS',
      collapsible: true,
      items: [
        { text: 'Getting Started', link: '/etc/threejs/getting-started' },
      ]
    }
  ]
}