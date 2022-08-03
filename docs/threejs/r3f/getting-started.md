# ThreeJS 

## 설치   
::: tip INFO
React-three-fiber 를 이용한 WebGL 설치
* React-three-fiber 란?
  * Fiber 는 리액트 16.8 버전 이상과 호환 가능
  * three.js를 위한 React용 라이브러리
:::

## Create React App
`create-react-app` 으로 프로젝트를 실행한다.
```sh
# 프로젝트 생성
npx create-react-app my-app
cd my-app

# dependencies 설치
npm install three @react-three/fiber

# 프로젝트 시작
npm run start
```   

## Next.js
NextJS 에서는 `next-transpile-modules` 옵션을 설치해야 제대로 컴파일을 진행 할 수 있다.

```sh   
npm install next-transpile-modules --save-dev
```   
그리고 next.config.js에 transpile 모듈을 추가해준다.


```javascript
const withTM = require('next-transpile-modules')(['three'])
module.exports = withTM()
```   

## Boilerplate 이용하기
::: info
빠르고 간결한 개발 경험을 위해 vite 번들러를 이용한 Boilerplate를 사용   
:::   

```sh   
git clone https://github.com/mattrossman/r3f-vite

cd r3f-vite

yarn
yarn dev
```   
<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />