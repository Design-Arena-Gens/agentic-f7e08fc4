import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type UploadRequest = {
  videoBase64: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: "public" | "unlisted" | "private";
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

const MAX_UPLOAD_SIZE_MB = 256;

function parseBody(data: unknown): UploadRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid payload.");
  }
  const {
    videoBase64,
    title,
    description,
    tags = [],
    privacyStatus = "private",
    clientId,
    clientSecret,
    refreshToken
  } = data as UploadRequest;

  if (!videoBase64) throw new Error("Missing video payload.");
  if (!title) throw new Error("Missing title.");
  if (!description) throw new Error("Missing description.");
  if (!clientId || !clientSecret || !refreshToken) throw new Error("OAuth credentials are required.");

  return {
    videoBase64,
    title,
    description,
    tags,
    privacyStatus,
    clientId,
    clientSecret,
    refreshToken
  };
}

function decodeVideo(base64: string) {
  const buffer = Buffer.from(base64, "base64");
  const sizeMb = buffer.byteLength / (1024 * 1024);
  if (sizeMb > MAX_UPLOAD_SIZE_MB) {
    throw new Error(`Video too large. Limit is ${MAX_UPLOAD_SIZE_MB}MB.`);
  }
  return buffer;
}

export async function POST(request: NextRequest) {
  try {
    const payload = parseBody(await request.json());
    const videoBuffer = decodeVideo(payload.videoBase64);

    const oauth = new google.auth.OAuth2(payload.clientId, payload.clientSecret);
    oauth.setCredentials({
      refresh_token: payload.refreshToken
    });

    const youtube = google.youtube({ version: "v3", auth: oauth });

    const uploadResponse = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: payload.title,
          description: payload.description,
          tags: payload.tags?.slice(0, 500)
        },
        status: {
          privacyStatus: payload.privacyStatus ?? "private"
        }
      },
      media: {
        body: Readable.from(videoBuffer)
      }
    });

    const videoId = uploadResponse.data.id;
    const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined;

    return NextResponse.json({
      videoId,
      videoUrl
    });
  } catch (error) {
    console.error("YouTube upload failed", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
