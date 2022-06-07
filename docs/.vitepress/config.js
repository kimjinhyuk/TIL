export default {
  title: `Jin's Wiki`,
  description: "Jin's wiki for development",
  themeConfig: {


    siteTitle: `Jin's Wiki`,

    logo: '/images/j-letter.png',

    nav: [
      { text: "React", link: "/React/" },
      { text: "Vue", link: "/Vue/" },
      { text: "Svelte", link: "/Svelte/" },
      { text: "TS", link: "/TS/" },
      { text: "기타", link: "/etc/" },
    ],

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