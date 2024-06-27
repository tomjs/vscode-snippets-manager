import { createApp } from 'vue';
import App from './App.vue';
import { registerComponents } from './components';

const app = createApp(App);

registerComponents(app);

app.mount('#app');
