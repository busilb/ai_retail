"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PushButton({ count, channel = "企微" }: { count: number; channel?: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="sm"
      variant="default"
      disabled={loading || count === 0}
      onClick={async () => {
        setLoading(true);
        await new Promise((r) => setTimeout(r, 800));
        setLoading(false);
        toast.success(`已推送 ${count} 条建议报名活动到${channel}管理群`, {
          description: `运营群 · 张总监已收到 · 等待审批后批量复制到各平台后台`,
        });
      }}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
      推送到{channel}（{count}）
    </Button>
  );
}
