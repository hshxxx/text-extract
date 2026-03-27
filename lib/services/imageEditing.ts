import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { decryptSecret } from "@/utils/encryption";
import {
  type CreateEditTaskRequest,
  type CreateEditTaskResponse,
  type EditErrorCode,
  type EditHistoryDetail,
  type EditHistoryItem,
  type EditJobRecord,
  type EditJobStatus,
  type EditSide,
  type EditStyleKey,
  type EditTaskDetailResponse,
  type EditTaskRecord,
  type EditTaskStatus,
  type EditableImageListItem,
  type ImageGenerationResultRecord,
  type ImageGenerationTaskRecord,
  type ImageModelConfigRecord,
  type RetryEditJobResponse,
} from "@/lib/types/domain";
import { splitCombinedCoinImage } from "@/lib/image-editing/split";
import { trimWhiteBorder } from "@/lib/image-editing/trim";
import { padTrimmedSourceToSafeMargins, validateTrimmedSource } from "@/lib/image-editing/validate";
import { getRandomEditStyle } from "@/lib/image-editing/styles";
import { generateEditedCoinImage } from "@/lib/services/image-edit-adapter/openai";
import { EDIT_TASK_STORAGE_PREFIX, IMAGE_STORAGE_BUCKET } from "@/utils/constants";

type LoadedEditSource = {
  result: ImageGenerationResultRecord;
  imageTask: ImageGenerationTaskRecord;
};

type LatestJobs = {
  front: EditJobRecord | null;
  back: EditJobRecord | null;
};

type SideOutcome = {
  job: EditJobRecord;
  finalImageUrl: string | null;
  errorCode: EditErrorCode | null;
  errorMessage: string | null;
};

function getEditErrorMessage(code: EditErrorCode) {
  switch (code) {
    case "SPLIT_FAILED":
      return "无法从原始双币图中切分正反面。";
    case "TRIM_EMPTY":
      return "切分后的图片未检测到有效主体。";
    case "BOUNDING_BOX_TOO_SMALL":
      return "检测到的主体过小，不适合继续编辑。";
    case "OBJECT_TOO_CLOSE_TO_EDGE":
      return "主体距离边缘过近，不适合继续编辑。";
    case "SOURCE_NOT_FOUND":
      return "来源图片不存在或无法访问。";
    case "PHOTOROOM_REQUEST_FAILED":
      return "图片编辑请求失败。";
    case "PHOTOROOM_TIMEOUT":
      return "图片编辑请求超时。";
    case "PHOTOROOM_INVALID_RESPONSE":
      return "图片编辑接口返回了无效图片数据。";
    case "UPLOAD_FAILED":
      return "文件上传失败。";
    case "DB_WRITE_FAILED":
      return "数据库写入失败。";
    default:
      return "图片编辑失败。";
  }
}

function normalizeEditError(error: unknown): { code: EditErrorCode; message: string } {
  if (error && typeof error === "object") {
    const typedError = error as Error & { code?: string; detail?: string };
    const code = (typedError.code ?? typedError.message) as EditErrorCode;
    const detail = typedError.detail;

    if (
      code === "SPLIT_FAILED" ||
      code === "TRIM_EMPTY" ||
      code === "BOUNDING_BOX_TOO_SMALL" ||
      code === "OBJECT_TOO_CLOSE_TO_EDGE" ||
      code === "SOURCE_NOT_FOUND" ||
      code === "PHOTOROOM_REQUEST_FAILED" ||
      code === "PHOTOROOM_TIMEOUT" ||
      code === "PHOTOROOM_INVALID_RESPONSE" ||
      code === "UPLOAD_FAILED" ||
      code === "DB_WRITE_FAILED"
    ) {
      return {
        code,
        message: detail ? `${getEditErrorMessage(code)} ${detail}` : getEditErrorMessage(code),
      };
    }

    return {
      code: "DB_WRITE_FAILED",
      message: typedError.message || getEditErrorMessage("DB_WRITE_FAILED"),
    };
  }

  return { code: "DB_WRITE_FAILED", message: getEditErrorMessage("DB_WRITE_FAILED") };
}

function getLatestJobs(jobs: EditJobRecord[]): LatestJobs {
  const sorted = [...jobs].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    front: sorted.find((job) => job.side === "front") ?? null,
    back: sorted.find((job) => job.side === "back") ?? null,
  };
}

function resolveTaskStatus(latestJobs: LatestJobs): EditTaskStatus {
  const statuses = [latestJobs.front?.status, latestJobs.back?.status].filter(Boolean) as EditJobStatus[];

  if (statuses.length === 0) {
    return "failed";
  }

  if (statuses.every((status) => status === "success")) {
    return "completed";
  }

  if (statuses.some((status) => status === "success")) {
    return "partial_success";
  }

  if (statuses.some((status) => status === "processing")) {
    return "editing_back";
  }

  return "failed";
}

function buildTaskResponse(task: EditTaskRecord, latestJobs: LatestJobs): EditTaskDetailResponse {
  const errorJob = latestJobs.front?.status === "failed" ? latestJobs.front : latestJobs.back?.status === "failed" ? latestJobs.back : null;

  return {
    task_id: task.id,
    task_status: task.status,
    front_job_id: latestJobs.front?.id ?? null,
    back_job_id: latestJobs.back?.id ?? null,
    front_status: latestJobs.front?.status ?? null,
    back_status: latestJobs.back?.status ?? null,
    front_image: latestJobs.front?.image_url ?? null,
    back_image: latestJobs.back?.image_url ?? null,
    error_code: errorJob?.error_code ?? null,
    error_message: errorJob?.error_message ?? null,
  };
}

function buildCreateResponse(task: EditTaskRecord, latestJobs: LatestJobs): CreateEditTaskResponse {
  const detail = buildTaskResponse(task, latestJobs);

  return {
    task_id: detail.task_id,
    status: detail.task_status,
    front_job_id: detail.front_job_id,
    back_job_id: detail.back_job_id,
    front_status: detail.front_status,
    back_status: detail.back_status,
    front_image: detail.front_image,
    back_image: detail.back_image,
    error_code: detail.error_code ?? null,
    error_message: detail.error_message ?? null,
  };
}

async function loadEditSource(
  supabase: SupabaseClient,
  userId: string,
  sourceImageId: string,
): Promise<LoadedEditSource> {
  const { data: result, error: resultError } = await supabase
    .from("image_generation_results")
    .select("*")
    .eq("id", sourceImageId)
    .single();

  if (resultError || !result) {
    throw new Error("SOURCE_NOT_FOUND");
  }

  const { data: imageTask, error: taskError } = await supabase
    .from("image_generation_tasks")
    .select("*")
    .eq("id", result.task_id)
    .eq("user_id", userId)
    .single();

  if (taskError || !imageTask) {
    throw new Error("SOURCE_NOT_FOUND");
  }

  return {
    result: result as ImageGenerationResultRecord,
    imageTask: imageTask as ImageGenerationTaskRecord,
  };
}

async function loadEditModelConfig(
  supabase: SupabaseClient,
  userId: string,
  imageTask: ImageGenerationTaskRecord,
) {
  if (imageTask.image_model_config_id) {
    const { data: sourceModel } = await supabase
      .from("image_model_configs")
      .select("*")
      .eq("user_id", userId)
      .eq("id", imageTask.image_model_config_id)
      .maybeSingle();

    if (sourceModel) {
      return sourceModel as ImageModelConfigRecord;
    }
  }

  const { data: defaultModel } = await supabase
    .from("image_model_configs")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (defaultModel) {
    return defaultModel as ImageModelConfigRecord;
  }

  const { data: anyModel } = await supabase
    .from("image_model_configs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (anyModel) {
    return anyModel as ImageModelConfigRecord;
  }

  throw {
    code: "PHOTOROOM_REQUEST_FAILED",
    detail: "未找到可用的图片模型配置。",
  } satisfies { code: EditErrorCode; detail: string };
}

async function downloadSourceImage(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("SOURCE_NOT_FOUND");
  }

  return Buffer.from(await response.arrayBuffer());
}

async function uploadEditArtifact(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  filename: string,
  bytes: Buffer,
  contentType: string,
) {
  const path = `${userId}/${EDIT_TASK_STORAGE_PREFIX}/${taskId}/${filename}`;
  const { error } = await supabase.storage.from(IMAGE_STORAGE_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error("UPLOAD_FAILED");
  }

  const { data } = supabase.storage.from(IMAGE_STORAGE_BUCKET).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
  };
}

async function updateTaskStatus(supabase: SupabaseClient, taskId: string, status: EditTaskStatus) {
  const { data, error } = await supabase
    .from("edit_tasks")
    .update({ status })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("DB_WRITE_FAILED");
  }

  return data as EditTaskRecord;
}

async function createEditTaskWithJobs(
  supabase: SupabaseClient,
  userId: string,
  sourceImageId: string,
) {
  const { data: task, error: taskError } = await supabase
    .from("edit_tasks")
    .insert({
      user_id: userId,
      source_image_id: sourceImageId,
      status: "splitting",
    })
    .select("*")
    .single();

  if (taskError || !task) {
    throw new Error("DB_WRITE_FAILED");
  }

  const styles = {
    front: getRandomEditStyle(),
    back: getRandomEditStyle(),
  } satisfies Record<EditSide, EditStyleKey>;

  const { data: jobs, error: jobError } = await supabase
    .from("edit_jobs")
    .insert([
      { task_id: task.id, side: "front", style: styles.front, status: "processing" },
      { task_id: task.id, side: "back", style: styles.back, status: "processing" },
    ])
    .select("*");

  if (jobError || !jobs) {
    throw new Error("DB_WRITE_FAILED");
  }

  const latestJobs = getLatestJobs(jobs as EditJobRecord[]);

  return {
    task: task as EditTaskRecord,
    latestJobs,
  };
}

async function createRetryJob(
  supabase: SupabaseClient,
  taskId: string,
  side: EditSide,
  style: EditStyleKey,
) {
  const { data, error } = await supabase
    .from("edit_jobs")
    .insert({
      task_id: taskId,
      side,
      style,
      status: "processing",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("DB_WRITE_FAILED");
  }

  return data as EditJobRecord;
}

async function updateJobFailure(
  supabase: SupabaseClient,
  jobId: string,
  code: EditErrorCode,
  message = getEditErrorMessage(code),
) {
  const { data, error } = await supabase
    .from("edit_jobs")
    .update({
      status: "failed",
      error_code: code,
      error_message: message,
    })
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("DB_WRITE_FAILED");
  }

  return data as EditJobRecord;
}

async function updateJobSource(
  supabase: SupabaseClient,
  jobId: string,
  sourceStoragePath: string,
) {
  const { data, error } = await supabase
    .from("edit_jobs")
    .update({
      source_storage_path: sourceStoragePath,
      error_code: null,
      error_message: null,
    })
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("DB_WRITE_FAILED");
  }

  return data as EditJobRecord;
}

async function updateJobSuccess(
  supabase: SupabaseClient,
  jobId: string,
  imageUrl: string,
  providerRawStoragePath: string | null,
) {
  const { data, error } = await supabase
    .from("edit_jobs")
    .update({
      status: "success",
      image_url: imageUrl,
      provider_raw_storage_path: providerRawStoragePath,
      error_code: null,
      error_message: null,
    })
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("DB_WRITE_FAILED");
  }

  return data as EditJobRecord;
}

async function listJobsForTask(supabase: SupabaseClient, taskId: string) {
  const { data, error } = await supabase
    .from("edit_jobs")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("DB_WRITE_FAILED");
  }

  return (data ?? []) as EditJobRecord[];
}

async function processSide(args: {
  supabase: SupabaseClient;
  userId: string;
  taskId: string;
  job: EditJobRecord;
  halfBuffer: Buffer;
}) {
  try {
    const trimmed = await trimWhiteBorder(args.halfBuffer);
    const padded = await padTrimmedSourceToSafeMargins(trimmed);
    const validationError = validateTrimmedSource(padded);

    if (validationError) {
      throw new Error(validationError);
    }

    const sourceUpload = await uploadEditArtifact(
      args.supabase,
      args.userId,
      args.taskId,
      `${args.job.side}_source.png`,
      padded.buffer,
      "image/png",
    );

    const updatedJob = await updateJobSource(args.supabase, args.job.id, sourceUpload.path);

    return {
      job: updatedJob,
      sourceBuffer: padded.buffer,
    };
  } catch (error) {
    const normalized = normalizeEditError(error);
    const failedJob = await updateJobFailure(args.supabase, args.job.id, normalized.code, normalized.message);

    return {
      job: failedJob,
      sourceBuffer: null,
    };
  }
}

async function finalizeSide(args: {
  supabase: SupabaseClient;
  userId: string;
  taskId: string;
  job: EditJobRecord;
  sourceBuffer: Buffer;
  modelConfig: ImageModelConfigRecord;
}): Promise<SideOutcome> {
  try {
    const providerImage = await generateEditedCoinImage({
      image: args.sourceBuffer,
      side: args.job.side,
      style: args.job.style,
      modelConfig: {
        model: args.modelConfig.model,
        base_url: args.modelConfig.base_url,
        apiKey: decryptSecret(args.modelConfig.api_key_encrypted),
      },
    });
    const providerRaw = await uploadEditArtifact(
      args.supabase,
      args.userId,
      args.taskId,
      `${args.job.side}_provider_raw.${providerImage.contentType.includes("jpeg") ? "jpg" : "png"}`,
      providerImage.bytes,
      providerImage.contentType,
    );
    const finalPng = await sharp(providerImage.bytes, { failOn: "none" }).png().toBuffer();
    const finalUpload = await uploadEditArtifact(
      args.supabase,
      args.userId,
      args.taskId,
      `${args.job.side}_final.png`,
      finalPng,
      "image/png",
    );
    const successJob = await updateJobSuccess(
      args.supabase,
      args.job.id,
      finalUpload.publicUrl,
      providerRaw.path,
    );

    return {
      job: successJob,
      finalImageUrl: finalUpload.publicUrl,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    const normalized = normalizeEditError(error);
    const failedJob = await updateJobFailure(args.supabase, args.job.id, normalized.code, normalized.message);

    return {
      job: failedJob,
      finalImageUrl: null,
      errorCode: normalized.code,
      errorMessage: normalized.message,
    };
  }
}

async function buildTaskDetailFromTask(
  supabase: SupabaseClient,
  task: EditTaskRecord,
): Promise<EditTaskDetailResponse> {
  const jobs = await listJobsForTask(supabase, task.id);
  const latestJobs = getLatestJobs(jobs);
  return buildTaskResponse(task, latestJobs);
}

async function loadEditTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const { data: task, error } = await supabase
    .from("edit_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (error || !task) {
    throw new Error("SOURCE_NOT_FOUND");
  }

  return task as EditTaskRecord;
}

export async function listEditableImagesForEditing(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 50;
  const { data: imageTasks, error: taskError } = await supabase
    .from("image_generation_tasks")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (taskError) {
    throw taskError;
  }

  const taskList = (imageTasks ?? []) as Array<Pick<ImageGenerationTaskRecord, "id" | "created_at">>;

  if (taskList.length === 0) {
    return [] as EditableImageListItem[];
  }

  const { data: results, error: resultError } = await supabase
    .from("image_generation_results")
    .select("id, task_id, image_url, created_at")
    .in(
      "task_id",
      taskList.map((task) => task.id),
    );

  if (resultError) {
    throw resultError;
  }

  const resultList = (results ?? []) as ImageGenerationResultRecord[];

  if (resultList.length === 0) {
    return [] as EditableImageListItem[];
  }

  const { data: editTasks, error: editTaskError } = await supabase
    .from("edit_tasks")
    .select("id, source_image_id, status, created_at")
    .in(
      "source_image_id",
      resultList.map((result) => result.id),
    )
    .order("created_at", { ascending: false });

  if (editTaskError) {
    throw editTaskError;
  }

  const latestEditBySource = new Map<string, EditTaskRecord>();
  const editedSourceIds = new Set<string>();

  ((editTasks ?? []) as EditTaskRecord[]).forEach((task) => {
    if (!latestEditBySource.has(task.source_image_id)) {
      latestEditBySource.set(task.source_image_id, task);
    }

    if (task.status === "completed" || task.status === "partial_success") {
      editedSourceIds.add(task.source_image_id);
    }
  });

  return resultList
    .map((result) => {
      const latestEdit = latestEditBySource.get(result.id) ?? null;
      const imageTask = taskList.find((task) => task.id === result.task_id);

      return {
        id: result.id,
        taskId: result.task_id,
        imageUrl: result.image_url,
        createdAt: result.created_at ?? imageTask?.created_at ?? new Date().toISOString(),
        edited: editedSourceIds.has(result.id),
        latestEditTaskId: latestEdit?.id ?? null,
        latestEditStatus: latestEdit?.status ?? null,
      } satisfies EditableImageListItem;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function runImageEditing(
  supabase: SupabaseClient,
  userId: string,
  input: CreateEditTaskRequest,
): Promise<CreateEditTaskResponse> {
  const { result } = await loadEditSource(supabase, userId, input.source_image_id);
  const { task, latestJobs } = await createEditTaskWithJobs(supabase, userId, result.id);

  return buildCreateResponse(task, latestJobs);
}

export async function processImageEditingTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<EditTaskDetailResponse> {
  const task = await loadEditTask(supabase, userId, taskId);
  const { result, imageTask } = await loadEditSource(supabase, userId, task.source_image_id);
  const editModel = await loadEditModelConfig(supabase, userId, imageTask);
  const latestJobs = getLatestJobs(await listJobsForTask(supabase, task.id));

  try {
    const originalBytes = await downloadSourceImage(result.image_url);
    const originalPng = await sharp(originalBytes, { failOn: "none" }).png().toBuffer();
    await uploadEditArtifact(supabase, userId, task.id, "original.png", originalPng, "image/png");

    const split = await splitCombinedCoinImage(originalPng);
    await updateTaskStatus(supabase, task.id, "trimming");

    const hasPendingJobs =
      latestJobs.front?.status === "processing" || latestJobs.back?.status === "processing";

    if (!hasPendingJobs) {
      return buildTaskDetailFromTask(supabase, task);
    }

    const preparedSides = (
      await Promise.all(
        [
          latestJobs.front?.status === "processing"
            ? processSide({
                supabase,
                userId,
                taskId: task.id,
                job: latestJobs.front,
                halfBuffer: split.frontBuffer,
              })
            : Promise.resolve(null),
          latestJobs.back?.status === "processing"
            ? processSide({
                supabase,
                userId,
                taskId: task.id,
                job: latestJobs.back,
                halfBuffer: split.backBuffer,
              })
            : Promise.resolve(null),
        ],
      )
    )
      .filter((prepared): prepared is NonNullable<typeof prepared> => Boolean(prepared))
      .filter((prepared) => Boolean(prepared.sourceBuffer))
      .map((prepared) => ({
        job: prepared.job,
        sourceBuffer: prepared.sourceBuffer as Buffer,
      }));

    if (preparedSides.length === 0) {
      const failedTask = await updateTaskStatus(supabase, task.id, "failed");
      const latest = getLatestJobs(await listJobsForTask(supabase, failedTask.id));
      return buildTaskResponse(failedTask, latest);
    }

    await updateTaskStatus(supabase, task.id, "validating");

    await Promise.all(
      preparedSides.map((prepared) =>
        finalizeSide({
          supabase,
          userId,
          taskId: task.id,
          job: prepared.job,
          sourceBuffer: prepared.sourceBuffer,
          modelConfig: editModel,
        }),
      ),
    );

    await updateTaskStatus(supabase, task.id, "uploading");
    const allJobs = await listJobsForTask(supabase, task.id);
    const finalLatestJobs = getLatestJobs(allJobs);
    const finalStatus = resolveTaskStatus(finalLatestJobs);
    const finalTask = await updateTaskStatus(supabase, task.id, finalStatus);

    return buildTaskResponse(finalTask, finalLatestJobs);
  } catch (error) {
    const normalized = normalizeEditError(error);

    const jobs = await listJobsForTask(supabase, task.id).catch(() => []);

    await Promise.all(
      jobs
        .filter((job) => job.status === "processing")
        .map((job) => updateJobFailure(supabase, job.id, normalized.code, normalized.message).catch(() => undefined)),
    );

    const failedTask = await updateTaskStatus(supabase, task.id, "failed");
    const latest = getLatestJobs(await listJobsForTask(supabase, failedTask.id));
    return buildTaskResponse(failedTask, latest);
  }
}

export async function retryEditJob(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
): Promise<RetryEditJobResponse> {
  const { data: job, error: jobError } = await supabase
    .from("edit_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    throw new Error("SOURCE_NOT_FOUND");
  }

  const existingJob = job as EditJobRecord;
  const { data: task, error: taskError } = await supabase
    .from("edit_tasks")
    .select("*")
    .eq("id", existingJob.task_id)
    .eq("user_id", userId)
    .single();

  if (taskError || !task) {
    throw new Error("SOURCE_NOT_FOUND");
  }

  const editTask = task as EditTaskRecord;
  const retryJob = await createRetryJob(supabase, editTask.id, existingJob.side, existingJob.style);
  const updatedTask = await updateTaskStatus(
    supabase,
    editTask.id,
    existingJob.side === "front" ? "editing_front" : "editing_back",
  );
  const latestJobs = getLatestJobs(await listJobsForTask(supabase, editTask.id));
  const response = buildTaskResponse(updatedTask, latestJobs);

  return {
    task_id: response.task_id,
    new_job_id: retryJob.id,
    status: response.task_status,
    front_job_id: response.front_job_id,
    back_job_id: response.back_job_id,
    front_status: response.front_status,
    back_status: response.back_status,
    front_image: response.front_image,
    back_image: response.back_image,
    error_code: response.error_code ?? null,
    error_message: response.error_message ?? null,
  };
}

export async function getEditTaskDetail(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const { data: task, error } = await supabase
    .from("edit_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (error || !task) {
    throw new Error("SOURCE_NOT_FOUND");
  }

  return buildTaskDetailFromTask(supabase, task as EditTaskRecord);
}

export async function listEditHistory(supabase: SupabaseClient, userId: string) {
  const { data: tasks, error: taskError } = await supabase
    .from("edit_tasks")
    .select("id, source_image_id, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (taskError) {
    throw taskError;
  }

  const taskList = (tasks ?? []) as EditTaskRecord[];

  if (taskList.length === 0) {
    return [] as EditHistoryItem[];
  }

  const { data: jobs, error: jobError } = await supabase
    .from("edit_jobs")
    .select("task_id, side, status, image_url, created_at")
    .in(
      "task_id",
      taskList.map((task) => task.id),
    )
    .order("created_at", { ascending: false });

  if (jobError) {
    throw jobError;
  }

  const jobsByTask = new Map<string, EditJobRecord[]>();

  ((jobs ?? []) as EditJobRecord[]).forEach((job) => {
    const list = jobsByTask.get(job.task_id) ?? [];
    list.push(job);
    jobsByTask.set(job.task_id, list);
  });

  return taskList.map((task) => {
    const latestJobs = getLatestJobs(jobsByTask.get(task.id) ?? []);

    return {
      taskId: task.id,
      sourceImageId: task.source_image_id,
      createdAt: task.created_at,
      status: task.status,
      frontStatus: latestJobs.front?.status ?? null,
      backStatus: latestJobs.back?.status ?? null,
      frontImage: latestJobs.front?.image_url ?? null,
      backImage: latestJobs.back?.image_url ?? null,
    } satisfies EditHistoryItem;
  });
}

export async function listEditHistoryBySource(
  supabase: SupabaseClient,
  userId: string,
  sourceImageId: string,
) {
  const { data: tasks, error: taskError } = await supabase
    .from("edit_tasks")
    .select("id, source_image_id, status, created_at")
    .eq("user_id", userId)
    .eq("source_image_id", sourceImageId)
    .in("status", ["completed", "partial_success"])
    .order("created_at", { ascending: false });

  if (taskError) {
    throw taskError;
  }

  const taskList = (tasks ?? []) as EditTaskRecord[];

  if (taskList.length === 0) {
    return [] as EditHistoryItem[];
  }

  const { data: jobs, error: jobError } = await supabase
    .from("edit_jobs")
    .select("task_id, side, status, image_url, created_at")
    .in(
      "task_id",
      taskList.map((task) => task.id),
    )
    .order("created_at", { ascending: false });

  if (jobError) {
    throw jobError;
  }

  const jobsByTask = new Map<string, EditJobRecord[]>();

  ((jobs ?? []) as EditJobRecord[]).forEach((job) => {
    const list = jobsByTask.get(job.task_id) ?? [];
    list.push(job);
    jobsByTask.set(job.task_id, list);
  });

  return taskList.map((task) => {
    const latestJobs = getLatestJobs(jobsByTask.get(task.id) ?? []);

    return {
      taskId: task.id,
      sourceImageId: task.source_image_id,
      createdAt: task.created_at,
      status: task.status,
      frontStatus: latestJobs.front?.status ?? null,
      backStatus: latestJobs.back?.status ?? null,
      frontImage: latestJobs.front?.image_url ?? null,
      backImage: latestJobs.back?.image_url ?? null,
    } satisfies EditHistoryItem;
  });
}

export async function getEditHistoryItem(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const { data: task, error: taskError } = await supabase
    .from("edit_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (taskError || !task) {
    throw new Error("SOURCE_NOT_FOUND");
  }

  const editTask = task as EditTaskRecord;
  const jobs = await listJobsForTask(supabase, editTask.id);
  const latestJobs = getLatestJobs(jobs);
  const { data: sourceImage } = await supabase
    .from("image_generation_results")
    .select("id, image_url")
    .eq("id", editTask.source_image_id)
    .maybeSingle();

  return {
    task: editTask,
    sourceImageId: editTask.source_image_id,
    sourceImageUrl: (sourceImage as { id: string; image_url: string } | null)?.image_url ?? null,
    frontJob: latestJobs.front,
    backJob: latestJobs.back,
  } satisfies EditHistoryDetail;
}
