import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  checkLoginRate,
  recordLoginFailure,
  resetLoginRate,
  getClientIp,
  buildLoginKey,
} from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // Phiên tự hết hạn sau 30 ngày — đăng nhập lại mỗi tháng (tránh phải đăng nhập lại mỗi sáng)
    maxAge: 30 * 24 * 60 * 60,
    // Gia hạn phiên mỗi 1 giờ nếu user vẫn hoạt động (slide 30 ngày kể từ lần hoạt động gần nhất)
    updateAge: 60 * 60,
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] Missing credentials');
          return null;
        }
        const email = credentials.email.trim().toLowerCase();
        console.log('[AUTH] Login attempt:', email);
        
        const key = buildLoginKey(getClientIp(req as Request), email);
        const check = checkLoginRate(key);
        if (!check.allowed) {
          console.log('[AUTH] Account locked:', email);
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          console.log('[AUTH] User not found:', email);
          recordLoginFailure(key);
          return null;
        }
        if (!user.active) {
          console.log('[AUTH] User inactive:', email);
          recordLoginFailure(key);
          return null;
        }
        if (!user.passwordHash) {
          console.log('[AUTH] No password hash:', email);
          recordLoginFailure(key);
          return null;
        }
        console.log('[AUTH] User found, verifying password...');
        const passwordValid = verifyPassword(credentials.password, user.passwordHash);
        if (!passwordValid) {
          console.log('[AUTH] Password invalid:', email);
          console.log('[AUTH] Stored hash:', user.passwordHash.substring(0, 20) + '...');
          recordLoginFailure(key);
          return null;
        }
        console.log('[AUTH] Login successful:', email);
        resetLoginRate(key);
        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          image: null,
          role: user.role,
          permissions: user.permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Lúc đăng nhập: ghi role/permissions vào token
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
      } else if (token?.sub) {
        // ❗ QUAN TRỌNG: làm mới role/permissions từ DB MỖI LẦN gọi.
        // Trước đây token giữ giá trị cũ từ lúc đăng nhập → admin đổi quyền
        // (bật/tắt phân quyền) mà user vẫn thấy menu + truy cập được cho tới khi
        // đăng xuất. Giờ thay đổi phân quyền có hiệu lực NGAY LẬP TỨC.
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: Number(token.sub) },
            select: { role: true, permissions: true, active: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.permissions = dbUser.permissions;
            // User bị vô hiệu hoá (active=false) → thu hồi toàn bộ quyền cho chắc chắn
            if (dbUser.active === false) token.permissions = "[]";
          }
        } catch {}
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
};

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  permissions: string;
};

/** Lấy user đang đăng nhập từ server (dùng trong server component / route handler) */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as SessionUser | undefined) ?? null;
}