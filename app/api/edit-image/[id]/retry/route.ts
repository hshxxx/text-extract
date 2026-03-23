import { createSupabaseServerClient } from "@/lib/supabase/server";
import { processImageEditingTask, retryEditJob } from "@/lib/services/imageEditing";
import { jsonError, jsonOk } from "@/utils/http";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const result = await retryEditJob(supabase, user.id, id);
    queueMicrotask(() => {
      void processImageEditingTask(supabase, user.id, result.task_id).catch((error) => {
        console.error("edit-image retry background processing failed", error);
      });
    });
    return jsonOk(result, { status: 202 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "重试图片编辑任务失败。", 500);
  }
}
