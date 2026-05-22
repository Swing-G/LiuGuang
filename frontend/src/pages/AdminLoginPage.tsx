import * as React from "react";
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin, isLoading } = useAuthStore();
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const nextPassword = password.trim();

    if (!nextPassword) {
      setError("请输入管理员统一登录密码。");
      return;
    }

    try {
      await adminLogin(nextPassword);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError((err as Error).message || "管理员登录失败，请检查密码。");
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center overflow-hidden bg-[#111419] px-5 py-10 text-[#F2EFE8]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(211,104,71,0.22),transparent_30%),radial-gradient(circle_at_78%_10%,rgba(118,142,126,0.18),transparent_26%),linear-gradient(135deg,#111419_0%,#181A21_52%,#211B1A_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(242,239,232,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(242,239,232,0.08)_1px,transparent_1px)] [background-size:54px_54px]"
      />

      <section className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.8fr]">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 border border-[#F2EFE8]/12 bg-[#F2EFE8]/7 px-3 py-2 text-xs font-semibold tracking-[0.2em] text-[#D8CFC1]">
            <span className="h-2 w-2 bg-[#D36847]" />
            ADMIN CONTROL ENTRY
          </div>
          <h1 className="mt-7 max-w-[560px] text-balance text-[clamp(3.6rem,7.5vw,7rem)] font-semibold leading-[0.88] tracking-[-0.078em] text-[#F2EFE8]">
            后台入口
          </h1>
          <p className="mt-7 max-w-[62ch] text-lg leading-8 text-[#B8AEA2]">
            请通过专用路由使用统一管理员密码进入后台，普通用户登录与注册请去用户登录界面。
          </p>
        </div>

        <div className="mx-auto w-full max-w-[430px] border border-[#F2EFE8]/12 bg-[#F2EFE8]/7 p-2 shadow-[0_34px_90px_rgba(0,0,0,0.32)]">
          <div className="border border-[#F2EFE8]/10 bg-[#181A21]/94 p-6 shadow-[inset_0_1px_0_rgba(242,239,232,0.1)] sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-5">
              <div>
                <p className="text-3xl font-semibold tracking-[-0.05em] text-[#F2EFE8]">管理员登录</p>
                <p className="mt-2 text-sm leading-6 text-[#B8AEA2]">仅输入统一管理员密码。</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#D36847] text-[#161419] shadow-[0_16px_36px_rgba(211,104,71,0.24)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-[0.14em] text-[#D8CFC1]">统一密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8F867D]" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入管理员密码"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 rounded-none border-[#F2EFE8]/14 bg-[#111419] pl-10 pr-10 text-[#F2EFE8] shadow-none placeholder:text-[#7F776F] focus-visible:ring-[#D36847]"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F867D] transition hover:text-[#F2EFE8]"
                    aria-label="显示或隐藏管理员密码"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? <p className="bg-[#35201C] px-3 py-2 text-sm text-[#F0B39F]">{error}</p> : null}

              <Button
                type="submit"
                className="h-12 w-full rounded-none bg-[#D36847] text-[#161419] shadow-[0_18px_38px_rgba(211,104,71,0.2)] transition hover:bg-[#E07A56] active:scale-[0.99]"
                disabled={isLoading}
              >
                <span>{isLoading ? "正在验证..." : "进入后台"}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
