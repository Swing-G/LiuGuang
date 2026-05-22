// @ts-nocheck
/* eslint-disable */

import { create } from "zustand";
import { toast } from "sonner";

import type { User } from "@/types";
import { adminLogin as adminLoginRequest, getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from "@/services/authService";
import { setAuthToken } from "@/services/api";
import { useChatStore } from "@/stores/chatStore";
import { storage } from "@/utils/storage";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  adminLogin: (password: string) => Promise<void>;
  register: (username: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

function resetChatState(isCreatingNew: boolean) {
  useChatStore.getState().cancelGeneration();
  useChatStore.setState({
    sessions: [],
    currentSessionId: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    isCreatingNew,
    deepThinkingEnabled: false,
    thinkingStartAt: null,
    streamTaskId: null,
    streamAbort: null,
    streamingMessageId: null,
    cancelRequested: false
  });
}

function toAuthUser(data: User, fallbackUsername?: string) {
  return {
    userId: data.userId,
    username: data.username || fallbackUsername,
    role: data.role,
    token: data.token,
    avatar: data.avatar
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: storage.getUser(),
  token: storage.getToken(),
  isAuthenticated: Boolean(storage.getToken()),
  isLoading: false,
  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const data = await loginRequest(username, password);
      const user = toAuthUser(data, username);
      storage.setToken(user.token);
      storage.setUser(user);
      setAuthToken(user.token);
      set({ user, token: user.token, isAuthenticated: true });
      get().fetchCurrentUser().catch(() => null);
      resetChatState(true);
      toast.success("登录成功");
    } catch (error) {
      toast.error((error as Error).message || "登录失败");
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  adminLogin: async (password) => {
    set({ isLoading: true });
    try {
      const data = await adminLoginRequest(password);
      const user = toAuthUser(data, "admin");
      storage.setToken(user.token);
      storage.setUser(user);
      setAuthToken(user.token);
      set({ user, token: user.token, isAuthenticated: true });
      get().fetchCurrentUser().catch(() => null);
      resetChatState(false);
      toast.success("管理员登录成功");
    } catch (error) {
      toast.error((error as Error).message || "管理员登录失败");
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  register: async (username, password, confirmPassword) => {
    set({ isLoading: true });
    try {
      const data = await registerRequest(username, password, confirmPassword);
      const user = toAuthUser(data, username);
      storage.setToken(user.token);
      storage.setUser(user);
      setAuthToken(user.token);
      set({ user, token: user.token, isAuthenticated: true });
      get().fetchCurrentUser().catch(() => null);
      resetChatState(true);
      toast.success("注册成功");
    } catch (error) {
      toast.error((error as Error).message || "注册失败");
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignore network errors on logout
    }
    resetChatState(false);
    storage.clearAuth();
    setAuthToken(null);
    set({ user: null, token: null, isAuthenticated: false });
    toast.success("已退出登录");
  },
  checkAuth: async () => {
    const token = storage.getToken();
    const user = storage.getUser();
    setAuthToken(token);
    set({ token, user, isAuthenticated: Boolean(token) });
    if (token) {
      await get().fetchCurrentUser();
    }
  },
  fetchCurrentUser: async () => {
    const token = get().token || storage.getToken();
    if (!token) return;
    try {
      const data = await getCurrentUser();
      const nextUser = { ...data, token };
      storage.setUser(nextUser);
      set({ user: nextUser, token, isAuthenticated: true });
    } catch {
      return;
    }
  }
}));
