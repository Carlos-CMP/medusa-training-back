import { QUOTE_MODULE } from "./src/modules/quote";
import { APPROVAL_MODULE } from "./src/modules/approval";
import { COMPANY_MODULE } from "./src/modules/company";
import { HOMEPAGE_MODULE } from "./src/modules/homepage";
import { PRODUCT_PACKAGING_MODULE } from "./src/modules/product-packaging";
import { BRAND_PROFILE_MODULE } from "./src/modules/brand-profile";
import { ASSET_LIBRARY_MODULE } from "./src/modules/asset-library";
import { CATALOG_RULES_MODULE } from "./src/modules/catalog-rules";
import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const backendUrl = (
  process.env.MEDUSA_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");

const hasS3FileProvider = Boolean(
  process.env.S3_FILE_URL &&
    process.env.S3_REGION &&
    process.env.S3_BUCKET &&
    (process.env.S3_AUTHENTICATION_METHOD === "s3-iam-role" ||
      (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY))
);

const s3Acl =
  process.env.S3_ACL === "false" ? false : process.env.S3_ACL || undefined;

const fileProvider = hasS3FileProvider
  ? {
      resolve: "@medusajs/file-s3",
      id: "s3",
      options: {
        file_url: process.env.S3_FILE_URL,
        access_key_id: process.env.S3_ACCESS_KEY_ID,
        secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
        session_token: process.env.S3_SESSION_TOKEN,
        authentication_method:
          process.env.S3_AUTHENTICATION_METHOD || "access-key",
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET,
        endpoint: process.env.S3_ENDPOINT,
        prefix: process.env.S3_PREFIX || "",
        acl: s3Acl,
        additional_client_config:
          process.env.S3_FORCE_PATH_STYLE === "true"
            ? { forcePathStyle: true }
            : undefined,
      },
    }
  : {
      resolve: "@medusajs/file-local",
      id: "local",
      options: {
        upload_dir: process.env.FILE_UPLOAD_DIR || "static",
        backend_url: process.env.FILE_PUBLIC_URL || `${backendUrl}/static`,
      },
    };

const notificationProvider =
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_FROM
    ? {
        resolve: "./src/modules/smtp-notification",
        id: "smtp",
        options: {
          channels: ["email"],
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE !== "false",
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
          from: process.env.SMTP_FROM,
        },
      }
    : process.env.RESEND_API_KEY && process.env.RESEND_FROM
    ? {
        resolve: "./src/modules/resend-notification",
        id: "resend",
        options: {
          channels: ["email"],
          api_key: process.env.RESEND_API_KEY,
          from: process.env.RESEND_FROM,
        },
      }
    : {
        resolve: "@medusajs/notification-local",
        id: "local",
        options: {
          channels: ["email"],
        },
      };

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: {
    [COMPANY_MODULE]: {
      resolve: "./modules/company",
    },
    [QUOTE_MODULE]: {
      resolve: "./modules/quote",
    },
    [APPROVAL_MODULE]: {
      resolve: "./modules/approval",
    },
    [HOMEPAGE_MODULE]: {
      resolve: "./modules/homepage",
    },
    [PRODUCT_PACKAGING_MODULE]: {
      resolve: "./modules/product-packaging",
    },
    [BRAND_PROFILE_MODULE]: {
      resolve: "./modules/brand-profile",
    },
    [ASSET_LIBRARY_MODULE]: {
      resolve: "./modules/asset-library",
    },
    [CATALOG_RULES_MODULE]: {
      resolve: "./modules/catalog-rules",
    },
    [Modules.FILE]: {
      resolve: "@medusajs/file",
      options: {
        providers: [fileProvider],
      },
    },
    [Modules.NOTIFICATION]: {
      resolve: "@medusajs/notification",
      options: {
        providers: [notificationProvider],
      },
    },
    [Modules.CACHE]: {
      resolve: "@medusajs/medusa/cache-inmemory",
    },
    [Modules.WORKFLOW_ENGINE]: {
      resolve: "@medusajs/medusa/workflow-engine-inmemory",
    },
  },
});
