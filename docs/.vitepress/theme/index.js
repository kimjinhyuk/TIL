import DefaultTheme from 'vitepress/theme'
import HomePage from './components/HomePage.vue'
import './home.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
  }
}
