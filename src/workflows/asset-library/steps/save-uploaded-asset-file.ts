import { createHash, randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { MedusaError } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { UpsertAssetInput } from "./upsert-asset";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const hasS3AssetStorage = () =>
  Boolean(
    process.env.S3_FILE_URL &&
      process.env.S3_REGION &&
      process.env.S3_BUCKET &&
      (process.env.S3_AUTHENTICATION_METHOD === "s3-iam-role" ||
        (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY))
  );

const mimeExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export type UploadAssetInput = Omit<UpsertAssetInput, "url"> & {
  filename: string;
  mime_type: string;
  content_base64: string;
  public_base_url: string;
};

const sanitizeFilenamePart = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

const getS3Client = () => {
  const authenticationMethod =
    process.env.S3_AUTHENTICATION_METHOD || "access-key";

  return new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials:
      authenticationMethod === "s3-iam-role"
        ? undefined
        : {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            sessionToken: process.env.S3_SESSION_TOKEN,
          },
  });
};

const getS3Acl = (): ObjectCannedACL | undefined => {
  if (process.env.S3_ACL === "false") {
    return undefined;
  }

  return (process.env.S3_ACL as ObjectCannedACL | undefined) || "public-read";
};

const buildS3Key = (storedFilename: string) =>
  `${process.env.S3_PREFIX || ""}${storedFilename}`;

const buildS3Url = (key: string) =>
  `${process.env.S3_FILE_URL!.replace(/\/$/, "")}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

export const saveUploadedAssetFileStep = createStep(
  "save-uploaded-asset-file",
  async (input: UploadAssetInput) => {
    const extension = mimeExtensions[input.mime_type];

    if (!extension) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Formato no soportado. Usa JPG, PNG, WEBP, GIF o SVG."
      );
    }

    const buffer = Buffer.from(input.content_base64, "base64");

    if (!buffer.length || buffer.byteLength > MAX_UPLOAD_BYTES) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "La imagen debe pesar menos de 20 MB."
      );
    }

    const name =
      sanitizeFilenamePart(input.filename) ||
      sanitizeFilenamePart(input.label) ||
      "asset";
    const digest = createHash("sha1").update(buffer).digest("hex").slice(0, 10);
    const storedFilename = `${name}-${digest}-${randomUUID().slice(0, 8)}.${extension}`;
    const tags = [input.tags, `sha1:${digest}`].filter(Boolean).join(", ");

    if (hasS3AssetStorage()) {
      const key = buildS3Key(storedFilename);

      await getS3Client().send(
        new PutObjectCommand({
          ACL: getS3Acl(),
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: input.mime_type,
          CacheControl: "public, max-age=31536000, immutable",
          Metadata: {
            "original-filename": encodeURIComponent(input.filename),
            "client-profile-id": input.client_profile_id,
          },
        })
      );

      return new StepResponse<
        UpsertAssetInput,
        { storage: "s3"; key: string }
      >(
        {
          id: input.id,
          label: input.label,
          filename: storedFilename,
          mime_type: input.mime_type,
          content_base64: null,
          alt: input.alt || null,
          type: input.type,
          client_profile_id: input.client_profile_id,
          tags: tags || null,
          sort_order: input.sort_order || 0,
          url: buildS3Url(key),
        },
        {
          storage: "s3",
          key,
        }
      );
    }

    return new StepResponse<
      UpsertAssetInput,
      { storage: "database" }
    >(
      {
        id: input.id,
        label: input.label,
        filename: storedFilename,
        mime_type: input.mime_type,
        content_base64: input.content_base64,
        alt: input.alt || null,
        type: input.type,
        client_profile_id: input.client_profile_id,
        tags: tags || null,
        sort_order: input.sort_order || 0,
        url: `/asset-files/${storedFilename}`,
      },
      {
        storage: "database",
      }
    );
  },
  async (
    rollbackData:
      | { storage: "s3"; key: string }
      | { storage: "database" }
  ) => {
    if (rollbackData.storage === "database") {
      return;
    }

    if (rollbackData.storage === "s3") {
      await getS3Client()
        .send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: rollbackData.key,
          })
        )
        .catch(() => {});
      return;
    }
  }
);
