function debounce<T extends (...args: any[]) => any>(func: T, delay: number, immediate = false) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // 改为普通函数：this 在调用时动态绑定（如 obj.method() 时指向 obj），且带类型注解
  const debounced = function (this: unknown, ...args: Parameters<T>) {
    const context = this;

    if (timeoutId) clearTimeout(timeoutId);
    if (immediate) {
      // 核心区别：只有当 timeoutId 为空时，才说明此时处于"冷却完成"状态
      const callNow = !timeoutId;
      // 设置一个定时器，仅仅是为了在 delay 之后把标识位清空
      // 这样下次触发时 callNow 才会再次为 true
      timeoutId = setTimeout(() => {
        timeoutId = undefined;
      }, delay);

      if (callNow) {
        func.apply(context, args);
      }
    } else {
      // 非立即执行模式：标准的末尾触发
      timeoutId = setTimeout(() => {
        func.apply(context, args);
        timeoutId = undefined;
      }, delay);
    }
  };

  // 添加取消方法
  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };
  return debounced;
}
export { debounce };
