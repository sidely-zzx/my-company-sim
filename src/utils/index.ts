
export function money(value: number): string {
  return `￥${value.toLocaleString('zh-CN')}`
}