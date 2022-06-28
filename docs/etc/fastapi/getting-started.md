# FastAPI 
![til-image](https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png)

## FastAPI 란?   
Sebastián Ramírez이 만든 파이썬 기반 오픈소스 웹 프레임워크로   
FastAPI [깃허브](https://github.com/tiangolo/fastapi) 페이지에 나온 FastAPI 한 줄 요약을 보겠습니다.

> FastAPI is a modern, fast (high-performance), web framework for building APIs with Python 3.6+ based on standard Python type hints.

2022년 `스택오버플로우`에서 진행되는 개발자 [Survey](https://survey.stackoverflow.co/2022/#most-loved-dreaded-and-wanted-webframe-want) 중 `Python` 백엔드 중에서는 많은 비중으로 선호하는 기술로 자리매김한 것을 볼 수 있다.


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