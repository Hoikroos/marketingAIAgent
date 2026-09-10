/**
 * Khai báo cho TypeScript hiểu import side-effect CSS (vd: `import "./globals.css"`).
 * Gói `next` chỉ khai báo `*.module.css`, thiếu `*.css` thường → gây TS2882
 * ở editor/tsc khi chưa có next-env.d.ts. Đây là ambient declaration, không ảnh hưởng runtime.
 */
declare module "*.css";
declare module "*.scss";
declare module "*.sass";