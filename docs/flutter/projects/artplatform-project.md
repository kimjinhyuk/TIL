# 인공지능 아트 플랫폼

### 관련 pubs

* cupertino_icons: ^1.0.2
  * 기본 아이콘셋
* provider: ^6.0.2
  * 상태관리
* fluttertoast: ^8.0.9
  * 상황별 alert
* confetti: ^0.6.0 
  * 이미지 생성시 꽃가루 효과
   
<br/><br/><br/>


## Atom Project  

![Landing Page](https://artmon-vue.s3.ap-northeast-2.amazonaws.com/dist/img/atom/Screen+Shot+2022-04-29+at+4.23.06+PM.png)
<br/><br/><br/>


## Screen Shots

| Landing                                                                                                                  | Caricature                                                                                                                   | Art Style                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [<img src="https://artmon-vue.s3.ap-northeast-2.amazonaws.com/dist/img/atom/main_01.png" width="260" height="480" />](#) | [<img src="https://artmon-vue.s3.ap-northeast-2.amazonaws.com/dist/img/atom/caricalture.png" width="260" height="480" />](#) | [<img src="https://artmon-vue.s3.ap-northeast-2.amazonaws.com/dist/img/atom/styletransfer.png" width="260" height="480" />](#) |

| Cartoon                                                                                                                     | Loading                                                                                                                  | Result                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| [<img src="https://artmon-vue.s3.ap-northeast-2.amazonaws.com/dist/img/atom/cartoon_01.png" width="260" height="480" />](#) | [<img src="https://artmon-vue.s3.ap-northeast-2.amazonaws.com/dist/img/atom/loading.png" width="260" height="480" />](#) | [<img src="https://artmon-vue.s3.ap-northeast-2.amazonaws.com/dist/img/atom/result_01.png" width="260" height="480" />](#) |

<br/><br/><br/>

## File Structure

Within the download you'll find the following directories and files:

```
AATOM/

├── android - setting for android (there is no iOS setting)
├── assets
│   ├── fonts                          // muli font
│   ├── icons                          // vectors
│   ├── images                         // all images used app
│   └── nfts                           // for first gallery
├── lib
│   ├── components
│   │   ├── before_after.dart           // for the result page to compare original pic and result pic
│   │   ├── bg_image.dart               // default bg_image
│   │   ├── blur_container.dart         // for blur container
│   │   ├── bottom_bar.dart             // default bottom_bar
│   │   ├── elevated_button.dart        // default elevated_button
│   │   ├── server_request.dart         // for REST API request
│   │   └── etc                         // for changed plan
│   ├── model
│   │   ├── style_transfer_models.dart
│   ├── screen
│   │   ├── home                        // main page
│   │   │   └── components
│   │   │          └── detail           // each menu item
│   │   ├── generate                    // generate image
│   │   ├── result                      // result page
│   │   ├── setting                     // configurations
│   │   └── etc                         // for changed plan
│   └── main.dart                       // main
└── pubspec.yaml                        // all the packages

```

## Build

1. git clone https://hwahee@bitbucket.org/hellomond/aatom-flutter.git
2. flutter pub get
3. flutter run  

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />