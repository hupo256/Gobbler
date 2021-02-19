Date: 2020.11.17
Author: Tong Dongdong -- aven.tong@qq.com

#### 项目简介

Gobbler --- chrome 游览器插件
基于 react 开发的 web 应用，在 chrome 的环境下运行，帮助用户采集具体页面上的信息，加工后以可视化的形式展示出来
webpack4 + react 多入口，多页面项目

#### 安装

yarn / npm i

#### 开发环境运行

yarn dev / npm run dev
访问: http://127.0.0.1:8089/popup.html

#### 生产环境打包

yarn build / npm run build

#### 项目主要结构

+-- build webpack 打包文件（多入口设置在 base 里）
+-- src
+--assets 静态资源，包括 chrome 游览器插件必须的逻辑文件
+-- bacgound.js 插件的后台转发逻辑
+--pages 具体的多页面
+-- popup 插件弹出页
+-- index.jsx 打包入口
+-- index.html 模块文件
+-- app.jsx 具体业务逻辑

    +-- content_script 插件注入页
        +-- index.jsx 打包入口
        +-- index.html 模块文件
        +-- app.jsx 具体业务逻辑

#### 注意事项

1. node 版本 v10.0 以上
2. src/manifest.json 不是项目所需文件，是插件 chrome 必须配置文件，打包时会统一 copy 到 dist 目录下，合成完整的 chrome 插件包。
3. manifest.json 配置的官方说明 -- https://developer.chrome.com/extensions/manifest
   中文版的是这个 -- https://www.cnblogs.com/liuxianan/p/chrome-plugin-develop.html#manifestjson
