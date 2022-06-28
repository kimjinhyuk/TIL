# pipenv

## 설치   
::: info
`pipenv`는 파이썬에서도 패키지단위로 관리를 할 수 있도록 도와주는 고급 패키지 관리도구 이면서, 프로젝트 별로 격리된 가상 환경(virtual environment)을 구성할 수 있도록 하게 해준다.
:::

## 파이썬의 패키지 매니저
프론트 엔드 에서는 `npm` `yarn` 등 패키지 관리 도구(package manager)가 있고, python 에서는 `pip`라는 간단한 패키지 매니저가 있음. 기본적으로 패키지가 전역(global)으로 설치가 되는데 로컬에서 여러 프로젝트를 걸쳐 작업을 하기 위해서는 `가상환경`을 구성해서 개발을 진행.

## pipenv 설치   

Mac을 사용하고 있어 `Homebrew`를 이용하여 간단하게 `pipenv` 를 설치 한다.   
```sh
brew install pipenv
```   
Mac을 사용하지 않는다면 `pip`을 이용하여 `pipenv` 를 설치 한다.   
```sh
pip install pipenv
```   
## 가상환경 구성   

프로젝트 폴더로 이동한뒤, 가상 환경에서 사용할 파이썬 버전을 `--python` 옵션에 명시하여 `pipenv` 커맨드를 실행

```sh
# 프로젝트 생성
mkdir prac-python
cd prac-python
pipenv --python 3.9
     
Creating a virtualenv for this project...
Pipfile: /Users/jin/prac-python/Pipfile
Using /opt/homebrew/bin/python3.9 (3.9.13) to create virtualenv...
⠼ Creating virtual environment...created virtual environment CPython3.9.13.final.0-64 in 321ms
  creator CPython3Posix(dest=/Users/jin/.local/share/virtualenvs/11-Tu71cjGs, clear=False, no_vcs_ignore=False, global=False)
  seeder FromAppData(download=False, pip=bundle, setuptools=bundle, wheel=bundle, via=copy, app_data_dir=/Users/jin/Library/Application Support/virtualenv)
    added seed packages: pip==22.1.2, setuptools==62.3.4, wheel==0.37.1
  activators BashActivator,CShellActivator,FishActivator,NushellActivator,PowerShellActivator,PythonActivator

✔ Successfully created virtual environment! 
Virtualenv location: /Users/jin/.local/share/virtualenvs/11-Tu71cjGs
Creating a Pipfile for this project...

```   

## Pipfile

해당 폴더에 `Pipfile`이 생성되는데, `npm` 에서 `package.json` 처럼 프로젝트의 메타 정보를 확인할 수 있다. 해당 프로젝트에서 사용하는 가상 환경의 위치를 `pipenv --venv`이용하여 확인 할 수 있고, 파이썬 인터프리터의 정확한 위치를 `pipenv --py` 확인 가능   
```sh   
[[source]]
name = "pypi"
url = "https://pypi.org/simple"
verify_ssl = true

[dev-packages]

[packages]

[requires]
python_version = "3.9"
```   
```
pipenv --venv      
/Users/jin/.local/share/virtualenvs/learn-python-1pQ1tZIm

pipenv --py        
/Users/jin/.local/share/virtualenvs/learn-python-1pQ1tZIm/bin/python

```   

## 파이썬 실행
프로젝트에 셋팅된 파이썬 인터프리터는 `pipenv run` 커맨드를 통해 실행

```sh
pipenv run python
```   

## 가상환경사용   

`venv`나 `virtualenv` 처럼 터미널에서 `pipenv shell` 커맨드로 가상환경 활성화   
커맨드 앞에 가상환경의 이름을 확인할 수 있음   
```sh   
pipenv shell     
Launching subshell in virtual environment...
 . /Users/jin/.local/share/virtualenvs/prac-python-1pQ1tZIm/bin/activate

 (prac-python)  Jin🦄  ~/Users/jin/prac-python 
```   
## 가상환경에서 나오기

`exit` 커맨드로 가상환경을 비활성화 시키면 된다.

<script setup>
  import Comment from '../../.vitepress/components/Comment.vue'
</script>
<Comment />