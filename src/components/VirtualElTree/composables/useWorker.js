/**
 * Web Worker组合式API
 * 用于管理多线程计算，提升树组件性能
 */

import { ref, watch } from 'vue';

/**
 * Worker管理组合式API
 * @param {Object} options 配置参数
 * @returns {Object} Worker相关方法
 */
export function useWorker(options) {
  const {
    performanceMode,
    nodeHeight,
    height,
    flattenedData,
    scrollTop,
    totalTreeHeight,
    visibleNodes,
    searchResults,
    emit
  } = options;

  const workerRef = ref(null);
  const searchLoading = ref(false);

  /**
   * 初始化Web Worker
   */
  function initializeWorker() {
    // 如果不支持Worker或不在性能模式下，则跳过
    if (!window.Worker || !performanceMode) {
      return;
    }

    // 清理旧Worker
    if (workerRef.value) {
      workerRef.value.terminate();
    }

    try {
      // 创建Worker实例
      workerRef.value = new Worker('/workers/treeWorker.js');

      // 注册消息处理函数
      workerRef.value.onmessage = (e) => {
        const { type, ...data } = e.data;

        switch (type) {
          case 'initialized':
            totalTreeHeight.value = data.totalHeight;
            updateVisibleNodes(scrollTop.value);
            break;

          case 'visibleNodesUpdated':
            visibleNodes.value = data.visibleNodes;
            totalTreeHeight.value = data.totalHeight;
            emit('visible-nodes-change', data.visibleNodes.length);
            break;

          case 'nodeToggled':
            totalTreeHeight.value = data.totalHeight;
            updateVisibleNodes(scrollTop.value);
            emit('expand', data.nodeId, data.expanded);
            break;

          case 'searchComplete':
            searchLoading.value = false;
            updateVisibleNodes(scrollTop.value);
            
            // 更新搜索结果状态
            if (searchResults) {
              searchResults.value = {
                matches: data.matches || [],
                matchCount: data.matchCount || 0,
                searchTerm: data.searchTerm || '',
                lastSearchTime: Date.now(),
                timeTaken: data.timeTaken
              };
            }
            
            // 传递搜索结果细节
            emit('search', data.searchTerm, data.matchCount, data.matches);
            break;
        }
      };

      // 发送初始化数据给Worker
      workerRef.value.postMessage({
        type: 'initialize',
        flattenedData: flattenedData.value,
        nodeHeight: nodeHeight
      });
    } catch (err) {
      // Worker初始化失败，回退到主线程处理模式
      workerRef.value = null;
    }
  }

  /**
   * 更新可见节点
   * @param {Number} scrollPosition 滚动位置
   */
  function updateVisibleNodes(scrollPosition) {
    if (performanceMode && workerRef.value) {
      // 计算缓冲区大小，通常是可见区域的2倍
      const buffer = Math.ceil(height / nodeHeight) * 2;

      workerRef.value.postMessage({
        type: 'updateVisibleNodes',
        scrollTop: scrollPosition,
        viewportHeight: height,
        buffer
      });
    }
  }

  /**
   * 处理节点展开/折叠
   * @param {String} nodeId 节点ID
   * @param {Boolean} expanded 是否展开
   */
  function handleToggle(nodeId, expanded) {
    if (performanceMode && workerRef.value) {
      workerRef.value.postMessage({
        type: 'toggleNode',
        nodeId,
        expanded
      });
    }
  }

  /**
   * 处理搜索
   * @param {String} term 搜索关键词
   */
  function handleSearch(term) {
    searchLoading.value = true;

    if (performanceMode && workerRef.value) {
      workerRef.value.postMessage({
        type: 'search',
        searchTerm: term
      });
    }
  }

  /**
   * 销毁Worker
   */
  function destroyWorker() {
    if (workerRef.value) {
      workerRef.value.terminate();
      workerRef.value = null;
    }
  }

  // 监听数据变化，重新初始化Worker
  watch(() => flattenedData.value, () => {
    if (flattenedData.value.length && performanceMode) {
      initializeWorker();
    }
  });

  return {
    workerRef,
    searchLoading,
    initializeWorker,
    updateVisibleNodes,
    handleToggle,
    handleSearch,
    destroyWorker
  };
} 