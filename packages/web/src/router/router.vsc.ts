import NProgress from 'nprogress';
import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/home/index.vue')
    },
    {
      path: '/player',
      component: () => import('@/pages/player/index.vue')
    },
    {
      path: '/rules',
      component: () => import('@/pages/rules/index.vue')
    },
    {
      path: '/rule-info',
      component: () => import('@/pages/rule-info/index.vue')
    },
    {
      path: '/iframe',
      component: () => import('@/pages/iframe/index.vue')
    },
    {
      path: '/search',
      component: () => import('@/pages/search/index.vue'),
      meta: {
        keepAlive: true
      }
    },
    {
      path: '/vsc/search',
      component: () => import('@/pages/search/index.vsc.vue'),
      meta: {
        keepAlive: true
      }
    },
    {
      path: '/vsc/rules',
      component: () => import('@/pages/rules/index.vsc.vue')
    },
    {
      path: '/discover',
      component: () => import('@/pages/discover/index.vue')
    },
    {
      path: '/content',
      name: 'content',
      component: () => import('@/pages/content/index.vue')
    },
    {
      path: '/chapter',
      component: () => import('@/pages/chapter/index.vue'),
      meta: {
        keepAlive: true
      }
    }
  ]
});

router.afterEach(() => {
  NProgress.done();
});

export default router;