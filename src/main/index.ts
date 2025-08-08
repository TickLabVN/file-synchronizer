import bootstrap from "./bootstrap/app";

bootstrap().catch((err: Error): void => {
  console.error("[bootstrap] fatal:", err);
  process.exit(1);
});
