# IoT Deck —— 面向前端开发者的物联网技术体系化教程

> 📖 **在线文档站（VitePress）**：<https://yzhijie.github.io/iot-tutorial/> —— 支持全文搜索、页面导航与移动端阅读；文档的目录约定、写作模板、链接规范与部署流程见 [文档维护指南](./docs/maintenance.md)。

> 一套从入门到生产落地的物联网前端教程：**17 章 / 4 大模块 / 约 9.6 小时**，配套一个浏览器实测通过的可运行监控台项目（Vue 3 + TypeScript + MQTT.js + ECharts）。

教程核心原则：

- **契约先行**：所有端云消息形态收敛为一份 Topic 契约与 TS 类型定义，前后端共用同一套词汇；
- **真实感数据流**：本地 Broker + 8 台"故障剧本"模拟设备（正常/低功耗批量/温度尖峰/电池衰减/长期离线/运行中掉线/重复报文），不用假数据；
- **生产级模式**：全抖动指数退避重连、入站看门狗、RPC over MQTT、解码容错层（去重/时钟漂移钳制/字段校验）、告警冷却去重——全部有真实实现可对照；
- **每章可验收**：前置知识 / 学习时长 / 运行验证 / 实操任务 / 验收标准五件套齐全。

---

## 这套教程适合谁

- 熟练 Vue 3 / TypeScript / 现代前端工具链，**不了解或不系统了解物联网**的前端工程师；
- 需要开发设备监控台、IoT 大屏、设备管理系统的开发者；
- 想搞懂 MQTT over WebSocket、实时图表性能优化、断线重连等"实时前端"通用问题的开发者（这些能力同样适用于行情/协作/直播类场景）。

学习完你将能独立完成：**一个具备设备列表、实时遥测曲线、远程控制、异常告警四大能力的物联网前端监控与管理系统，并知道如何把它推向生产环境。**

---

## 快速开始（3 步）

环境要求：Node.js ≥ 20.19（实测 v24.17.0）、pnpm（实测 12.10.1）。

```bash
cd demo
pnpm install
```

```bash
# 终端 1：本地 MQTT Broker + 8 台模拟设备
pnpm server
```

```bash
# 终端 2：前端监控台
pnpm dev   # 默认 http://localhost:5173，端口被占用会自动顺延，以终端输出为准
```

打开浏览器即可看到 8 台设备的实时监控台。完整验收清单见 [第 3.1 章](./docs/part3-practice/3.1-overview-and-setup.md)。

---

## 学习路线图

```text
 基础概念篇（认知）          技术栈篇（单点能力）        项目实战篇（组装）           进阶优化篇（生产化）
 ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
 │ 1.1 物联网核心架构 │   │ 2.1 MQTT.js 集成  │   │ 3.1 总览与环境搭建     │   │ 4.1 数据安全传输       │
 │ 1.2 前端角色定位   │ → │ 2.2 数据可视化     │ → │ 3.2 设备列表管理       │ → │ 4.2 海量设备性能优化   │
 │ 1.3 协议与对接逻辑 │   │ 2.3 实时监控面板   │   │ 3.3 实时数据接收解析   │   │ 4.3 断网重连机制       │
 │                  │   │ 2.4 低功耗上报     │   │ 3.4 远程控制指令       │   │ 4.4 容错与生产清单     │
 │                  │   │                   │   │ 3.5 异常告警           │   │                      │
 │                  │   │                   │   │ 3.6 联调验收与排查     │   │                      │
 └─────────────────┘   └──────────────────┘   └──────────────────────┘   └──────────────────────┘
     约 2 小时               约 1.8 小时              约 3.4 小时                约 2.3 小时
```

按顺序学效果最佳；已有 MQTT 经验可从第 2.2 章切入，只关心生产化可直接读第四篇（配套代码都在 demo 中）。

---

## 目录

### 第一篇 · 基础概念篇（约 2 小时）

| 章 | 标题 | 时长 | 内容一句话 |
| --- | --- | --- | --- |
| [1.1](./docs/part1-fundamentals/1.1-iot-architecture.md) | 物联网核心架构 | 40 min | 四层架构、端边云、上/下行链路、术语表（Topic/QoS/Retain/LWT…）、部署形态与规模分级 |
| [1.2](./docs/part1-fundamentals/1.2-frontend-role.md) | 前端在物联网系统中的角色定位 | 35 min | 前端四大职责与边界、接入设备的两条路径对比、技能树 |
| [1.3](./docs/part1-fundamentals/1.3-protocols-and-frontend.md) | 物联网通信协议与前端的对接逻辑 | 45 min | MQTT/CoAP/WebSocket/HTTP 全对比、MQTT over WebSocket 原理、选型决策树 |

### 第二篇 · 技术栈篇（约 1.8 小时）

| 章 | 标题 | 时长 | 内容一句话 |
| --- | --- | --- | --- |
| [2.1](./docs/part2-stack/2.1-mqttjs-integration.md) | MQTT.js 客户端集成与配置 | 25 min | 安装、Vite 集成的 `global` 坑、连接参数逐个讲、订阅/发布、本地联调 |
| [2.2](./docs/part2-stack/2.2-data-visualization.md) | 物联网数据可视化方案（ECharts/Chart.js/G6） | 30 min | 三方案选型、useECharts 生命周期封装、实时曲线的批量刷新策略 |
| [2.3](./docs/part2-stack/2.3-monitoring-dashboard.md) | 设备状态实时监控面板开发 | 30 min | 在线状态三重来源、设备注册表设计、列表/卡片/连接指示器实现 |
| [2.4](./docs/part2-stack/2.4-lowpower-uplink.md) | 低功耗设备数据上报处理逻辑 | 25 min | 批量信封 payload、时钟漂移钳制、报文去重、字段级校验 |

### 第三篇 · 项目实战篇（约 3.4 小时）

| 章 | 标题 | 时长 | 内容一句话 |
| --- | --- | --- | --- |
| [3.1](./docs/part3-practice/3.1-overview-and-setup.md) | 实战项目总览与环境搭建 | 25 min | 架构图、Topic 契约总表、目录树、三步启动、最小闭环验收 |
| [3.2](./docs/part3-practice/3.2-device-list.md) | 设备列表管理 | 35 min | retained 档案注册机制、注册表 store、搜索过滤与产品收敛卡片 |
| [3.3](./docs/part3-practice/3.3-realtime-data.md) | 实时数据接收与解析 | 40 min | 一条遥测的完整旅程（5 环节逐段贴码）、通配符订阅、QoS 策略 |
| [3.4](./docs/part3-practice/3.4-remote-control.md) | 设备远程控制指令下发 | 35 min | RPC over MQTT（id 关联/8s 超时/三态结果）、控制面板状态机 |
| [3.5](./docs/part3-practice/3.5-alerts.md) | 异常告警触发与展示 | 30 min | 三路告警汇流、60s 冷却去重、告警中心/全局横幅/级别语义 |
| [3.6](./docs/part3-practice/3.6-e2e-and-troubleshooting.md) | 联调验收与问题排查 | 40 min | 端到端验收清单、故障排查大表、调试工具箱 |

### 第四篇 · 进阶优化篇（约 2.3 小时）

| 章 | 标题 | 时长 | 内容一句话 |
| --- | --- | --- | --- |
| [4.1](./docs/part4-production/4.1-security.md) | 物联网数据安全传输 | 35 min | 威胁模型、wss/TLS、认证与 ACL、前端侧安全清单 |
| [4.2](./docs/part4-production/4.2-performance.md) | 海量设备连接的前端性能优化 | 40 min | 消息量级估算、demo 已落地策略对照表、Worker 解析/虚拟列表/按需引入 |
| [4.3](./docs/part4-production/4.3-reconnection.md) | 断网重连机制实现 | 35 min | 全抖动指数退避、入站看门狗、重连后 resubscribe 与状态对账 |
| [4.4](./docs/part4-production/4.4-fault-tolerance-checklist.md) | 异常数据容错与生产落地清单 | 30 min | 容错五层、可观测统计、监控埋点、30 条生产 checklist |

---

## 示例项目 demo/

一个可以直接跑起来的设备监控台（前端界面 + 本地 MQTT 基础设施）：

- **设备列表**：8 台设备的在线状态、最新遥测、搜索过滤、详情跳转；
- **实时数据**：MQTT 通配符订阅 → 解码容错 → Pinia 滑窗 → ECharts 实时曲线；
- **远程控制**：开关插座 / 设置阈值 / 重启设备，RPC 语义（回执 + 超时）；
- **异常告警**：设备事件 + 前端看门狗推导双通道，冷却去重、中心处置、全局横幅。

```text
demo/
├── server/                 本地基础设施（Node 端，零构建）
│   ├── broker.mjs          aedes Broker：TCP 1883（设备侧）+ WS 8083/mqtt（前端侧）
│   ├── simulator.mjs       8 台模拟设备：正常/低功耗/温度尖峰/电池衰减/离线/掉线剧本
│   └── index.mjs           一键启动 broker + 设备模拟器
└── src/
    ├── types/iot.ts        消息契约（Topic、payload、指令三态……全部类型）
    ├── config.ts           全局配置（Broker 地址、窗口上限、超时、看门狗阈值）
    ├── services/mqtt/      连接层：topics 契约 / codec 容错解码 / connection 重连 / gateway 门面
    ├── stores/             Pinia：connection / devices（注册表+看门狗）/ alerts（告警中心）
    ├── composables/        useIot 装配层 / useECharts 生命周期封装
    └── views|components/   设备列表 / 设备详情（曲线+控制）/ 告警中心 / 全局横幅与指示器
```

常用脚本（均在 `demo/` 下执行）：

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动前端（Vite，默认 5173） |
| `pnpm server` | 一键启动 Broker + 设备模拟器（开发推荐） |
| `pnpm broker` / `pnpm devices` | 单独启动 Broker / 模拟器（拆开联调用） |
| `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm format` | 质量门禁 |

---

## 技术栈与版本（2026-10 实测）

| 层 | 选型 | 版本 |
| --- | --- | --- |
| 框架 | Vue（Composition API + `<script setup>`） | 3.5.44 |
| 语言 | TypeScript（strict） | 5.9.3 |
| 构建 | Vite + @vitejs/plugin-vue | 8.3.4 / 6.0.10 |
| 状态 | Pinia | 4.1.0 |
| 路由 | Vue Router | 5.4.0 |
| 图表 | ECharts | 6.1.0 |
| MQTT | mqtt.js（浏览器走 WebSocket） | 5.16.1 |
| 本地 Broker | aedes + websocket-stream | 1.2.0 / 5.5.2 |
| 质量 | vue-tsc / ESLint(flat config) / Prettier | 3.3.13 / 9.39.5 / 3.9.10 |

> 选型说明：TypeScript 刻意停留在 5.9 稳定线（TS 7 生态兼容性尚未全面验证）；其余均采用当前主流大版本。教程内所有代码以 demo 实际安装版本为准。

---

## 常见问题

- **必须真实设备吗？** 不需要。模拟设备覆盖了真实世界的常见剧本（含脏数据），全程离线可跑。
- **想接真实 Broker？** 两种方式任选：改 `.env.development` 的 `VITE_MQTT_URL`，或 `localStorage.setItem('iot.mqttUrl', 'wss://your-broker:8084/mqtt')` 后刷新（见 [2.1](./docs/part2-stack/2.1-mqttjs-integration.md) 与 [4.1](./docs/part4-production/4.1-security.md)）。
- **端口被占用？** Vite 会自动顺延端口（5173 → 5174…），以终端输出为准；Broker 端口 1883/8083 被占用需先释放。
- **MQTT 帧在 DevTools 里看到的是乱码？** MQTT over WebSocket 是二进制协议，属正常现象；观察方法见 [1.3](./docs/part1-fundamentals/1.3-protocols-and-frontend.md)。

## 学完之后（扩展方向）

数字孪生（Three.js 3D 机房/工厂）、边缘网关管理面板、OTA 升级前端、规则引擎编排界面、时序数据大屏（DataV 风格）。第四篇的生产清单是所有方向的共同地基。

## 里程碑

- **2026-10-18**：v1.0 —— 17 章教程 + demo（Vue 3.5 / Vite 8 / ECharts 6 / MQTT.js 5），typecheck/build 通过，浏览器实测通过（设备列表、实时推送、图表、控制指令回执、告警、断线自动重连）。
