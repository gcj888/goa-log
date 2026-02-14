<template>
  <PreviewPage v-if="isPreview" />
  <LogFeed v-else />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import LogFeed from './components/LogFeed.vue'
import PreviewPage from './components/PreviewPage.vue'

const isPreview = ref(window.location.hash === '#preview')

const onHashChange = () => {
  isPreview.value = window.location.hash === '#preview'
}

onMounted(() => window.addEventListener('hashchange', onHashChange))
onUnmounted(() => window.removeEventListener('hashchange', onHashChange))
</script>

<style>
/* Global styles are in style.css */
</style>
