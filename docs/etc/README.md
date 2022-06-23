# 기타 개발문서
![til-image](../images/etc-image.png)
기타 개발에 관련한 모든 기록 저장소

:::info
OS 별 환경설정이라던지, 개발에 관련된 뉴스를 기록하는 곳이 될 예정
:::

## 현재 개발 환경

OS : Mac   
Terminal : ZSH - iTerm, Hyper   
IDE : VSCODE   

Default shell : ZSH
* Install oh-my-zsh
```sh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
```
* Config oh-my-zsh
[agnoster Github 페이지](https://github.com/ohmyzsh/ohmyzsh/wiki/Themes#agnoster)에서 다른 테마 확인
```sh
vim ~/.zshrc

# theme
agnoster

# alias ohmyzsh="mate ~/.oh-my-zsh"
prompt_context() {
  # Custom (Random emoji)
  emojis=("⚡️" "🔥" "🇰 " "👑" "😎" "🐸" "🐵" "🦄" "🌈" "🍻" "🚀" "💡" "🎉" "🔑"  "🚦" "🌙")
  RAND_EMOJI_N=$(( $RANDOM % ${#emojis[@]} + 1))
  prompt_segment black default "Jin${emojis[$RAND_EMOJI_N]}"
}
```
* zsh 플러그인 설치   
```sh
#zsh-autosuggestions
git clone https://github.com/zsh-users/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions

#zsh-highlighting
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git $ZSH_CUSTOM/plugins/zsh-syntax-highlighting

#.zshrc
plugins=( git zsh-autosuggestions zsh-syntax-highlighting )

Alternatively, you can use the `defineConfig` helper at which should provide intellisense without the need for jsdoc annotations:
```

* 필요한 Software 설치를 위해 brew 설치
```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
[Homebrew](https://brew.sh/index_ko)자세한 내용 참고

<script setup>
  import Comment from '../.vitepress/components/Comment.vue'
</script>
<Comment />