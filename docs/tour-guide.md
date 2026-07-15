# Tour Guide

App dùng `driver.js` cho tour hướng dẫn. Mình chọn thư viện này vì nó chạy ổn với `Next.js 16` và `React 19`, nhẹ, không kéo thêm lớp state phức tạp vào dashboard.

## Cách mở tour

- Mở một màn trong dashboard.
- Nhìn góc phải header và bấm nút dấu hỏi.
- Chọn tour bạn muốn chạy.

Menu này luôn có tour `Làm quen giao diện`. Khi bạn đứng ở một màn đã khai báo riêng, menu sẽ hiện thêm tour của màn đó.

## Các tour đang có

- `Làm quen giao diện`
- `Hồ sơ nhân viên`
- `Hợp đồng lao động`
- `Bảng chấm công thủ công`
- `Nghỉ phép`
- `Kỳ lương`
- `Phiếu lương cho HR`
- `Định biên và tracking ngày`
- `Phiếu lương của tôi`

## Cách thêm tour mới

Bạn làm theo đúng 3 bước này.

1. Gắn mốc vào UI bằng `data-tour`.

Ví dụ:

```tsx
<div data-tour='employees-summary'>
  ...
</div>
```

2. Khai báo tour trong [registry.ts](C:/CongViec/nhansu/src/features/tours/registry.ts:1).

Ví dụ:

```ts
{
  id: 'employees',
  label: 'Hồ sơ nhân viên',
  description: 'Giới thiệu danh sách nhân sự, bộ lọc và chỉ báo hồ sơ số hóa.',
  pathMatch: byPrefix('/dashboard/hr/employees'),
  steps: [
    {
      element: '[data-tour="employees-summary"]',
      popover: {
        title: 'Tóm tắt nhanh',
        description: 'Bạn nhìn nhanh được quy mô danh sách và các case cần xử lý.'
      }
    }
  ]
}
```

3. Build lại để kiểm tra selector có còn đúng không.

```bash
bun run build
```

## Quy ước nên giữ

- Mỗi step bám vào một `data-tour` ổn định. Đừng bám vào text hiển thị hoặc class ngẫu nhiên.
- Một tour nên có 3 đến 5 step. Nhiều hơn thì người xem dễ mệt.
- Mỗi câu nên ngắn, nói đúng việc người dùng làm ở chỗ đó.
- Khi UI có scroll ngang hoặc dialog, gắn mốc ở vùng bao ngoài thay vì bám vào ô nhỏ.
- Nếu màn có quyền hạn, chỉ tour những phần người có quyền đó thực sự bấm được.

## File chính của tính năng tour

- Provider và runtime: [tour-provider.tsx](C:/CongViec/nhansu/src/features/tours/tour-provider.tsx:1)
- Danh sách tour: [registry.ts](C:/CongViec/nhansu/src/features/tours/registry.ts:1)
- Nút mở tour: [tour-launcher.tsx](C:/CongViec/nhansu/src/features/tours/tour-launcher.tsx:1)
- Style popup: [globals.css](C:/CongViec/nhansu/src/styles/globals.css:1)

## Khi tour không chạy đúng

- Kiểm tra selector trong `steps.element`.
- Kiểm tra màn hiện tại có đúng `pathMatch` không.
- Kiểm tra phần tử có đang bị ẩn theo role hoặc breakpoint không.
- Chạy lại `bun run build` để bắt lỗi import hoặc type.
