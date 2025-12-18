import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
const launchScreen = document.getElementById('app-launch-screen');

const hideLoading = () => {
  if (launchScreen) {
    launchScreen.style.opacity = '0';
    setTimeout(() => {
      launchScreen.style.visibility = 'hidden';
      launchScreen.remove();
    }, 500);
  }
};

const renderError = (error: any) => {
  console.error("Critical Launch Error:", error);
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2 style="color: #e11d48; font-weight: 800; font-size: 24px;">系统初始化失败</h2>
        <div style="background: #fff1f2; border: 1px solid #fecaca; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: monospace; font-size: 12px; color: #9f1239; overflow: auto;">
          ${error instanceof Error ? error.stack || error.message : String(error)}
        </div>
        <p style="color: #475569;">这通常是由于浏览器缓存了旧版本的依赖项。请尝试：</p>
        <ul style="color: #475569; font-size: 14px;">
          <li>按下 <b>Ctrl + F5</b> 强制刷新</li>
          <li>清理浏览器缓存后重试</li>
        </ul>
        <button onclick="location.reload()" style="margin-top: 20px; background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer;">
          立即重试
        </button>
      </div>
    `;
    hideLoading();
  }
};

// 全局未捕获异常监控
window.addEventListener('error', (event) => {
  renderError(event.error || event.message);
});

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
    
    // 渲染启动后 800ms 强制移除加载动画
    // 此时即使 App 内部有小错误，也不至于让用户卡在纯白/纯加载屏
    setTimeout(hideLoading, 800);
    
  } catch (err) {
    renderError(err);
  }
}