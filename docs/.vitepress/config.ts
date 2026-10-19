import { defineConfig } from "vitepress";

/** 站点元信息常量：head 注入与页脚共用 */
const SITE_TITLE = "IoT Deck · 物联网前端开发教程";
const SITE_DESC =
  "面向前端开发者的物联网技术体系化教程：17 章 / 4 大模块，覆盖核心架构、MQTT.js 集成、实时可视化、监控台实战与生产化落地，配套可直接运行的 Vue 3 + MQTT.js + ECharts 示例项目。";
const SOURCE_REPO = "https://github.com/YZhiJie/iot-tutorial-project";
const SITE_URL = "https://yzhijie.github.io/iot-tutorial";
const BASE = process.env.DEPLOY_BASE || "/";

export default defineConfig({
  // GitHub Pages 项目页需要 /iot-tutorial/ 子路径：CI 构建时注入 DEPLOY_BASE；
  // 本地 dev/build 不设该变量，保持根路径 '/'，链接可直接使用
  base: BASE,
  lang: "zh-CN",
  title: SITE_TITLE,
  description: SITE_DESC,
  lastUpdated: true,
  cleanUrls: true,
  // 与 demo 监控台一致的暗色科技风：默认深色，保留外观切换
  appearance: "dark",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${BASE}logo.svg` }],
    ["meta", { name: "theme-color", content: "#0b1220" }],
  ],
  sitemap: {
    hostname: new URL(SITE_URL).origin,
    // VitePress 只取 origin 且不拼 base，需手动把 base 注入每个 url
    transformItems: (items) =>
      BASE === "/"
        ? items
        : items.map((i) => ({
            ...i,
            url: `${BASE}${i.url.replace(/^\//, "")}`.replace(/\/$/, ""),
          })),
  },
  markdown: {
    lineNumbers: true,
    theme: { light: "github-light", dark: "github-dark" },
  },
  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "IoT Deck",
    // 本地全文搜索（内置 minisearch，无需外部服务；离线可用）
    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "搜索文档", buttonAriaLabel: "搜索文档" },
          modal: {
            noResultsText: "没有找到相关结果",
            resetButtonTitle: "清除查询条件",
            footer: {
              selectText: "选择",
              navigateText: "切换",
              closeText: "关闭",
            },
          },
        },
      },
    },
    nav: [
      { text: "首页", link: "/" },
      {
        text: "基础概念篇",
        link: "/part1-fundamentals/1.1-iot-architecture",
        activeMatch: "/part1-fundamentals/",
      },
      {
        text: "技术栈篇",
        link: "/part2-stack/2.1-mqttjs-integration",
        activeMatch: "/part2-stack/",
      },
      {
        text: "项目实战篇",
        link: "/part3-practice/3.1-overview-and-setup",
        activeMatch: "/part3-practice/",
      },
      {
        text: "进阶优化篇",
        link: "/part4-production/4.1-security",
        activeMatch: "/part4-production/",
      },
      {
        text: "资源",
        items: [
          { text: "示例源码 demo", link: `${SOURCE_REPO}/tree/main/demo` },
          { text: "版本与更新日志", link: `${SOURCE_REPO}/releases` },
          { text: "文档维护指南", link: "/maintenance" },
        ],
      },
    ],
    sidebar: [
      {
        text: "第一篇 · 基础概念篇",
        collapsed: false,
        items: [
          {
            text: "1.1 物联网核心架构",
            link: "/part1-fundamentals/1.1-iot-architecture",
          },
          {
            text: "1.2 前端在物联网系统中的角色定位",
            link: "/part1-fundamentals/1.2-frontend-role",
          },
          {
            text: "1.3 物联网通信协议与前端的对接逻辑",
            link: "/part1-fundamentals/1.3-protocols-and-frontend",
          },
        ],
      },
      {
        text: "第二篇 · 技术栈篇",
        collapsed: false,
        items: [
          {
            text: "2.1 MQTT.js 客户端集成与配置",
            link: "/part2-stack/2.1-mqttjs-integration",
          },
          {
            text: "2.2 物联网数据可视化方案",
            link: "/part2-stack/2.2-data-visualization",
          },
          {
            text: "2.3 设备状态实时监控面板开发",
            link: "/part2-stack/2.3-monitoring-dashboard",
          },
          {
            text: "2.4 低功耗设备数据上报处理逻辑",
            link: "/part2-stack/2.4-lowpower-uplink",
          },
        ],
      },
      {
        text: "第三篇 · 项目实战篇",
        collapsed: false,
        items: [
          {
            text: "3.1 实战项目总览与环境搭建",
            link: "/part3-practice/3.1-overview-and-setup",
          },
          {
            text: "3.2 设备列表管理",
            link: "/part3-practice/3.2-device-list",
          },
          {
            text: "3.3 实时数据接收与解析",
            link: "/part3-practice/3.3-realtime-data",
          },
          {
            text: "3.4 设备远程控制指令下发",
            link: "/part3-practice/3.4-remote-control",
          },
          {
            text: "3.5 异常告警触发与展示",
            link: "/part3-practice/3.5-alerts",
          },
          {
            text: "3.6 联调验收与问题排查",
            link: "/part3-practice/3.6-e2e-and-troubleshooting",
          },
        ],
      },
      {
        text: "第四篇 · 进阶优化篇",
        collapsed: false,
        items: [
          {
            text: "4.1 物联网数据安全传输",
            link: "/part4-production/4.1-security",
          },
          {
            text: "4.2 海量设备连接的前端性能优化",
            link: "/part4-production/4.2-performance",
          },
          {
            text: "4.3 断网重连机制实现",
            link: "/part4-production/4.3-reconnection",
          },
          {
            text: "4.4 异常数据容错与生产落地清单",
            link: "/part4-production/4.4-fault-tolerance-checklist",
          },
        ],
      },
      {
        text: "附录",
        collapsed: false,
        items: [{ text: "文档维护指南", link: "/maintenance" }],
      },
    ],
    outline: { label: "本页目录", level: [2, 3] },
    docFooter: { prev: "上一篇", next: "下一篇" },
    lastUpdatedText: "最后更新",
    darkModeSwitchLabel: "外观",
    sidebarMenuLabel: "目录",
    returnToTopLabel: "返回顶部",
    editLink: {
      pattern: `${SOURCE_REPO}/edit/main/docs/:path`,
      text: "在 GitHub 上编辑此页",
    },
    footer: {
      message: "教程内容遵循 CC BY 4.0 协议 · 配套示例代码遵循 MIT 协议",
      copyright: "Copyright © 2026 IoT Deck",
    },
    socialLinks: [{ icon: "github", link: SOURCE_REPO }],
  },
});
