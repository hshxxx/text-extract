import { createSupabaseServerClient } from "@/lib/supabase/server";
import { processImageEditingTask, runImageEditing } from "@/lib/services/imageEditing";
import type { CreateEditTaskRequest } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/utils/http";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const body = (await request.json()) as CreateEditTaskRequest;
    const result = await runImageEditing(supabase, user.id, body);
    queueMicrotask(() => {
      void processImageEditingTask(supabase, user.id, result.task_id).catch((error) => {
        console.error("edit-image background processing failed", error);
      });
    });
    return jsonOk(result, { status: 202 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "创建图片编辑任务失败。", 500);
  }
}
