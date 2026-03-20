import { defineConfig } from "vitepress";

export default defineConfig({
  head: [
    [
      "script",
      {
        async: true,
        src: "https://www.googletagmanager.com/gtag/js?id=G-1NXL6S8HF3",
      },
    ],
    [
      "script",
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-1NXL6S8HF3');`,
    ],
  ],

  title: `Jin's Wiki`,
  description: "Jin's wiki for development",
  themeConfig: {
    siteTitle: `Jin's Wiki`,
    logo: "/images/j-letter.png",
    algolia: {
      appId: "2PYJFF934D",
      apiKey: "d93ad5208ca649e037e05221699fefd9",
      indexName: "jindocs",
    },
    nav: nav(),

    sidebar: {
      "/projects/": sidebarProjects(),
    },
    socialLinks: [{ icon: "github", link: "https://github.com/kimjinhyuk" }],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2022-present Jin",
    },
    lastUpdated: "Last Updated",
  },
});

function nav() {
  return [
    { text: "Projects", link: "/projects/README", activeMatch: "/projects/" },
  ];
}

function sidebarProjects() {
  return [
    {
      text: "Projects",
      items: [{ text: "Overview", link: "/projects/README" }],
    },
    {
      text: "진행중",
      collapsible: true,
      items: [
        {
          text: "DRP — AI 드로잉 로봇 플랫폼",
          link: "/projects/drp",
        },
      ],
    },
  ];
}
