# 포트폴리오 사이트 제작 버전 1.0

### 관련스택

* NextJS
* Notion API
* TailwindCSS
* Lottie file



## NextJS 

React 에서는 SPA(Single file Application) 기본적으로 클라이언트 렌더링이 진행되기때문에 SEO(Search Engine Optimization)가유리한 NextJS를 이용



> Next.js를 이용해 데이터가 어디에서 왔는지 관계없이 SSR(Server Side Rendering) React 프로그래밍을 쉽게 구현 할 수 있다. - Nextjs.org

<img src="https://blog.logrocket.com/wp-content/uploads/2019/06/ssr-explanation.png">



<img src="https://blog.logrocket.com/wp-content/uploads/2019/06/csr-explanation.png">

다이어그램에서 SSR이 CSR보다 HTML을 브라우저에 더 빨리 전달할 수 있다고 가정하므로 SSR로 빌드 된 웹 페이지가 CSR로 구축된 페이지보다 성능이 더 뛰어나다고 할 수 있다.

## TailwindCSS

부트스트랩과 비슷하게 `md` `sm` `flex` 와 같이 미리 셋팅된 유틸리티 클래스를 활용하는 방식으로 CSS를 비교적 쉽게(?) 구현 할 수 있다. 사용법만 익히면 생산성을 늘리는데 좋은 프레임워크 이지만 class명이 길어 지기때문에 가독성이 떨어짐

### 명확한 러닝커브

각 스타일간의 클래스명을 익히는데 적응이 되지 않았다면 개발하는 동안 개발문서를 달고 살아야 함

### 설치

[공식문서](https://tailwindcss.com/docs/installation/framework-guides) 에 프레임워크별 설치방법으로 설치

### 기본설정

```javascript
//tailwind.config.js

module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  mode: 'jit',
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
```

다크모드를 적용한 기본적인 설정 방법... [더보기]([Configuration - Tailwind CSS](https://tailwindcss.com/docs/configuration))

## Lottie file

Lottie란 ?

Lottie는 에어비엔비에서 개발한 오픈소스 모바일 라이브러리이다. JSON 기반 애니메이션 파일 형식실시간으로 애니메이션을 랜더링한다. Lottie는 벡터 기반의 애니메이션이다. 벡터는 점과 점을 잇는 선분과 면으로 이루어져 있기 때문에 아무리 확대해도 깨지지 않는다.

[Free Lottie Animation Files, Tools & Plugins - LottieFiles](https://lottiefiles.com/) 공식 웹에서 여러가지 Lottie file을 무료로 다운 받을 수 있다.



## Notion API

노션 Developer 사이트에서 오른쪽 상단 [내 API 통합](https://www.notion.so/my-integrations) 버튼 클릭 후 새API 통합을 만들게 되면 TOKEN 정보를 얻을 수 있다.
데이터베이스ID는 노션 페이지의 url에서 확인 ex) notion.so/<span style="color:red">alkasndlfknasd;lkfn</span>

[Notion API](https://developers.notion.com/reference/retrieve-a-database)를 이용해서 Projects 메뉴를 [Fetch](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props)  

```javascript
// TOKEN과 NOTION 데이터 베이스 ID Import
// 개별적 프로젝트 아이템 컴포넌트
import { TOKEN, DATABASE_ID } from "../config/index"
import ProjectItem from "../components/projects/project-item";

...
<div className="grid grid-cols-1 md:grid-cols-3 p-12 m-4 gap-8">
  {projects.results.map((aProject) => (
    <ProjectItem key={aProject.id} data={aProject} />
  ))}
</div>
...

export async function getStaticProps() {
  const options = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Notion-Version': '2022-02-22',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      page_size: 100
    })
  };
  const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, options)
  const projects = await res.json();
  return {
    props: { projects }, // will be passed to the page component as props
  }
}
```



Tutorial : [개발하는 정대리](https://youtu.be/KvoFvmu5eRo )님의 유튜브 자세한 튜토리얼 

<script setup>
import Comment from '/docs/.vuepress/components/Comment.vue'
</script>
<Comment />