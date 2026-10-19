<script setup lang="ts">
/** 站点版本徽标：展示当前教程版本并提供「版本切换」入口（跳转 GitHub Releases/Tags） */
const VERSION = "v1.0";
const RELEASES = "https://github.com/YZhiJie/iot-tutorial-project/releases";
</script>

<template>
  <a
    class="version-badge"
    :href="RELEASES"
    target="_blank"
    rel="noopener noreferrer"
    :title="`当前教程版本 ${VERSION}，点击查看全部版本与更新日志`"
  >
    <span class="version-badge__dot" />
    {{ VERSION }}
  </a>
</template>

<style scoped>
.version-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 12px;
  padding: 3px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  white-space: nowrap;
  transition:
    color 0.2s,
    border-color 0.2s;
}
.version-badge:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
.version-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
}
@media (max-width: 767px) {
  .version-badge {
    margin-right: 0;
  }
}
</style>
