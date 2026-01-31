<template>
  <div class="search-container">
    <div class="search-input-wrapper">
      <input
        ref="inputRef"
        v-model="searchText"
        type="text"
        placeholder="search..."
        class="search-input"
        @focus="showDropdown = true"
        @blur="handleBlur"
        @keydown.enter="handleEnter"
        @keydown.escape="showDropdown = false"
      />
    </div>

    <!-- Selected tags -->
    <div v-if="selectedTags.length > 0" class="selected-tags">
      <span
        v-for="tag in selectedTags"
        :key="tag"
        class="selected-tag"
        @click="removeTag(tag)"
      >
        {{ tag }} ×
      </span>
    </div>

    <!-- Autocomplete dropdown -->
    <div v-if="showDropdown && filteredTags.length > 0" class="dropdown">
      <div
        v-for="tag in filteredTags"
        :key="tag"
        class="dropdown-item"
        @mousedown.prevent="selectTag(tag)"
      >
        {{ tag }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  allTags: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['filter'])

const inputRef = ref(null)
const searchText = ref('')
const selectedTags = ref([])
const showDropdown = ref(false)

// Get unique tags that aren't already selected, filtered by search text
const filteredTags = computed(() => {
  const search = searchText.value.toLowerCase()
  return props.allTags
    .filter(tag => !selectedTags.value.includes(tag))
    .filter(tag => tag.toLowerCase().includes(search))
    .slice(0, 10) // Limit dropdown items
})

const selectTag = (tag) => {
  if (!selectedTags.value.includes(tag)) {
    selectedTags.value.push(tag)
  }
  searchText.value = ''
  showDropdown.value = false
}

const removeTag = (tag) => {
  selectedTags.value = selectedTags.value.filter(t => t !== tag)
}

const handleEnter = () => {
  // If there's a matching tag in dropdown, select it
  if (filteredTags.value.length > 0) {
    selectTag(filteredTags.value[0])
  }
}

const handleBlur = () => {
  // Delay to allow click on dropdown items
  setTimeout(() => {
    showDropdown.value = false
  }, 150)
}

// Emit filter whenever search text or selected tags change
watch([searchText, selectedTags], () => {
  emit('filter', {
    text: searchText.value,
    tags: selectedTags.value
  })
}, { deep: true })
</script>

<style scoped>
.search-container {
  position: relative;
  margin-bottom: calc(var(--spacing-unit) * 3);
}

.search-input-wrapper {
  position: relative;
}

.search-input {
  width: 100%;
  padding: calc(var(--spacing-unit) * 1.5);
  font-family: var(--font-mono);
  font-size: 14px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
}

.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--text);
}

.search-input::placeholder {
  color: var(--text);
  opacity: 0.5;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--spacing-unit));
  margin-top: calc(var(--spacing-unit));
}

.selected-tag {
  padding: 2px 8px;
  border: 1px solid var(--border);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.selected-tag:hover {
  background: rgba(0, 0, 0, 0.06);
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  border: 1px solid var(--border);
  border-top: none;
  background: var(--bg);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-item {
  padding: calc(var(--spacing-unit) * 1.5);
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.dropdown-item:hover {
  background: rgba(0, 0, 0, 0.06);
}
</style>
