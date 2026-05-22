import { Brain, Loader2 } from "lucide-react";

interface ThinkingIndicatorProps {
  content?: string;
  duration?: number;
}

export function ThinkingIndicator({ content, duration }: ThinkingIndicatorProps) {
  return (
    <div className="overflow-hidden rounded-[1.15rem] border border-[#F1D8BD] bg-[#FFF5E8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
      <div className="flex items-center gap-2 border-b border-[#F1D8BD]/70 bg-[#FFF0D6]/70 px-4 py-3 text-[#8B4B2E]">
        <Loader2 className="h-4 w-4 animate-spin text-[#B4533A]" />
        <span className="text-sm font-medium">正在深度思考...</span>
        {duration ? (
          <span className="rounded-full bg-[#21182B] px-2 py-0.5 text-xs text-[#FFF8EF]">
            {duration}秒
          </span>
        ) : null}
      </div>
      <div className="flex items-start gap-2 px-4 py-3 text-sm text-[#5C4A66]">
        <Brain className="mt-0.5 h-4 w-4 shrink-0 text-[#B4533A]" />
        <p className="whitespace-pre-wrap leading-relaxed">
          {content || ""}
          <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-[#F4A261] align-middle" />
        </p>
      </div>
    </div>
  );
}
