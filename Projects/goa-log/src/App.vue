<template>
  <EditorPage  v-if="isEditor" />
  <PreviewPage v-else-if="isPreview" />
  <LogFeed     v-else />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import LogFeed from './components/LogFeed.vue'
import PreviewPage from './components/PreviewPage.vue'
import EditorPage from './components/EditorPage.vue'

const isPreview = ref(window.location.hash === '#preview')
const isEditor  = ref(window.location.hash === '#editor')

const onHashChange = () => {
  const hash = window.location.hash
  isPreview.value = hash === '#preview'
  isEditor.value  = hash === '#editor'
}

onMounted(() => window.addEventListener('hashchange', onHashChange))
onUnmounted(() => window.removeEventListener('hashchange', onHashChange))
</script>

<style>
/* Global styles are in style.css */
</style>
