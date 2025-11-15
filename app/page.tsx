"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useVideoComposer } from "@/lib/useVideoComposer";
import type { Scene, YoutubeUploadPayload } from "@/lib/types";

const gradientOptions: Array<{ name: string; value: [string, string] }> = [
  { name: "Sky Surge", value: ["#2563eb", "#9333ea"] },
  { name: "Sunset Glow", value: ["#f97316", "#f43f5e"] },
  { name: "Aurora Mist", value: ["#22d3ee", "#6366f1"] },
  { name: "Forest Haze", value: ["#0ea5e9", "#22c55e"] },
  { name: "Neon Bloom", value: ["#facc15", "#ec4899"] },
  { name: "Deep Space", value: ["#0f172a", "#312e81"] }
];

const defaultTopic = "Automating YouTube Videos with AI Assistants";

const minDuration = 4;
const maxDuration = 20;

const defaultDescription = (topic: string) =>
  `Explore how to build an automated pipeline for YouTube videos around "${topic}". This guide shows how to script, assemble, and ship production-ready content without manual editing.`;

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const createScene = (
  title: string,
  narration: string,
  emphasis?: string,
  gradient: [string, string] = gradientOptions[Math.floor(Math.random() * gradientOptions.length)].value
): Scene => ({
  id: makeId(),
  title,
  narration,
  duration: 6,
  gradient,
  emphasis
});

const buildScenesFromTopic = (topic: string): Scene[] => {
  const focus = topic.trim() || defaultTopic;
  return [
    createScene(
      "Hook",
      `Why spend days editing when ${focus} lets you storyboard, narrate, and publish while you sleep?`,
      "Promise: by the end you'll have a reusable autopilot."
    ),
    createScene(
      "System Overview",
      `We break down the automated studio into three loops: ideation, production, and publishing. Each loop is orchestrated by workflows that watch for new ideas then generate finished episodes.`,
      "Visualize the pipeline as an assembly line from prompt to publish."
    ),
    createScene(
      "Asset Generation",
      `Scripts, narration, and visuals are produced through composable agents. We chunk the narrative, batch-render slides, and synthesize voice overs so that the heavy lifting is done without editors.`,
      "Tip: reuse templates per content pillar to stay on brand."
    ),
    createScene(
      "Video Assembly",
      `Slides and audio are merged with FFmpeg on-demand, yielding high quality MP4 files ready for upload. Effects like zooms or overlays can be added through programmable filters.`,
      "Result: deterministic renders with predictable timing."
    ),
    createScene(
      "Deployment",
      `Finally the pipeline pushes metadata, thumbnails, and the compiled video to YouTube through their API. Schedule, tag, and publish in a single request while analytics feeds future iterations.`,
      "Close with a call-to-action that matches your funnel."
    ),
    createScene(
      "Call To Action",
      `Start automating your ${focus.toLowerCase()} today and reinvest saved hours into strategy and community.`,
      "Subscribe for more build logs and automation recipes."
    )
  ];
};

type YoutubeFormState = YoutubeUploadPayload & { status?: string };

const initialYoutubeForm = (topic: string): YoutubeFormState => ({
  title: topic,
  description: defaultDescription(topic),
  tags: ["automation", "youtube", "ai workflow"],
  privacyStatus: "private",
  clientId: "",
  clientSecret: "",
  refreshToken: "",
  status: ""
});

const numberFormatter = new Intl.NumberFormat();

function formatProgress(ratio: number) {
  const value = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  return `${value}%`;
}

function isYoutubeFormValid(form: YoutubeFormState, hasVideo: boolean) {
  return (
    hasVideo &&
    !!form.clientId &&
    !!form.clientSecret &&
    !!form.refreshToken &&
    !!form.title &&
    !!form.description
  );
}

async function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const result = reader.result as string;
      const payload = result.split(",")[1];
      if (!payload) {
        reject(new Error("Failed to encode video payload."));
        return;
      }
      resolve(payload);
    };
    reader.readAsDataURL(blob);
  });
}

export default function Page() {
  const [topic, setTopic] = useState(defaultTopic);
  const [scenes, setScenes] = useState<Scene[]>(() => buildScenesFromTopic(defaultTopic));
  const [backgroundAudio, setBackgroundAudio] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [youtubeForm, setYoutubeForm] = useState<YoutubeFormState>(() => initialYoutubeForm(defaultTopic));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; url?: string } | null>(
    null
  );

  const { generate, load, isReady, isRunning, progress } = useVideoComposer();

  useEffect(() => {
    load().catch(() => {
      // already handled by hook logging
    });
  }, [load]);

  const totalRuntime = useMemo(
    () => scenes.reduce((sum, scene) => sum + Math.max(scene.duration, minDuration), 0),
    [scenes]
  );

  const regenerateScenes = useCallback(() => {
    const nextScenes = buildScenesFromTopic(topic);
    setScenes(nextScenes);
    setYoutubeForm(initialYoutubeForm(topic));
  }, [topic]);

  const updateScene = useCallback(
    (id: string, updates: Partial<Scene>) => {
      setScenes((prev) => prev.map((scene) => (scene.id === id ? { ...scene, ...updates } : scene)));
    },
    [setScenes]
  );

  const handleAddScene = () => {
    setScenes((prev) => [
      ...prev,
      createScene(
        "New Scene",
        "Refine this narration to keep the narrative tight and insightful.",
        "Adjust duration and visuals to fit the rhythm."
      )
    ]);
  };

  const handleDuplicateScene = (scene: Scene) => {
    setScenes((prev) => [
      ...prev,
      {
        ...scene,
        id: makeId(),
        title: `${scene.title} (extended)`
      }
    ]);
  };

  const handleRemoveScene = (id: string) => {
    setScenes((prev) => prev.filter((scene) => scene.id !== id));
  };

  const handleAudioUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files ?? []);
    if (file) {
      setBackgroundAudio(file);
    }
  };

  const beginGeneration = async () => {
    setVideoUrl(null);
    setVideoBlob(null);

    const composition = {
      scenes,
      width: 1280,
      height: 720,
      fps: 30,
      backgroundAudio
    };

    try {
      const result = await generate(composition);
      setVideoUrl(result.url);
      setVideoBlob(result.blob);
    } catch (error) {
      console.error(error);
      alert("Video rendering failed. Check console for details.");
    }
  };

  const handleYoutubeChange = (key: keyof YoutubeFormState, value: string) => {
    setYoutubeForm((prev) => {
      if (key === "tags") {
        return { ...prev, tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) };
      }

      if (key === "privacyStatus" && (value === "public" || value === "private" || value === "unlisted")) {
        return { ...prev, privacyStatus: value };
      }

      return { ...prev, [key]: value };
    });
  };

  const submitYoutubeUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!videoBlob) {
      alert("Generate a video first.");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const payload = {
        ...youtubeForm,
        videoBase64: await blobToBase64(videoBlob)
      };

      const response = await fetch("/api/youtube/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to upload video.");
      }

      const videoUrl = body.videoUrl as string | undefined;
      setUploadResult({
        success: true,
        message: "Video uploaded successfully.",
        url: videoUrl
      });
    } catch (error) {
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : "YouTube upload failed."
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12 lg:px-10">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl shadow-slate-950/60 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">Automated YouTube Studio</h1>
            <p className="mt-2 max-w-2xl text-base text-slate-300">
              Generate scripts, render slide-based videos with FFmpeg, and publish straight to YouTube in one
              streamlined workflow.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Realtime Studio Ready</span>
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,3fr] lg:items-center">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-200">Video Topic</span>
            <input
              className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={regenerateScenes}
            className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-200"
          >
            Auto-compose Script
          </button>
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-[3fr,2fr]">
        <div className="flex flex-col gap-5">
          {scenes.map((scene, index) => (
            <article key={scene.id} className="gradient-border rounded-3xl bg-slate-900/50 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-100">
                  Scene {index + 1} <span className="text-xs text-slate-400">({scene.duration}s)</span>
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateScene(scene)}
                    className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300 hover:border-sky-500 hover:text-sky-200"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveScene(scene.id)}
                    className="rounded-lg border border-transparent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-300 hover:border-red-500 hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Headline</span>
                  <input
                    className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={scene.title}
                    onChange={(event) => updateScene(scene.id, { title: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Narration</span>
                  <textarea
                    className="min-h-[120px] rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={scene.narration}
                    onChange={(event) => updateScene(scene.id, { narration: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Emphasis</span>
                  <input
                    className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={scene.emphasis ?? ""}
                    onChange={(event) => updateScene(scene.id, { emphasis: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Duration (seconds)
                  </span>
                  <input
                    type="range"
                    min={minDuration}
                    max={maxDuration}
                    value={scene.duration}
                    onChange={(event) => updateScene(scene.id, { duration: Number(event.target.value) })}
                    className="accent-sky-400"
                  />
                  <span className="text-xs text-slate-400">{scene.duration} seconds</span>
                </label>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gradient</span>
                  <div className="flex flex-wrap gap-2">
                    {gradientOptions.map((option) => (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => updateScene(scene.id, { gradient: option.value })}
                        style={{
                          background: `linear-gradient(135deg, ${option.value[0]}, ${option.value[1]})`
                        }}
                        className={clsx(
                          "h-10 flex-1 min-w-[120px] rounded-xl border border-transparent text-xs font-semibold text-slate-100 transition hover:scale-[1.02]",
                          scene.gradient[0] === option.value[0] && scene.gradient[1] === option.value[1]
                            ? "ring-2 ring-sky-400"
                            : "border-slate-700/60"
                        )}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
          <button
            type="button"
            onClick={handleAddScene}
            className="rounded-3xl border border-dashed border-slate-700 px-4 py-6 text-sm font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-200"
          >
            + Add Scene
          </button>
        </div>

        <div className="flex h-full flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">Render Pipeline</h3>
            <ul className="text-sm text-slate-300">
              <li>Total runtime: {numberFormatter.format(totalRuntime)} seconds</li>
              <li>Resolution: 1280 × 720</li>
              <li>Scenes: {scenes.length}</li>
              <li>FFmpeg Status: {isReady ? "Ready" : "Loading..."}</li>
            </ul>
            <label className="mt-3 flex flex-col gap-2 text-sm text-slate-400">
              Background Audio (optional)
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-slate-200"
              />
            </label>
            <button
              type="button"
              onClick={beginGeneration}
              disabled={isRunning || !isReady}
              className={clsx(
                "mt-4 rounded-2xl border border-sky-500 bg-sky-500/20 px-4 py-3 text-sm font-semibold text-sky-200 transition",
                (isRunning || !isReady) && "cursor-not-allowed opacity-60"
              )}
            >
              {isRunning ? "Rendering..." : "Render Video"}
            </button>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: formatProgress(progress) }}
              />
            </div>
            <span className="text-right text-xs text-slate-500">{formatProgress(progress)}</span>
            {videoUrl && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <span className="font-semibold">Video ready</span>
                <video controls src={videoUrl} className="w-full rounded-xl border border-emerald-500/40 shadow-lg" />
                <a
                  href={videoUrl}
                  download="automated-youtube-video.mp4"
                  className="rounded-xl border border-emerald-400 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/15"
                >
                  Download MP4
                </a>
              </div>
            )}
          </div>

          <form
            className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl"
            onSubmit={submitYoutubeUpload}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-100">Publish to YouTube</h3>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                OAuth Required
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Provide a YouTube API OAuth client and refresh token with `youtube.upload` scope (see Google Cloud
              console). Your credentials stay in your browser.
            </p>
            <div className="grid gap-3">
              <label className="flex flex-col gap-2 text-sm">
                Title
                <input
                  className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={youtubeForm.title}
                  onChange={(event) => handleYoutubeChange("title", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Description
                <textarea
                  className="min-h-[100px] rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={youtubeForm.description}
                  onChange={(event) => handleYoutubeChange("description", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Tags (comma separated)
                <input
                  className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={youtubeForm.tags.join(", ")}
                  onChange={(event) => handleYoutubeChange("tags", event.target.value)}
                />
              </label>
              <div className="grid gap-2 text-sm lg:grid-cols-3">
                <label className="flex flex-col gap-2">
                  Privacy
                  <select
                    className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={youtubeForm.privacyStatus}
                    onChange={(event) => handleYoutubeChange("privacyStatus", event.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  Client ID
                  <input
                    className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={youtubeForm.clientId}
                    onChange={(event) => handleYoutubeChange("clientId", event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  Client Secret
                  <input
                    className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={youtubeForm.clientSecret}
                    onChange={(event) => handleYoutubeChange("clientSecret", event.target.value)}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                Refresh Token
                <input
                  className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={youtubeForm.refreshToken}
                  onChange={(event) => handleYoutubeChange("refreshToken", event.target.value)}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!isYoutubeFormValid(youtubeForm, !!videoBlob) || isUploading}
              className={clsx(
                "mt-2 rounded-2xl border border-red-500 bg-red-500/20 px-4 py-3 text-sm font-semibold text-red-200 transition",
                (!isYoutubeFormValid(youtubeForm, !!videoBlob) || isUploading) && "cursor-not-allowed opacity-60"
              )}
            >
              {isUploading ? "Uploading…" : "Upload to YouTube"}
            </button>
            {uploadResult && (
              <div
                className={clsx(
                  "rounded-2xl border px-4 py-3 text-sm",
                  uploadResult.success
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                    : "border-red-500/50 bg-red-500/10 text-red-100"
                )}
              >
                <p>{uploadResult.message}</p>
                {uploadResult.url && (
                  <a
                    href={uploadResult.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block rounded-lg border border-emerald-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200"
                  >
                    View on YouTube
                  </a>
                )}
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
