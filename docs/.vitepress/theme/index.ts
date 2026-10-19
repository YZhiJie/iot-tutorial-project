import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import VersionBadge from "./VersionBadge.vue";
import "./custom.css";

/**
 * 在默认主题基础上做最小扩展：
 * 1. 引入品牌定制样式（custom.css）；
 * 2. 顶栏右侧注入版本徽标（版本切换入口）。
 */
export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "nav-bar-content-after": () => h(VersionBadge),
    });
  },
} satisfies Theme;
