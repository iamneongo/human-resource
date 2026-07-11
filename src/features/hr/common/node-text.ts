import { isValidElement, type ReactNode } from 'react';

/**
 * Trích chuỗi văn bản từ một ReactNode (đệ quy vào children) để phục vụ
 * tìm kiếm & sắp xếp trên bảng, dù ô hiển thị là chữ hay component (Badge...).
 */
export function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join(' ');
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return nodeToText(props?.children);
  }
  return '';
}
