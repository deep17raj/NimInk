import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('./pages/SplashPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/home',
    component: () => import('./pages/HomePage.vue'),
  },
  {
    path: '/article/:id',
    component: () => import('./pages/ArticlePage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/write',
    component: () => import('./pages/WritePage.vue'),
  },
  {
    path: '/write/:id',
    component: () => import('./pages/WritePage.vue'),
  },
  {
    path: '/requests',
    component: () => import('./pages/RequestsPage.vue'),
  },
  {
    path: '/requests/:id',
    component: () => import('./pages/RequestDetailPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/requests/new',
    component: () => import('./pages/CreateRequestPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/earnings',
    component: () => import('./pages/EarningsPage.vue'),
  },
  {
    path: '/stake',
    component: () => import('./pages/StakePage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/profile',
    component: () => import('./pages/ProfilePage.vue'),
  },
  {
    path: '/profile/:userId',
    component: () => import('./pages/AuthorPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/dev',
    component: () => import('./pages/DevPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/admin',
    component: () => import('./pages/AdminPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/privacy',
    component: () => import('./pages/PrivacyPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/guidelines',
    component: () => import('./pages/GuidelinesPage.vue'),
    meta: { hideNav: true },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
