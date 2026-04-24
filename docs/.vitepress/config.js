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
          link: "/projects/drp/",
          items: [
            {
              text: "#00 시스템 개요 & ADR",
              link: "/projects/drp/2026-04-25-00-system-overview-adr",
            },
            {
              text: "#01 Java → Python 마이그레이션",
              link: "/projects/drp/2026-04-25-01-java-to-python-migration",
            },
            {
              text: "#02 JAKA raw TCP/JSON 프로토콜",
              link: "/projects/drp/2026-04-25-02-jaka-raw-tcp-protocol",
            },
          ],
        },
        {
          text: "사내 그룹웨어 / ERP",
          link: "/projects/groupware/",
          items: [
            {
              text: "온프레미스 스택 선택의 이유",
              link: "/projects/groupware/2026-04-24-onprem-erp-stack",
            },
            {
              text: "pgvector 하이브리드 검색",
              link: "/projects/groupware/2026-04-24-pgvector-hybrid-search",
            },
            {
              text: "Gitea Runner × VSCode env 함정",
              link: "/projects/groupware/2026-04-24-gitea-runner-vscode-env-til",
            },
          ],
        },
      ],
    },
  ];
}
