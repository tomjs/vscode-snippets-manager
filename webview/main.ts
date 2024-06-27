import { createApp } from 'vue';
import App from './App.vue';
import { registerComponents } from './components';
import { registerI18n } from './core';

const app = createApp(App);

registerI18n(app);
registerComponents(app);

app.mount('#app');
