import NProgress from 'nprogress';
import { PLATFORM } from '@/constants';
import axios from './axios';

NProgress.configure({ showSpinner: false });

export async function request(config: any) {
  console.log('[request]', config);
  if (PLATFORM === 'browser') {
    return await axios(config);
  } else if (PLATFORM === 'electron') {
    const { pm } = await import(`./postMessage.electron`);
    const method = config.method ?? 'get';
    return pm.send(`${method}@${config.url}`, config.params || config.data);
  } else {
    const { pm } = await import(`./postMessage`);
    const method = config.method ?? 'get';
    !NProgress.isStarted() && NProgress.start();
    const res = await pm.send(`${method}@${config.url}`, config.params || config.data, window.acquireVsCodeApi());
    NProgress.done();
    return res;
  }
}
